/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the runtime, which executes the program AST.
*/


import { builtinFunctions } from "./builtin_functions.js";
import { Token } from "./lexer-types.js";
import { ExpressionAST, ExpressionASTArrayAccessNode, ExpressionASTBranchNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, ExpressionASTNode, ProgramASTNode } from "./parser-types.js";
import { operators } from "./parser.js";
import { ArrayVariableType, BuiltinFunctionData, ClassMethodData, ClassMethodStatement, ClassVariableType, ConstantData, EnumeratedVariableType, File, FileMode, FunctionData, OpenedFile, OpenedFileOfType, PointerVariableType, PrimitiveVariableType, RecordVariableType, UnresolvedVariableType, VariableData, VariableScope, VariableType, VariableTypeMapping, VariableValue, typesEqual } from "./runtime-types.js";
import { ClassFunctionStatement, ClassProcedureStatement, ClassStatement, FunctionStatement, ProcedureStatement, Statement } from "./statements.js";
import { SoodocodeError, crash, errorBoundary, fail, f, impossible, forceType } from "./utils.js";

//TODO: fix coercion
//CONFIG: array initialization

export class Files {
	files: Record<string, File> = {};
	private backupFiles: string | null = null;
	getFile(filename:string, create:true):File;
	getFile(filename:string, create?:boolean):File | undefined;
	getFile(filename:string, create = false):File | undefined {
		return this.files[filename] ?? (create ? this.files[filename] = {
			name: filename, text: ""
		} : undefined);
	}
	makeBackup(){
		this.backupFiles = JSON.stringify(this.files);
	}
	canLoadBackup(){
		return this.backupFiles != null;
	}
	loadBackup(){
		if(this.backupFiles) this.files = JSON.parse(this.backupFiles) as Record<string, File>;
	}
}
export type ClassMethodCallInformation = [
	method: ClassMethodData,
	clazz: ClassVariableType,
	instance: VariableTypeMapping<ClassVariableType>,
];
export class Runtime {
	scopes: VariableScope[] = [];
	functions: Record<string, FunctionData> = {};
	openFiles: Record<string, OpenedFile | undefined> = {};
	fs = new Files();
	constructor(
		public _input: (message:string) => string,
		public _output: (message:string) => void,
	){}
	processArrayAccess(expr:ExpressionASTArrayAccessNode, operation:"get", type?:VariableType):[type:VariableType, value:VariableValue];
	processArrayAccess(expr:ExpressionASTArrayAccessNode, operation:"get", type:"variable"):VariableData;
	processArrayAccess(expr:ExpressionASTArrayAccessNode, operation:"set", value:ExpressionAST):void;
	processArrayAccess(expr:ExpressionASTArrayAccessNode, operation:"get", type?:VariableType | "variable"):[type:VariableType, value:VariableValue] | VariableData;
	@errorBoundary()
	processArrayAccess(expr:ExpressionASTArrayAccessNode, operation:"get" | "set", arg2?:VariableType | "variable" | ExpressionAST):[type:VariableType, value:VariableValue] | VariableData | void {

		//Make sure the variable exists and is an array
		const _variable = this.evaluateExpr(expr.target, "variable");
		if(!(_variable.type instanceof ArrayVariableType)) fail(f.quote`Cannot convert variable of type ${_variable.type} to an array`, expr.target);
		const variable = _variable as VariableData<ArrayVariableType, never>;
		const varTypeData = variable.type;

		//TODO is there any way of getting a 1D array out of a 2D array?
		//Forbids getting any arrays from arrays
		if(arg2 instanceof ArrayVariableType)
			fail(f.quote`Cannot evaluate expression starting with "array access": expected the expression to evaluate to a value of type ${arg2}, but the array access produces a result of type ${varTypeData.type}`, expr.target);

		if(expr.indices.length != variable.type.lengthInformation.length)
			fail(
`Cannot evaluate expression starting with "array access": \
${variable.type.lengthInformation.length}-dimensional array requires ${variable.type.lengthInformation.length} indices, \
but found ${expr.indices.length} indices`,
				expr.indices
			);
		const indexes:[ExpressionASTNode, number][] = expr.indices.map(e => [e, this.evaluateExpr(e, PrimitiveVariableType.INTEGER)[1]]);
		let invalidIndexIndex;
		if(
			(invalidIndexIndex = indexes.findIndex(([_expr, value], index) =>
				value > varTypeData.lengthInformation[index][1] ||
				value < varTypeData.lengthInformation[index][0])
			) != -1
		) fail(
`Array index out of bounds: \
value ${indexes[invalidIndexIndex][1]} was not in range \
(${varTypeData.lengthInformation[invalidIndexIndex].join(" to ")})`,
			indexes[invalidIndexIndex][0]);
		const index = indexes.reduce((acc, [_expr, value], index) =>
			(acc + value - varTypeData.lengthInformation[index][0]) * (index == indexes.length - 1 ? 1 : varTypeData.arraySizes[index]),
		0);
		if(index >= variable.value.length) crash(`Array index bounds check failed`);
		if(operation == "get"){
			const type = arg2 as VariableType | "variable";
			if(type == "variable"){
				//i see nothing wrong with this bodged variable data
				return {
					type: this.resolveVariableType(varTypeData.type),
					declaration: variable.declaration,
					mutable: true,
					get value(){ return variable.value[index]; },
					set value(val){ variable.value[index] = val; }
				};
			}
			const output = variable.value[index];
			if(output == null) fail(f.text`Cannot use the value of uninitialized variable ${expr.target}[${indexes.map(([_expr, val]) => val).join(", ")}]`, expr.target);
			if(type) return [type, this.coerceValue(output, this.resolveVariableType(varTypeData.type), type)];
			else return [this.resolveVariableType(varTypeData.type), output];
		} else {
			(variable.value as Array<VariableValue>)[index] = this.evaluateExpr(arg2 as ExpressionAST, this.resolveVariableType(varTypeData.type))[1];
		}
	}
	/* get a property, optionally specifying type */
	processRecordAccess(expr:ExpressionASTBranchNode, operation:"get", type?:VariableType):[type:VariableType, value:VariableValue];
	/* get a property as a variable (so it can be written to) */
	processRecordAccess(expr:ExpressionASTBranchNode, operation:"get", type:"variable"):VariableData | ConstantData;
	/* get a property as a function */
	processRecordAccess(expr:ExpressionASTBranchNode, operation:"get", type:"function"):ClassMethodCallInformation;
	/* loose overload */
	processRecordAccess(expr:ExpressionASTBranchNode, operation:"get", type?:VariableType | "variable" | "function"):[type:VariableType, value:VariableValue] | VariableData | ConstantData | ClassMethodCallInformation;
	/* set the value of a property */
	processRecordAccess(expr:ExpressionASTBranchNode, operation:"set", value:ExpressionAST):void;
	@errorBoundary()
	processRecordAccess(expr:ExpressionASTBranchNode, operation:"get" | "set", arg2?:VariableType | "variable" | "function" | ExpressionAST):[type:VariableType, value:VariableValue] | VariableData | ConstantData | ClassMethodCallInformation | void {
		//this code is terrible
		//note to self:
		//do not use typescript overloads like this
		//the extra code DRYness is not worth it
		if(!(expr.nodes[1] instanceof Token)) crash(`Second node in record access expression was not a token`);
		const property = expr.nodes[1].text;
		
		if(operation == "set" || arg2 == "variable"){
			//overloads 2 and 5
			const variable = this.evaluateExpr(expr.nodes[0], "variable"); //TODO is this necessary? why can't we assign to some property on the result of a function call?
			if(variable.type instanceof RecordVariableType){
				const outputType = variable.type.fields[property] ?? fail(f.quote`Property ${property} does not exist on type ${variable.type}`, expr.nodes[1]);
				if(arg2 == "variable"){ //overload 2
					//i see nothing wrong with this bodged variable data
					return {
						type: outputType,
						declaration: variable.declaration,
						mutable: true, //Even if the record is immutable, the property is mutable
						get value(){ return (variable.value as Record<string, VariableValue>)[property]; },
						set value(val){
							(variable.value as Record<string, VariableValue>)[property] = val;
						}
					} as (VariableData | ConstantData);
				} else {
					//overload 5
					const value = arg2 as ExpressionAST;
					(variable.value as Record<string, unknown>)[property] = this.evaluateExpr(value, outputType)[1];
				}
			} else if(variable.type instanceof ClassVariableType){
				const propertyStatement = variable.type.properties[property] ?? fail(f.quote`Property ${property} does not exist on type ${variable.type}`, expr.nodes[1]);
				if(propertyStatement.accessModifier == "private" && !this.canAccessClass(variable.type)) fail(f.quote`Property ${property} is private and cannot be accessed outside of the class`, expr.nodes[1]);
				const outputType = this.resolveVariableType(propertyStatement.varType);
				if(arg2 == "variable"){ //overload 2
					return {
						type: outputType,
						declaration: variable.declaration,
						mutable: true, //Even if the class instance variable is immutable, the property is mutable
						get value(){ return ((variable.value as VariableTypeMapping<ClassVariableType>).properties as Record<string, VariableValue>)[property]; },
						set value(val){
							((variable.value as VariableTypeMapping<ClassVariableType>).properties as Record<string, VariableValue>)[property] = val;
						}
					} as (VariableData | ConstantData);
				} else {
					//overload 5
					const value = arg2 as ExpressionAST;
					(variable.value as Record<string, unknown>)[property] = this.evaluateExpr(value, outputType)[1];
				}
			} else fail(f.quote`Cannot access property ${property} on variable of type ${variable.type} because it is not a record or class type and cannot have proprties`, expr.nodes[0]);
		} else { //overloads 1 and 3
			const type = arg2 as VariableType | "function";
			const [objType, obj] = this.evaluateExpr(expr.nodes[0]);
			if(objType instanceof RecordVariableType){
				if(type == "function") fail(f.quote`Expected this expression to evaluate to a function, but found a property access on a variable of type ${type}, which cannot have functions as properties`);
				const outputType = objType.fields[property] ?? fail(f.quote`Property ${property} does not exist on value of type ${objType}`, expr.nodes[1]);
				const value = (obj as Record<string, VariableValue>)[property];
				if(value === null) fail(f.text`Cannot use the value of uninitialized variable "${expr.nodes[0]}.${property}"`, expr.nodes[1]);
				if(type) return [type, this.coerceValue(value, outputType, type)];
				else return [outputType, value];
			} else if(objType instanceof ClassVariableType){
				if(type == "function"){ //overload 3
					const method = objType.methods[property] ?? fail(f.quote`Method ${property} does not exist on type ${objType}`, expr.nodes[1]);
					if(method.controlStatements[0].accessModifier == "private" && !this.canAccessClass(objType)) fail(f.quote`Property ${property} is private and cannot be accessed outside of the class`, expr.nodes[1]);
					return [method, objType, obj as VariableTypeMapping<ClassVariableType>];
				} else { //overload 1
					const propertyStatement = objType.properties[property] ?? fail(f.quote`Property ${property} does not exist on type ${objType}`, expr.nodes[1]);
					if(propertyStatement.accessModifier == "private" && !this.canAccessClass(objType)) fail(f.quote`Property ${property} is private and cannot be accessed outside of the class`, expr.nodes[1]);
					const outputType = this.resolveVariableType(propertyStatement.varType);
					const value = (obj as VariableTypeMapping<ClassVariableType>).properties[property] as VariableValue;
					if(value === null) fail(f.text`Cannot use the value of uninitialized variable "${expr.nodes[0]}.${property}"`, expr.nodes[1]);
					if(type) return [type, this.coerceValue(value, outputType, type)];
					else return [outputType, value];
				}
			} else fail(f.quote`Cannot access property on value of type ${objType} because it is not a record type and cannot have proprties`, expr.nodes[0]);
		}

	}
	evaluateExpr(expr:ExpressionAST):[type:VariableType, value:VariableValue];
	evaluateExpr(expr:ExpressionAST, undefined:undefined, recursive:boolean):[type:VariableType, value:VariableValue];
	evaluateExpr(expr:ExpressionAST, type:"variable", recursive?:boolean):VariableData | ConstantData;
	evaluateExpr(expr:ExpressionAST, type:"function", recursive?:boolean):FunctionData | ClassMethodCallInformation;
	evaluateExpr<T extends VariableType | undefined>(expr:ExpressionAST, type:T, recursive?:boolean):[type:T & {}, value:VariableTypeMapping<T>];
	@errorBoundary({
		predicate: (_expr, _type, recursive) => !recursive,
		message: () => `Cannot evaluate expression $rc: `
	})
	evaluateExpr(expr:ExpressionAST, type?:VariableType | "variable" | "function", _recursive = false):[type:VariableType, value:unknown] | VariableData | ConstantData | FunctionData | ClassMethodCallInformation {
		if(expr == undefined) crash(`expr was ${expr as null | undefined}`);

		if(expr instanceof Token)
			return this.evaluateToken(expr, type as never);

		//Branch node

		//Special cases where the operator isn't a normal operator
		if(expr instanceof ExpressionASTArrayAccessNode){
			if(type == "function") fail(`Expected this expression to evaluate to a function, but found an array access, which cannot return a function.`);
			return this.processArrayAccess(expr, "get", type);
		}
		if(expr instanceof ExpressionASTFunctionCallNode){
			if(type == "variable") fail(`Expected this expression to evaluate to a variable, but found a function call, which can only return values, not variables.`);
			if(type == "function") fail(`Expected this expression to evaluate to a function, but found a function call, which cannot return a function.`);
			if(expr.functionName instanceof Token){
				const fn = this.getFunction(expr.functionName.text);
				if("name" in fn){
					const output = this.callBuiltinFunction(fn, expr.args);
					if(type) return [type, this.coerceValue(output[1], output[0], type)];
					else return output;
				} else {
					if(fn.type == "procedure") fail(f.quote`Procedure ${expr.functionName} does not return a value.`);
					const statement = fn.controlStatements[0];
					const output = this.callFunction(fn, expr.args, true);
					if(type) return [type, this.coerceValue(output, this.resolveVariableType(statement.returnType), type)];
					else return [this.resolveVariableType(statement.returnType), output];
				}
			} else if(expr.functionName instanceof ExpressionASTBranchNode){
				const func = this.evaluateExpr(expr.functionName, "function");
				if(Array.isArray(func)){
					if(func[0].type == "class_procedure") fail(f.quote`Expected this expression to return a value, but the function ${expr.functionName} is a procedure which does not return a value`);
					//Class method
					return this.callClassMethod(func[0], func[1], func[2], expr.args, true); //TODO change "require return value" to also allow "forbid return value" on callFunction and callClassMethod
				} else crash(`Branched function call node should not be able to return regular functions`);
			} else crash(`Function name was an unexpected node type`);
		}
		if(expr instanceof ExpressionASTClassInstantiationNode){
			if(type == "variable") fail(`Expected this expression to evaluate to a variable, but found a class instantiation expression, which can only return a class instance, not a variable.`);
			if(type == "function") fail(`Expected this expression to evaluate to a function, but found a class instantiation expression, which can only return a class instance, not a function.`);
			const clazz = this.getClass(expr.className.text);
			const output = clazz.construct(this, expr.args);
			if(type) return [type, this.coerceValue(output, clazz, type)];
			else return [clazz, output];
		}

		//Operator that returns a result of unknown type
		if(expr.operator.category == "special"){
			switch(expr.operator){
				case operators.access:
					return this.processRecordAccess(expr, "get", type);
				case operators.pointer_reference: {
					if(type == "variable" || type == "function") fail(`Expected this expression to evaluate to a ${type}, but found a referencing expression, which returns a pointer`);
					if(type && !(type instanceof PointerVariableType)) fail(f.quote`Expected result to be of type ${type}, but the reference operator will return a pointer`);
					let variable;
					try {
						variable = this.evaluateExpr(expr.nodes[0], "variable", true);
						//Guess the type
					} catch(err){
						//If the thing we're referencing couldn't be evaluated to a variable
						//create a fake variable
						//CONFIG weird pointers to fake variables
						if(err instanceof SoodocodeError){
							const [targetType, targetValue] = this.evaluateExpr(expr.nodes[0], type?.target, true);
							//Guess the type
							const pointerType = this.getPointerTypeFor(targetType) ?? fail(f.quote`Cannot find a pointer type for ${targetType}`);
							return [pointerType, {
								type: targetType,
								declaration: "dynamic",
								mutable: true,
								value: targetValue
							} satisfies VariableData];
						} else throw err;
					}
					const pointerType = this.getPointerTypeFor(variable.type) ?? fail(f.quote`Cannot find a pointer type for ${variable.type}`);
					if(type) return [pointerType, this.coerceValue(variable, pointerType, type)];
					else return [pointerType, variable];
				}
				case operators.pointer_dereference: {
					if(type == "function") fail(`Expected this expression to evaluate to a function, but found a dereferencing expression, which cannot return a function`);
					const [pointerVariableType, variableValue] = this.evaluateExpr(expr.nodes[0], undefined, true);
					if(variableValue == null) fail(`Cannot dereference uninitialized pointer`, expr.nodes[0]);
					if(!(pointerVariableType instanceof PointerVariableType)) fail(f.quote`Cannot dereference value of type ${pointerVariableType} because it is not a pointer`, expr.nodes[0]);
					const pointerVariableData = variableValue as VariableTypeMapping<PointerVariableType>;
					if(type == "variable"){
						if(!pointerVariableData.mutable) fail(`Cannot assign to constant`, expr);
						return pointerVariableData;
					} else {
						if(pointerVariableData.value == null) fail(f.quote`Cannot dereference ${expr.nodes[0]} and use the value, because the underlying value has not been initialized`, expr.nodes[0]);
						if(type) return [pointerVariableType.target, this.coerceValue(pointerVariableData.value, pointerVariableType.target, type)];
						else return [pointerVariableType.target, pointerVariableData.value];
					}
				}
				default: impossible();
			}
		}

		if(type == "variable" || type == "function") fail(`Cannot evaluate this expression as a ${type}`);

		//arithmetic
		if(type?.is("REAL", "INTEGER") || expr.operator.category == "arithmetic"){
			if(type && !type.is("REAL", "INTEGER"))
				fail(f.quote`expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a number`);

			const guessedType = (type as PrimitiveVariableType<"REAL" | "INTEGER">) ?? PrimitiveVariableType.REAL; //Use this type to evaluate the expression
			let value:number;
			//if the requested type is INTEGER, the sub expressions will be evaluated as integers and return an error if not possible
			if(expr.operator.type == "unary_prefix"){
				const [_operandType, operand] = this.evaluateExpr(expr.nodes[0], guessedType, true);
				switch(expr.operator){
					case operators.negate:
						return [PrimitiveVariableType.INTEGER, -operand];
					default: crash("impossible");
				}
			}
			const [_leftType, left] = this.evaluateExpr(expr.nodes[0], guessedType, true);
			const [_rightType, right] = this.evaluateExpr(expr.nodes[1], guessedType, true);
			switch(expr.operator){
				case operators.add:
					value = left + right;
					break;
				case operators.subtract:
					value = left - right;
					break;
				case operators.multiply:
					value = left * right;
					break;
				case operators.divide:
					if(right == 0) fail(`Division by zero`);
					value = left / right;
					if(type?.is("INTEGER"))
						fail(
`Arithmetic operation evaluated to value of type REAL, cannot be coerced to INTEGER
help: try using DIV instead of / to produce an integer as the result`
						); //CONFIG
					break;
				case operators.integer_divide:
					if(right == 0) fail(`Division by zero`);
					value = Math.trunc(left / right);
					break;
				case operators.mod:
					if(right == 0) fail(`Division by zero`);
					value = left % right;
					break;
				default:
					fail(f.quote`Expected the expression to evaluate to a value of type ${type ?? impossible()}, but the operator ${expr.operator} produces a result of another type`);
			}
			return [guessedType, value];
		}

		//logical
		if(type?.is("BOOLEAN") || expr.operator.category == "logical"){
			if(type && !type.is("BOOLEAN"))
				fail(f.quote`Expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a boolean`);

			if(expr.operator.type == "unary_prefix"){
				switch(expr.operator){
					case operators.not:
						return [PrimitiveVariableType.BOOLEAN, !this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.BOOLEAN, true)[1]];
					default: crash("impossible");
				}
			}
			switch(expr.operator){
				case operators.and:
					return [PrimitiveVariableType.BOOLEAN, this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.BOOLEAN, true)[1] && this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.BOOLEAN, true)[1]];
				case operators.or:
					return [PrimitiveVariableType.BOOLEAN, this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.BOOLEAN, true)[1] || this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.BOOLEAN, true)[1]];
				case operators.equal_to:
				case operators.not_equal_to: {
					//Type is unknown
					const [leftType, left] = this.evaluateExpr(expr.nodes[0], undefined, true);
					const [rightType, right] = this.evaluateExpr(expr.nodes[1], undefined, true);
					const typesMatch =
						(leftType == rightType) ||
						(leftType.is("INTEGER") && rightType.is("REAL")) ||
						(leftType.is("REAL") && rightType.is("INTEGER"));
					const is_equal = typesMatch && (left == right);
					if(expr.operator == operators.equal_to) return [PrimitiveVariableType.BOOLEAN, is_equal];
					else return [PrimitiveVariableType.BOOLEAN, !is_equal];
				}
				case operators.greater_than:
					return [PrimitiveVariableType.BOOLEAN, this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.REAL, true)[1] > this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.REAL, true)[1]];
				case operators.greater_than_equal:
					return [PrimitiveVariableType.BOOLEAN, this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.REAL, true)[1] >= this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.REAL, true)[1]];
				case operators.less_than:
					return [PrimitiveVariableType.BOOLEAN, this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.REAL, true)[1] < this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.REAL, true)[1]];
				case operators.less_than_equal:
					return [PrimitiveVariableType.BOOLEAN, this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.REAL, true)[1] <= this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.REAL, true)[1]];
				default:
					fail(f.quote`Expected the expression to evaluate to a value of type ${type!}, but the operator ${expr.operator} returns another type`);
			}
		}

		//string
		if(type?.is("STRING") || expr.operator.category == "string"){
			if(type && !type.is("STRING"))
				fail(f.quote`expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a string`);
			switch(expr.operator){
				case operators.string_concatenate:
					return [PrimitiveVariableType.STRING, this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.STRING, true)[1] + this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.STRING, true)[1]];
				default:
					fail(f.quote`Expected the expression to evaluate to a value of type ${type!}, but the operator ${expr.operator} returns another type`);
			}
		}

		expr.operator.category satisfies never;
		impossible();
	}
	evaluateToken(token:Token):[type:VariableType, value:VariableValue];
	evaluateToken(token:Token, type:"variable"):VariableData | ConstantData;
	evaluateToken(token:Token, type:"function"):FunctionData | BuiltinFunctionData;
	evaluateToken<T extends VariableType | undefined>(token:Token, type:T):[type:T & {}, value:VariableTypeMapping<T>];
	evaluateToken(token:Token, type?:VariableType | "variable" | "function"):[type:VariableType, value:unknown] | VariableData | ConstantData | FunctionData | BuiltinFunctionData {
		if(token.type == "name"){
			if(type == "function") return this.getFunction(token.text);

			const enumType = this.getEnumFromValue(token.text);
			if(enumType){
				if(type == "variable") fail(f.quote`Cannot evaluate token ${token.text} as a variable`);
				if(!type || type === enumType) return [enumType, token.text];
				else fail(f.quote`Cannot convert value of type ${enumType} to ${type}`);
			} else {
				const variable = this.getVariable(token.text);
				if(!variable) fail(f.quote`Undeclared variable ${token}`);
				if(type == "variable") return variable;
				if(variable.value == null) fail(`Cannot use the value of uninitialized variable ${token.text}`);
				if(type !== undefined) return [type, this.coerceValue(variable.value, variable.type, type)];
				else return [variable.type, variable.value];
			}
		}
		if(type == "variable" || type == "function") fail(f.quote`Cannot evaluate token ${token.text} as a ${type}`);
		switch(token.type){
			case "boolean.false":
				//TODO bad coercion
				if(!type || type.is("BOOLEAN")) return [PrimitiveVariableType.BOOLEAN, false];
				else if(type.is("STRING")) return [PrimitiveVariableType.STRING, "FALSE"];
				else fail(f.text`Cannot convert value FALSE to type ${type}`);
				break;
			case "boolean.true":
				if(!type || type.is("BOOLEAN")) return [PrimitiveVariableType.BOOLEAN, true];
				else if(type.is("STRING")) return [PrimitiveVariableType.STRING, "TRUE"];
				else fail(f.text`Cannot convert value TRUE to type ${type}`);
				break;
			case "number.decimal":
				if(!type || type.is("INTEGER", "REAL", "STRING")){
					const val = Number(token.text);
					if(!Number.isFinite(val))
						fail(f.quote`Value ${token} cannot be converted to a number: too large`);
					if(type?.is("INTEGER")){
						if(!Number.isInteger(val))
							fail(f.quote`Value ${token} cannot be converted to an integer`);
						if(!Number.isSafeInteger(val))
							fail(f.quote`Value ${token} cannot be converted to an integer: too large`);
						return [PrimitiveVariableType.INTEGER, val];
					} else if(type?.is("STRING")){
						return [PrimitiveVariableType.STRING, token.text];
					} else {
						return [PrimitiveVariableType.REAL, val];
					}
				} else fail(f.quote`Cannot convert number to type ${type}`);
				break;
			case "string":
				if(!type || type.is("STRING")) return [PrimitiveVariableType.STRING, token.text.slice(1, -1)]; //remove the quotes
				else fail(f.quote`Cannot convert value ${token} to type ${type}`);
				break;
			case "char":
				if(!type || type.is("CHAR")) return [PrimitiveVariableType.CHAR, token.text.slice(1, -1)]; //remove the quotes
				else fail(f.quote`Cannot convert value ${token} to type ${type}`);
				break;
			default: fail(f.quote`Cannot evaluate token ${token} of type ${token.type}`);
		}
	}
	static NotStaticError = class extends Error {};
	static evaluateToken(token:Token, type?:VariableType):[type:VariableType, value:VariableValue] {
		//major shenanigans
		try {
			return this.prototype.evaluateToken.call(new Proxy({}, {
				get(){ throw new Runtime.NotStaticError(); },
			}), token, type);
		} catch(err){
			if(err instanceof Runtime.NotStaticError) fail(f.quote`Cannot evaluate token ${token} in a static context`, token);
			else throw err;
		}
	}
	resolveVariableType(type:UnresolvedVariableType):VariableType {
		if(type instanceof PrimitiveVariableType || type instanceof ArrayVariableType) return type;
		else return this.getType(type[1]) ?? fail(f.quote`Type ${type[1]} does not exist`);
	}
	/** Returned variable may not be initialized */
	getVariable(name:string):VariableData | ConstantData | null {
		for(let i = this.scopes.length - 1; i >= 0; i--){
			if(this.scopes[i].variables[name]) return this.scopes[i].variables[name];
		}
		return null;
	}
	getType(name:string):VariableType | null {
		for(let i = this.scopes.length - 1; i >= 0; i--){
			if(this.scopes[i].types[name]) return this.scopes[i].types[name];
		}
		return null;
	}
	getEnumFromValue(name:string):EnumeratedVariableType | null {
		for(let i = this.scopes.length - 1; i >= 0; i--){
			const data = Object.values(this.scopes[i].types)
				.find((data):data is EnumeratedVariableType => data instanceof EnumeratedVariableType && data.values.includes(name));
			if(data) return data;
		}
		return null;
	}
	getPointerTypeFor(type:VariableType):PointerVariableType | null {
		for(let i = this.scopes.length - 1; i >= 0; i--){
			const data = Object.values(this.scopes[i].types)
				.find((data):data is PointerVariableType => data instanceof PointerVariableType && typesEqual(data.target, type));
			if(data) return data;
		}
		return null;
	}
	getCurrentScope():VariableScope {
		return this.scopes.at(-1) ?? crash(`No scope?`);
	}
	canAccessClass(clazz:ClassVariableType):boolean {
		for(const { statement } of this.scopes.slice().reverse()){
			if(statement instanceof ClassStatement)
				return statement == clazz.statement;
			if(statement.constructor == FunctionStatement || statement.constructor == ProcedureStatement)
				return false; //closest relevant statement is a function, cant access classes
			//Ignore classmethodstatement because it always has a ClassStatement just above it
		}
		return false;
	}
	getFunction(name:string):FunctionData | BuiltinFunctionData {
		return this.functions[name] ?? builtinFunctions[name] ?? fail(f.quote`Function ${name} has not been defined.`);
	}
	getClass(name:string):ClassVariableType {
		for(let i = this.scopes.length - 1; i >= 0; i--){
			if(this.scopes[i].types[name]){
				if(!(this.scopes[i].types[name] instanceof ClassVariableType))
					fail(f.quote`Type ${name} is not a class, it is ${this.scopes[i].types[name]}`);
				return this.scopes[i].types[name] as ClassVariableType;
			}
		}
		fail(f.quote`Class ${name} has not been defined.`);
	}
	getCurrentFunction():FunctionData | ClassMethodStatement | null {
		const scope = this.scopes.findLast(
			(s):s is VariableScope & { statement: FunctionStatement | ProcedureStatement | ClassFunctionStatement | ClassProcedureStatement } =>
				s.statement instanceof FunctionStatement || s.statement instanceof ProcedureStatement || s.statement instanceof ClassFunctionStatement || s.statement instanceof ClassProcedureStatement
		);
		if(!scope) return null;
		if(scope.statement instanceof ClassFunctionStatement || scope.statement instanceof ClassProcedureStatement)
			return scope.statement;
		else
			return this.functions[scope.statement.name] ?? crash(`Function ${scope.statement.name} does not exist`);
	}
	coerceValue<T extends VariableType, S extends VariableType>(value:VariableTypeMapping<T>, from:T, to:S):VariableTypeMapping<S> {
		//typescript really hates this function, beware
		if(typesEqual(from, to)) return value as never;
		if(from.is("STRING") && to.is("CHAR")) return value as never;
		if(from.is("INTEGER") && to.is("REAL")) return value as never;
		if(from.is("REAL") && to.is("INTEGER")) return Math.trunc(value as never) as never;
		if(to.is("STRING")){
			if(from.is("BOOLEAN", "CHAR", "DATE", "INTEGER", "REAL", "STRING"))
				return (value as VariableTypeMapping<PrimitiveVariableType>).toString() as never;
			else if(from instanceof ArrayVariableType) return `[${(value as unknown[]).join(",")}]` as never;
		}
		if(from instanceof ClassVariableType && to instanceof ClassVariableType && from.inherits(to)) return value as never;
		fail(f.quote`Cannot coerce value of type ${from} to ${to}`);
	}
	cloneValue<T extends VariableType>(type:T, value:VariableTypeMapping<T> | null):VariableTypeMapping<T> | null {
		if(value == null) return value;
		if(typeof value == "string") return value;
		if(typeof value == "number") return value;
		if(typeof value == "boolean") return value;
		if(value instanceof Date) return new Date(value) as VariableTypeMapping<T>;
		if(Array.isArray(value)) return value.slice().map(v =>
			this.cloneValue(this.resolveVariableType((type as ArrayVariableType).type), v)
		) as VariableTypeMapping<T>;
		if(type instanceof PointerVariableType) return value; //just pass it through, because pointer data doesn't have any mutable sub items (other than the variable itself)
		if(type instanceof RecordVariableType) return Object.fromEntries(Object.entries(value)
			.map(([k, v]) => [k, this.cloneValue(type.fields[k], v as VariableValue)])
		) as VariableTypeMapping<T>;
		if(type instanceof ClassVariableType) return Object.fromEntries(Object.entries((value as VariableTypeMapping<ClassVariableType>).properties)
			.map(([k, v]) => [k, this.cloneValue(this.resolveVariableType(type.properties[k].varType), v as VariableValue)])
		) as VariableTypeMapping<T>;
		crash(f.quote`Cannot clone value of type ${type}`);
	}
	assembleScope(func:ProcedureStatement | FunctionStatement, args:ExpressionASTNode[]){
		if(func.args.size != args.length) fail(`Incorrect number of arguments for function ${func.name}`);
		const scope:VariableScope = {
			statement: func,
			variables: {},
			types: {},
		};
		for(const [i, [name, {type, passMode}]] of [...func.args.entries()].entries()){
			const rType = this.resolveVariableType(type);
			if(passMode == "reference"){
				const varData = this.evaluateExpr(args[i], "variable");
				if(!typesEqual(varData.type, rType)) fail(f.quote`Expected the argument to be of type ${rType}, but it was of type ${varData.type}. Cannot coerce BYREF arguments, please change the variable's type.`);
				scope.variables[name] = {
					declaration: func,
					mutable: true,
					type: rType,
					get value(){ return varData.value ?? fail(`Variable (passed by reference) has not been initialized`); },
					set value(value){ varData.value = value; }
				};
			} else {
				const value = this.evaluateExpr(args[i], rType)[1];
				scope.variables[name] = {
					declaration: func,
					mutable: true,
					type: rType,
					value: this.cloneValue(rType, value)
				};
			}
		}
		return scope;
	}
	callFunction<T extends boolean>(funcNode:FunctionData, args:ExpressionAST[], requireReturnValue?:T):VariableValue | (T extends false ? null : never) {
		const func = funcNode.controlStatements[0];
		if(func instanceof ProcedureStatement && requireReturnValue)
			fail(`Cannot use return value of ${func.name}() as it is a procedure`);

		const scope = this.assembleScope(func, args);
		const output = this.runBlock(funcNode.nodeGroups[0], scope);
		if(func instanceof ProcedureStatement){
			//requireReturnValue satisfies false;
			return null!;
		} else { //must be functionstatement
			if(!output) fail(f.quote`Function ${func.name} did not return a value`);
			return output.value;
		}
	}
	callClassMethod<T extends boolean>(funcNode:ClassMethodData, clazz:ClassVariableType, instance:VariableTypeMapping<ClassVariableType>, args:ExpressionAST[], requireReturnValue?:T):[type:VariableType, value:VariableValue] | (T extends false ? null : never) {
		const func = funcNode.controlStatements[0];
		if(func instanceof ClassProcedureStatement && requireReturnValue)
			fail(`Cannot use return value of ${func.name}() as it is a procedure`);

		const classScope = clazz.getScope(this, instance);
		const methodScope = this.assembleScope(func, args);
		const output = this.runBlock(funcNode.nodeGroups[0], classScope, methodScope);
		if(func instanceof ClassProcedureStatement){
			//requireReturnValue satisfies false;
			return null!;
		} else { //must be functionstatement
			return output ? [this.resolveVariableType(func.returnType), output.value] : fail(f.quote`Function ${func.name} did not return a value`);
		}
	}
	callBuiltinFunction(fn:BuiltinFunctionData, args:ExpressionAST[], returnType?:VariableType):[type:VariableType, value:VariableValue] {
		if(fn.args.size != args.length) fail(f.quote`Incorrect number of arguments for function ${fn.name}`);
		if(!fn.returnType) fail(f.quote`Builtin function ${fn.name} does not return a value`);
		const processedArgs:VariableValue[] = [];
		let i = 0;
		nextArg:
		for(const {type} of fn.args.values()){
			const errors:SoodocodeError[] = [];
			for(const possibleType of type){
				try {
					processedArgs.push(this.evaluateExpr(args[i], possibleType)[1]);
					i ++;
					continue nextArg;
				} catch(err){
					if(err instanceof SoodocodeError) errors.push(err);
					else throw err;
				}
			}
			throw errors.at(-1);
		}
		if(returnType) return [returnType, this.coerceValue(fn.impl.apply(this, processedArgs), fn.returnType, returnType)];
		else return [fn.returnType, fn.impl.apply(this, processedArgs)];
	}
	runBlock(code:ProgramASTNode[], ...scopes:VariableScope[]):void | {
		type: "function_return";
		value: VariableValue;
	}{
		this.scopes.push(...scopes);
		let returned:null | VariableValue = null;
		for(const node of code){
			let result;
			if(node instanceof Statement){
				result = node.run(this);
			} else {
				result = node.controlStatements[0].runBlock(this, node);
			}
			if(result){
				if(result.type == "function_return"){
					returned = result.value;
					break;
				}
			}
		}
		if(scopes.length > 0 && this.scopes.splice(-scopes.length).length != scopes.length) crash(`Scope somehow disappeared`);
		if(returned !== null){
			return {
				type: "function_return",
				value: returned
			};
		}
	}
	/** Creates a scope. */
	runProgram(code:ProgramASTNode[]){
		this.runBlock(code, {
			statement: "global",
			variables: {},
			types: {}
		});

		for(const filename in this.openFiles){
			if(this.openFiles[filename] == undefined) delete this.openFiles[filename];
			else fail(f.quote`File ${filename} was not closed`);
		}
	}
	getOpenFile(filename:string):OpenedFile;
	getOpenFile<T extends FileMode>(filename:string, modes:T[], operationDescription:string):OpenedFileOfType<T>;
	getOpenFile(filename:string, modes?:FileMode[], operationDescription?:string):OpenedFile {
		const data = (this.openFiles[filename] ?? fail(f.quote`File ${filename} is not open or does not exist.`));
		if(modes && operationDescription && !modes.includes(data.mode)) fail(f.quote`${operationDescription} requires the file to have been opened with mode ${modes.map(m => `"${m}"`).join(" or ")}, but the mode is ${data.mode}`);
		return data;
	}
}
