/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the runtime, which executes the program AST.
*/


import { getBuiltinFunctions } from "./builtin_functions.js";
import { Config, configs } from "./config.js";
import { Token } from "./lexer-types.js";
import { ExpressionAST, ExpressionASTArrayAccessNode, ExpressionASTBranchNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, ExpressionASTNode, ProgramASTBranchNode, ProgramASTNode, operators } from "./parser-types.js";
import { ArrayVariableType, BuiltinFunctionData, ClassMethodData, ClassMethodStatement, ClassVariableType, ConstantData, EnumeratedVariableType, File, FileMode, FunctionData, OpenedFile, OpenedFileOfType, PointerVariableType, PrimitiveVariableType, RecordVariableType, TypedValue, UnresolvedVariableType, VariableData, VariableScope, VariableType, VariableTypeMapping, VariableValue, typedValue, typesAssignable, typesEqual } from "./runtime-types.js";
import { ClassFunctionStatement, ClassProcedureStatement, ClassStatement, ConstantStatement, FunctionStatement, ProcedureStatement, Statement, TypeStatement } from "./statements.js";
import type { BoxPrimitive, RangeAttached, TextRange, TextRangeLike } from "./types.js";
import { RangeArray, SoodocodeError, biasedLevenshtein, boxPrimitive, crash, errorBoundary, f, fail, forceType, groupArray, impossible, min, rethrow, tryRun, tryRunOr } from "./utils.js";

//TODO: fix coercion

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
export type ClassMethodCallInformation = {
	/** This is the class type that the method is linked to, NOT the class type of the instance. Used to determine what SUPER is. */
	clazz: ClassVariableType;
	instance: VariableTypeMapping<ClassVariableType>;
	method: ClassMethodData;
};
export class Runtime {
	scopes: VariableScope[] = [];
	functions: Record<string, FunctionData> = {};
	openFiles: Record<string, OpenedFile | undefined> = {};
	/** While a class method is executing, this variable is set to data about the class method. */
	classData: {
		/** This is the class type that the method is linked to, NOT the class type of the instance. Used to determine what SUPER is. */
		clazz:ClassVariableType;
		instance:VariableTypeMapping<ClassVariableType>;
		method:ClassMethodData;
	} | null = null;
	/** While a type is being resolved, this variable is set to the name of the type. */
	currentlyResolvingTypeName: string | null = null;
	/** While a pointer type is being resolved, this variable is set to the name of the type. */
	currentlyResolvingPointerTypeName: string | null = null;
	fs = new Files();
	builtinFunctions = getBuiltinFunctions();
	constructor(
		public _input: (message:string, type:VariableType) => string,
		public _output: (values:TypedValue[]) => void,
	){}
	finishEvaluation(value:VariableValue, from:VariableType, to:VariableType | undefined):TypedValue {
		if(to && to instanceof ArrayVariableType && (!to.lengthInformation || !to.elementType))
			return typedValue(from, this.coerceValue(value, from, to)); //don't have a varlength array as the output type
		else if(to) return typedValue(to, this.coerceValue(value, from, to));
		else return typedValue(from, value);
	}
	processArrayAccess(expr:ExpressionASTArrayAccessNode, outType?:VariableType):TypedValue;
	processArrayAccess(expr:ExpressionASTArrayAccessNode, outType:"variable"):VariableData;
	processArrayAccess(expr:ExpressionASTArrayAccessNode, outType?:VariableType | "variable"):TypedValue | VariableData;
	@errorBoundary()
	processArrayAccess(expr:ExpressionASTArrayAccessNode, outType?:VariableType | "variable"):TypedValue | VariableData | void {

		//Make sure the variable exists and is an array
		const _target = this.evaluateExpr(expr.target, "variable");
		if(!(_target.type instanceof ArrayVariableType))
			fail(f.quote`Cannot convert variable of type ${_target.type} to an array`, expr.target);
		const target = _target as VariableData<ArrayVariableType, never>;
		const targetType = target.type;
		if(!targetType.lengthInformation) crash(`Cannot access elements in an array of unknown length`);
		if(!targetType.elementType) crash(`Cannot access elements in an array of unknown type`);

		//TODO is there any way of getting a 1D array out of a 2D array?
		//Forbids getting any arrays from arrays
		if(outType instanceof ArrayVariableType)
			fail(f.quote`Cannot evaluate expression starting with "array access": expected the expression to evaluate to a value of type ${outType}, but the array access produces a result of type ${targetType.elementType}`, expr.target);


		if(expr.indices.length != targetType.lengthInformation.length)
			fail(
`Cannot evaluate expression starting with "array access": \
${targetType.lengthInformation.length}-dimensional array requires ${targetType.lengthInformation.length} indices, \
but found ${expr.indices.length} indices`,
				expr.indices
			);
		const indexes:[ExpressionASTNode, number][] = expr.indices.map(e => [e, this.evaluateExpr(e, PrimitiveVariableType.INTEGER).value]);
		let invalidIndexIndex;
		if(
			(invalidIndexIndex = indexes.findIndex(([_expr, value], index) =>
				value > targetType.lengthInformation![index][1] ||
				value < targetType.lengthInformation![index][0])
			) != -1
		) fail(
`Array index out of bounds: \
value ${indexes[invalidIndexIndex][1]} was not in range \
(${targetType.lengthInformation[invalidIndexIndex].join(" to ")})`,
			indexes[invalidIndexIndex][0]);
		const index = indexes.reduce((acc, [_expr, value], index) =>
			(acc + value - targetType.lengthInformation![index][0]) * (index == indexes.length - 1 ? 1 : targetType.arraySizes![index + 1]),
		0);
		if(index >= target.value.length) crash(`Array index bounds check failed: ${indexes.map(v => v[1]).join(", ")}; ${index} > ${target.value.length}`);
		if(outType == "variable"){
			return {
				type: targetType.elementType,
				declaration: target.declaration,
				mutable: true,
				get value(){ return target.value[index]; },
				set value(val){ target.value[index] = val; }
			};
		}
		const output = target.value[index];
		if(output == null) fail(f.text`Cannot use the value of uninitialized variable ${expr.target}[${indexes.map(([_expr, val]) => val).join(", ")}]`, expr.target);
		return this.finishEvaluation(output, targetType.elementType, outType);
	}
	/* get a property, optionally specifying type */
	processRecordAccess(expr:ExpressionASTBranchNode, outType?:VariableType):TypedValue;
	/* get a property as a variable (so it can be written to) */
	processRecordAccess(expr:ExpressionASTBranchNode, outType:"variable"):VariableData | ConstantData;
	/* get a property as a function */
	processRecordAccess(expr:ExpressionASTBranchNode, outType:"function"):ClassMethodCallInformation;
	/* loose overload */
	processRecordAccess(expr:ExpressionASTBranchNode, outType?:VariableType | "variable" | "function"):TypedValue | VariableData | ConstantData | ClassMethodCallInformation;
	@errorBoundary()
	processRecordAccess(expr:ExpressionASTBranchNode, outType?:VariableType | "variable" | "function"):TypedValue | VariableData | ConstantData | ClassMethodCallInformation {
		//this code is dubious
		//note to self:
		//do not use typescript overloads like this
		//the extra code DRYness is not worth it
		if(!(expr.nodes[1] instanceof Token)) crash(`Second node in record access expression was not a token`);
		const property = expr.nodes[1].text;

		//Special case: super method call
		if(expr.nodes[0] instanceof Token && expr.nodes[0].type == "keyword.super"){
			if(!this.classData) fail(`SUPER is only valid within a class`, expr.nodes[0]);
			const baseType = this.classData.clazz.baseClass ?? fail(`SUPER does not exist for class ${this.classData.clazz.fmtQuoted()} because it does not inherit from any other class`, expr.nodes[0]);
			if(!(outType == "function")) fail(`Expected this expression to evaluate to a value, but it is a member access on SUPER, which can only return methods`, expr);
			const [clazz, method] = baseType.allMethods[property] ?? fail(f.quote`Method ${property} does not exist on SUPER (class ${baseType.fmtPlain()})`, expr.nodes[1]);
			return {
				clazz, method, instance: this.classData.instance
			} satisfies ClassMethodCallInformation;
		}

		let target:VariableData | ConstantData | undefined = undefined;
		let targetType:VariableType;
		let targetValue:VariableValue | null;
		if(outType == "variable"){
			target = this.evaluateExpr(expr.nodes[0], "variable");
			targetType = target.type;
			targetValue = target.value;
		} else {
			({ type:targetType, value:targetValue } = this.evaluateExpr(expr.nodes[0]));
		}
		if(targetType instanceof RecordVariableType){
			forceType<VariableTypeMapping<RecordVariableType>>(targetValue);
			const outputType = targetType.fields[property]?.[0] ?? fail(f.quote`Property ${property} does not exist on type ${targetType}`, expr.nodes[1]);
			if(outType == "variable"){
				//i see nothing wrong with this bodged variable data
				return {
					type: outputType,
					declaration: (target! satisfies VariableData | ConstantData).declaration as never,
					mutable: true, //Even if the record is immutable, the property is mutable
					get value(){ return targetValue[property]; },
					set value(val){ targetValue[property] = val; }
				} satisfies (VariableData | ConstantData);
			}	else if(outType == "function"){
				fail(f.quote`Expected this expression to evaluate to a function, but found a property access on a variable of type ${targetType}, which cannot have functions as properties`, expr);
			} else {
				const value = targetValue[property];
				if(value === null) fail(f.text`Variable "${expr.nodes[0]}.${property}" has not been initialized`, expr.nodes[1]);
				return this.finishEvaluation(value, outputType, outType);
			}
		} else if(targetType instanceof ClassVariableType){
			const classInstance = targetValue as VariableTypeMapping<ClassVariableType>;
			const instanceType = classInstance.type; //Use the instance's type (Dog, not the variable type Animal) only when searching for methods
			if(outType == "function"){
				const [clazz, method] = targetType.allMethods[property]
					? (instanceType.allMethods[property] ?? crash(`Inherited method not present`)) //If the method is present on the variable type, use the instance's type to get the method implementation
					: instanceType.allMethods[property] //Method not present on the variable type
						? fail(f.quote //If it doesn't exist on the variable type but does exist on the instance type, long error message
`Method ${property} does not exist on type ${targetType}.
The data in the variable ${expr.nodes[0]} is of type ${instanceType.fmtPlain()} which has the method, \
but the type of the variable is ${targetType.fmtPlain()}.
help: change the type of the variable to ${instanceType.fmtPlain()}`,
						expr.nodes[1])
						: fail(f.quote`Method ${property} does not exist on type ${targetType}`, expr.nodes[1]);
				if(method.controlStatements[0].accessModifier == "private" && !this.canAccessClass(targetType))
					fail(f.quote`Method ${property} is private and cannot be accessed outside of the class`, expr.nodes[1]);
				return { method, instance: classInstance, clazz };
			} else {
				//Use the variable type, properties cannot be overriden
				const propertyStatement = targetType.properties[property]?.[1] ?? (
					instanceType.properties[property]
						? fail(f.quote
`Property ${property} does not exist on type ${targetType}.
The data in the variable ${expr.nodes[0]} is of type ${instanceType.fmtPlain()} which has the property, \
but the type of the variable is ${targetType.fmtPlain()}.
help: change the type of the variable to ${instanceType.fmtPlain()}`,
						expr.nodes[1])
						: fail(f.quote`Property ${property} does not exist on type ${targetType}`, expr.nodes[1])
				);
				if(propertyStatement.accessModifier == "private" && !this.canAccessClass(targetType)) fail(f.quote`Property ${property} is private and cannot be accessed outside of the class`, expr.nodes[1]);
				const outputType = targetType.getPropertyType(property, classInstance);
				if(outType == "variable"){
					return {
						type: outputType,
						assignabilityType: targetType.properties[property][0],
						updateType(type){
							if(outputType instanceof ArrayVariableType && !outputType.lengthInformation)
								classInstance.propertyTypes[property] = type;
						},
						declaration: target!.declaration,
						mutable: true, //Even if the class instance variable is immutable, the property is mutable
						get value(){ return classInstance.properties[property]; },
						set value(val){
							classInstance.properties[property] = val;
						}
					} as (VariableData | ConstantData);
				}	else {
					const value = classInstance.properties[property];
					if(value === null) fail(f.text`Variable "${expr.nodes[0]}.${property}" has not been initialized`, expr.nodes[1]);
					return this.finishEvaluation(value, outputType, outType);
				}
			}
		} else fail(f.quote`Cannot access property ${property} on variable of type ${targetType} because it is not a record or class type and cannot have proprties`, expr.nodes[0]);
	}
	assignExpr(target:ExpressionAST, src:ExpressionAST){
		const variable = this.evaluateExpr(target, "variable");
		if(!variable.mutable) fail(f.quote`Cannot assign to constant ${target}`, target);
		const {type, value} = this.evaluateExpr(src, variable.assignabilityType ?? variable.type);
		variable.value = value;
		variable.updateType?.(type);
	}
	evaluateExpr(expr:ExpressionAST):TypedValue;
	evaluateExpr(expr:ExpressionAST, undefined:undefined, recursive:boolean):TypedValue;
	evaluateExpr(expr:ExpressionAST, type:"variable", recursive?:boolean):VariableData | ConstantData;
	evaluateExpr(expr:ExpressionAST, type:"function", recursive?:boolean):FunctionData | BuiltinFunctionData | ClassMethodCallInformation;
	evaluateExpr<T extends VariableType | undefined>(expr:ExpressionAST, type:T, recursive?:boolean):TypedValue<T extends undefined ? VariableType : T & {}>
	@errorBoundary({
		predicate: (_expr, _type, recursive) => !recursive,
		message: () => `Cannot evaluate expression "$rc": `
	})
	evaluateExpr(expr:ExpressionAST, type?:VariableType | "variable" | "function", _recursive = false):TypedValue | VariableData | ConstantData | FunctionData | BuiltinFunctionData | ClassMethodCallInformation {
		if(expr == undefined) crash(`expr was ${expr as null | undefined}`);

		if(expr instanceof Token)
			return this.evaluateToken(expr, type as never);

		//Branch node

		//Special cases where the operator isn't a normal operator
		if(expr instanceof ExpressionASTArrayAccessNode){
			if(type == "function") fail(`Expected this expression to evaluate to a function, but found an array access, which cannot return a function.`, expr);
			return this.processArrayAccess(expr, type);
		}
		if(expr instanceof ExpressionASTFunctionCallNode){
			if(type == "variable") fail(`Expected this expression to evaluate to a variable, but found a function call, which cannot return a variable.`, expr);
			if(type == "function") fail(`Expected this expression to evaluate to a function, but found a function call, which cannot return a function.`, expr);
			const func = this.evaluateExpr(expr.functionName, "function");
			if("clazz" in func){
				if(func.method.type == "class_procedure") fail(f.quote`Expected this expression to return a value, but the function ${expr.functionName} is a procedure which does not return a value`, expr.functionName);
				//Class method
				const output = this.callClassMethod(func.method, func.clazz, func.instance, expr.args, true);
				return this.finishEvaluation(output.value, output.type, type);
			} else if("name" in func){
				const output = this.callBuiltinFunction(func, expr.args);
				return this.finishEvaluation(output.value, output.type, type);
			} else {
				if(func.type == "procedure") fail(f.quote`Procedure ${expr.functionName} does not return a value.`, expr.functionName);
				const statement = func.controlStatements[0];
				const output = this.callFunction(func, expr.args, true);
				return this.finishEvaluation(output, this.resolveVariableType(statement.returnType), type);
			}
		}
		if(expr instanceof ExpressionASTClassInstantiationNode){
			if(type == "variable" || type == "function") fail(`Expected this expression to evaluate to a ${type}, but found a class instantiation expression, which can only return a class instance, not a ${type}.`, expr);
			const clazz = this.getClass(expr.className.text, expr.className.range) as ClassVariableType<true>;
			const output = clazz.construct(this, expr.args);
			return this.finishEvaluation(output, clazz, type);
		}

		//Operator that returns a result of unknown type
		if(expr.operator.category == "special"){
			switch(expr.operator){
				case operators.access:
					return this.processRecordAccess(expr, type);
				case operators.pointer_reference: {
					if(type == "variable" || type == "function") fail(`Expected this expression to evaluate to a ${type}, but found a referencing expression, which returns a pointer`, expr);
					if(type && !(type instanceof PointerVariableType)) fail(f.quote`Expected result to be of type ${type}, but the reference operator will return a pointer`, expr);
					const [variable, err] = tryRun(() => this.evaluateExpr(expr.nodes[0], "variable", true));
					if(err){
						//If the thing we're referencing couldn't be evaluated to a variable
						//create a fake variable
						const target = this.evaluateExpr(expr.nodes[0], type?.target, true);
						//Guess the type
						const pointerType = this.getPointerTypeFor(target.type) ?? fail(f.quote`Cannot find a pointer type for ${target.type}`, expr.operatorToken, expr);
						if(!configs.pointers.implicit_variable_creation.value)
							rethrow(err, m => m + `\n${configs.pointers.implicit_variable_creation.errorHelp}`);
						return this.finishEvaluation({
							type: target.type,
							declaration: "dynamic",
							mutable: true,
							value: target.value
						}, pointerType, type);
					}
					const pointerType = this.getPointerTypeFor(variable.type) ?? fail(f.quote`Cannot find a pointer type for ${variable.type}`, expr.operatorToken, expr);
					return this.finishEvaluation(variable, pointerType, type);
				}
				case operators.pointer_dereference: {
					if(type == "function") fail(`Expected this expression to evaluate to a function, but found a dereferencing expression, which cannot return a function`, expr);
					const pointerVariable = this.evaluateExpr(expr.nodes[0], undefined, true);
					if(pointerVariable.value == null) fail(`Cannot dereference uninitialized pointer`, expr.nodes[0]);
					if(!(pointerVariable.typeIs(PointerVariableType))) fail(f.quote`Cannot dereference value of type ${pointerVariable.type} because it is not a pointer`, expr.nodes[0]);
					if(type == "variable"){
						if(!pointerVariable.value.mutable) fail(`Cannot assign to constant`, expr);
						return pointerVariable.value;
					} else {
						if(pointerVariable.value.value == null) fail(f.quote`Cannot dereference ${expr.nodes[0]} and use the value, because the underlying value has not been initialized`, expr.nodes[0]);
						return this.finishEvaluation(pointerVariable.value.value, pointerVariable.type.target, type);
					}
				}
				default: impossible();
			}
		}

		if(type == "variable" || type == "function") fail(`Cannot evaluate this expression as a ${type}`, expr);

		//arithmetic
		if(type?.is("REAL", "INTEGER") || expr.operator.category == "arithmetic"){
			if(type && !(type.is("REAL", "INTEGER") || type instanceof EnumeratedVariableType))
				fail(f.quote`expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a number`, expr);

			let guessedType = (type as PrimitiveVariableType<"REAL" | "INTEGER">) ?? PrimitiveVariableType.REAL; //Use this type to evaluate the expression
			let value:number;
			//if the requested type is INTEGER, the sub expressions will be evaluated as integers and return an error if not possible
			if(expr.operator.type == "unary_prefix"){
				const operand = this.evaluateExpr(expr.nodes[0], guessedType, true);
				switch(expr.operator){
					case operators.negate:
						return TypedValue.INTEGER(-operand.value);
					default: crash("impossible");
				}
			}
			let left, right;
			if(expr.operator == operators.add || expr.operator == operators.subtract){
				left = this.evaluateExpr(expr.nodes[0], undefined, true);
				right = this.evaluateExpr(expr.nodes[1], undefined, true);
			} else {
				left = this.evaluateExpr(expr.nodes[0], guessedType, true);
				right = this.evaluateExpr(expr.nodes[1], guessedType, true);
			}

			if(left.typeIs(EnumeratedVariableType)){
				if(type && !(type instanceof EnumeratedVariableType)) fail(f.quote`expected the expression to evaluate to a value of type ${type}, but it returns an enum value`, expr);
				const other = this.coerceValue(right.value, right.type, PrimitiveVariableType.INTEGER);
				const value = left.type.values.indexOf(left.value);
				if(value == -1) crash(`enum fail`);
				if(expr.operator == operators.add){
					return this.finishEvaluation(left.type.values[value + other] ?? fail(f.text`Cannot add ${other} to enum value "${left.value}": no corresponding value in ${left.type}`, expr), left.type, type);
				} else if(expr.operator == operators.subtract){
					return this.finishEvaluation(left.type.values[value + other] ?? fail(f.text`Cannot subtract ${other} from enum value "${left.value}": no corresponding value in ${left.type}`, expr), left.type, type);
				} else fail(f.quote`Expected the expression "$rc" to evaluate to a value of type ${guessedType}, but it returns an enum value`, expr.nodes[0]);
			} else if(right.typeIs(EnumeratedVariableType)){
				if(type && !(type instanceof EnumeratedVariableType)) fail(f.quote`expected the expression to evaluate to a value of type ${type}, but it returns an enum value`, expr);
				const other = this.coerceValue(left.value, left.type, PrimitiveVariableType.INTEGER);
				const value = right.type.values.indexOf(right.value);
				if(value == -1) crash(`enum fail`);
				if(expr.operator == operators.add){
					return this.finishEvaluation(right.type.values[value + other] ?? fail(f.quote`Cannot add ${other} to ${value}: no corresponding value in ${right.type}`, expr), right.type, type);
				} else if(expr.operator == operators.subtract){
					fail(`Cannot subtract an enum value from a number`, expr);
				} else fail(f.quote`Expected the expression "$rc" to evaluate to a value of type ${guessedType}, but it returns an enum value`, expr.nodes[1]);
			} else {
				left = this.coerceValue(left.value, left.type, guessedType, expr.nodes[0]);
				right = this.coerceValue(right.value, right.type, guessedType, expr.nodes[1]);
			}

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
					if(right == 0) fail(`Division by zero`, expr.nodes[1], expr);
					value = left / right;
					if(type?.is("INTEGER"))
						fail(
`This arithmetic operation evaluated to value of type REAL, cannot be coerced to INTEGER
help: try using DIV instead of / to produce an integer as the result`, expr.operatorToken, expr
						); //CONFIG
					break;
				case operators.integer_divide:
					if(right == 0) fail(`Division by zero`, expr.nodes[1], expr);
					value = Math.trunc(left / right);
					if(!type) guessedType = PrimitiveVariableType.INTEGER;
					break;
				case operators.mod:
					if(right == 0) fail(`Division by zero`, expr.nodes[1], expr);
					value = left % right;
					break;
				default:
					fail(f.quote`Expected this expression to evaluate to a value of type ${type ?? impossible()}, but the operator ${expr.operator} produces a result of another type`, expr);
			}
			return typedValue(guessedType, value);
		}

		//logical
		if(type?.is("BOOLEAN") || expr.operator.category == "logical"){
			if(type && !type.is("BOOLEAN"))
				fail(f.quote`Expected this expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a boolean`, expr);

			if(expr.operator.type == "unary_prefix"){
				const operand = this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.BOOLEAN, true);
				switch(expr.operator){
					case operators.not: {
						return TypedValue.BOOLEAN(!operand.value);
					}
					default: crash("impossible");
				}
			}
			switch(expr.operator){
				case operators.equal_to: case operators.not_equal_to: {
					//Type is unknown
					const left = this.evaluateExpr(expr.nodes[0], undefined, true);
					const right = this.evaluateExpr(expr.nodes[1], undefined, true);
					const typesMatch =
						(left.type == right.type) ||
						(left.typeIs("INTEGER") && right.typeIs("REAL")) ||
						(left.typeIs("REAL") && right.typeIs("INTEGER"));
					const is_equal = typesMatch && (left.value == right.value);
					return TypedValue.BOOLEAN((() => {
						switch(expr.operator){
							case operators.equal_to: return is_equal;
							case operators.not_equal_to: return !is_equal;
						}
					})()!);
				}
				case operators.and: case operators.or: {
					const left = this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.BOOLEAN, true).value;
					const right = this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.BOOLEAN, true).value;
					return TypedValue.BOOLEAN((() => {
						switch(expr.operator){
							case operators.and: return left && right;
							case operators.or: return left || right;
						}
					})()!);
				}
				case operators.greater_than:
				case operators.greater_than_equal:
				case operators.less_than:
				case operators.less_than_equal: {
					const left = this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.REAL, true).value;
					const right = this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.REAL, true).value;
					return TypedValue.BOOLEAN((() => {
						switch(expr.operator){
							case operators.greater_than: return left > right;
							case operators.greater_than_equal: return left >= right;
							case operators.less_than: return left < right;
							case operators.less_than_equal: return left <= right;
						}
					})()!);
				}
				default:
					fail(f.quote`Expected the expression to evaluate to a value of type ${type!}, but the operator ${expr.operator} returns another type`, expr);
			}
		}

		//string
		if(type?.is("STRING") || expr.operator.category == "string"){
			if(type && !type.is("STRING"))
				fail(f.quote`expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a string`, expr);

			const left = this.evaluateExpr(expr.nodes[0], PrimitiveVariableType.STRING, true).value;
			const right = this.evaluateExpr(expr.nodes[1], PrimitiveVariableType.STRING, true).value;
			switch(expr.operator){
				case operators.string_concatenate:
					return TypedValue.STRING(left + right);
				default:
					fail(f.quote`Expected the expression to evaluate to a value of type ${type!}, but the operator ${expr.operator} returns another type`, expr);
			}
		}

		expr.operator.category satisfies never;
		impossible();
	}
	evaluateToken(token:Token):TypedValue;
	evaluateToken(token:Token, type:"variable"):VariableData | ConstantData;
	evaluateToken(token:Token, type:"function"):FunctionData | BuiltinFunctionData;
	evaluateToken<T extends VariableType | undefined>(token:Token, type:T):TypedValue<T extends undefined ? VariableType : T & {}>
	evaluateToken(token:Token, type?:VariableType | "variable" | "function"):TypedValue | VariableData | ConstantData | FunctionData | BuiltinFunctionData | ClassMethodCallInformation {
		if(token.type == "name"){
			if(type == "function") return this.getFunction(token);

			const enumType = this.getEnumFromValue(token.text);
			if(enumType){
				if(type == "variable") fail(f.quote`Cannot evaluate enum value ${token.text} as a variable`, token);
				return this.finishEvaluation(token.text, enumType, type);
			} else {
				const variable = this.getVariable(token.text) ?? this.handleNonexistentVariable(token.text, token.range);
				if(type == "variable") return variable;
				if(variable.value == null) fail(f.quote`Variable ${token.text} has not been initialized`, token);
				return this.finishEvaluation(variable.value, variable.type, type);
			}
		}
		if(type == "variable" || type == "function") fail(f.quote`Cannot evaluate token ${token.text} as a ${type}`, token);
		//TODO move the string conversions to VariableType
		switch(token.type){
			case "boolean.false":
				//TODO bad coercion
				if(!type || type.is("BOOLEAN")) return TypedValue.BOOLEAN(false);
				else if(type.is("STRING")) return TypedValue.STRING("FALSE");
				else fail(f.text`Cannot convert value FALSE to type ${type}`, token);
				break;
			case "boolean.true":
				if(!type || type.is("BOOLEAN")) return TypedValue.BOOLEAN(true);
				else if(type.is("STRING")) return TypedValue.STRING("TRUE");
				else fail(f.text`Cannot convert value TRUE to type ${type}`, token);
				break;
			case "number.decimal":
				if(!type || type.is("INTEGER", "REAL", "STRING")){
					const val = Number(token.text);
					if(Number.isNaN(val)) crash(`number was nan`);
					if(!Number.isFinite(val))
						fail(f.quote`Value ${token} cannot be converted to a number: too large`, token);
					if(type?.is("INTEGER")){
						if(!Number.isInteger(val))
							fail(f.quote`Value ${token} cannot be converted to an integer`, token);
						if(!Number.isSafeInteger(val))
							fail(f.quote`Value ${token} cannot be converted to an integer: too large`, token);
						return TypedValue.INTEGER(val);
					} else if(type?.is("STRING")){
						return TypedValue.STRING(token.text);
					} else {
						return TypedValue.REAL(val);
					}
				} else fail(f.quote`Cannot convert number to type ${type}`, token);
				break;
			case "string":
				if(!type || type.is("STRING")) return TypedValue.STRING(token.text.slice(1, -1)); //remove the quotes
				else fail(f.quote`Cannot convert value ${token} to type ${type}`, token);
				break;
			case "char":
				if(!type || type.is("CHAR") || type.is("STRING")) return TypedValue.CHAR(token.text.slice(1, -1)); //remove the quotes
				else fail(f.quote`Cannot convert value ${token} to type ${type}`, token);
				break;
			default: fail(f.quote`Cannot evaluate token ${token}`, token);
		}
	}
	static NotStaticError = class extends Error {};
	static evaluateToken(token:Token):TypedValue;
	static evaluateToken<T extends VariableType | undefined>(token:Token, type:T):TypedValue<T extends undefined ? VariableType : T & {}>
	static evaluateToken(token:Token, type?:VariableType):TypedValue {
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
		if(type instanceof PrimitiveVariableType) return type;
		else if(type instanceof ArrayVariableType) {
			type.init(this);
			return type as never as ArrayVariableType<true>;
		} else return this.getType(type[1]) ?? this.handleNonexistentType(type[1], type[2]);
	}
	/**
	 * Called when a class doesn't exist, used to check for capitalization and typos.
	 */
	handleNonexistentClass(name:string, range:TextRangeLike):never {
		const allClasses:(readonly [string, ClassVariableType])[] =
			[...this.activeScopes()].flatMap(s =>
				Object.entries(s.types)
					.filter((x):x is [string, ClassVariableType] => x[1] instanceof ClassVariableType)
			);

		if(this.currentlyResolvingTypeName == name)
			fail(f.quote`Class ${name} does not exist yet, it is currently being initialized`, range);
		let found;
		if((found =
			min(allClasses, t => biasedLevenshtein(t[0], name) ?? Infinity, 2.5)
		) != undefined){
			fail(f.quote`Class ${name} does not exist\nhelp: perhaps you meant ${found[1]}`, range);
		}
		fail(f.quote`Class ${name} does not exist`, range);
	}
	/**
	 * Called when a type doesn't exist, used to check for capitalization and typos.
	 */
	handleNonexistentType(name:string, range:TextRangeLike):never {
		const allTypes:(readonly [string, VariableType])[] = [
			...[...this.activeScopes()].flatMap(s => Object.entries(s.types)),
			...PrimitiveVariableType.all.map(t => [t.name, t] as const)
		];
		if(PrimitiveVariableType.get(name.toUpperCase()))
			fail(f.quote`Type ${name} does not exist\nhelp: perhaps you meant ${name.toUpperCase()} (uppercase)`, range);
		if(this.currentlyResolvingTypeName == name)
			fail(f.quote`Type ${name} does not exist yet, it is currently being initialized`, range);
		let found;
		if((found =
			min(allTypes, t => t[0] == this.currentlyResolvingPointerTypeName ? Infinity : biasedLevenshtein(t[0], name) ?? Infinity, 2.5)
		) != undefined){
			fail(f.quote`Type ${name} does not exist\nhelp: perhaps you meant ${found[1]}`, range);
		}
		fail(f.quote`Type ${name} does not exist`, range);
	}
	handleNonexistentFunction(name:string, range:TextRangeLike):never {
		const allFunctions:(readonly [string, FunctionData | BuiltinFunctionData])[] = [
			...Object.entries(this.functions),
			...Object.entries(this.builtinFunctions as Record<string, BuiltinFunctionData>),
		];
		if(this.builtinFunctions[name.toUpperCase()])
			fail(f.quote`Function ${name} does not exist\nhelp: perhaps you meant ${name.toUpperCase()} (uppercase)`, range);
		let found;
		if((found =
			min(allFunctions, t => biasedLevenshtein(t[0], name) ?? Infinity, 3)
		) != undefined){
			fail(f.quote`Function ${name} does not exist\nhelp: perhaps you meant ${found[0]}`, range);
		}
		fail(f.quote`Function ${name} does not exist`, range);
	}
	handleNonexistentVariable(name:string, range:TextRangeLike):never {
		const allVariables:string[] = [
			...[...this.activeScopes()].flatMap(s => Object.keys(s.variables)),
		];
		let found;
		if((found =
			min(allVariables, t => biasedLevenshtein(t, name) ?? Infinity, 2)
		) != undefined){
			fail(f.quote`Variable ${name} does not exist\nhelp: perhaps you meant ${found}`, range);
		}
		fail(f.quote`Variable ${name} does not exist`, range);
	}
	*activeScopes(){
		for(let i = this.scopes.length - 1; i >= 0; i--){
			yield this.scopes[i];
			if(this.scopes[i].opaque && i > 1) i = 1; //skip to the global scope
		}
		return null;
	}
	/** Returned variable may not be initialized */
	getVariable(name:string):VariableData | ConstantData | null {
		for(const scope of this.activeScopes()){
			if(scope.variables[name]) return scope.variables[name];
		}
		return null;
	}
	getType(name:string):VariableType | null {
		for(const scope of this.activeScopes()){
			if(scope.types[name]) return scope.types[name];
		}
		return null;
	}
	getEnumFromValue(name:string):EnumeratedVariableType | null {
		for(const scope of this.activeScopes()){
			const data = Object.values(scope.types)
				.find((data):data is EnumeratedVariableType => data instanceof EnumeratedVariableType && data.values.includes(name));
			if(data) return data;
		}
		return null;
	}
	getPointerTypeFor(type:VariableType):PointerVariableType | null {
		for(const scope of this.activeScopes()){
			const data = Object.values(scope.types)
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
			if((
				statement.constructor == FunctionStatement || statement.constructor == ProcedureStatement
			) && !configs.classes.delegate_access_privileges.value ) //if this setting is enabled, skip function scopes
				return false; //closest relevant statement is a function, cant access classes
			//Ignore classmethodstatement because it always has a ClassStatement just above it
		}
		return false;
	}
	getFunction({text, range}:Token):FunctionData | BuiltinFunctionData | ClassMethodCallInformation {
		if(this.classData && this.classData.clazz.allMethods[text]){
			const [clazz, method] = this.classData.clazz.allMethods[text];
			return { clazz, method, instance: this.classData.instance };
		} else return this.functions[text] ?? this.builtinFunctions[text] ?? this.handleNonexistentFunction(text, range);
	}
	getClass(name:string, range:TextRange):ClassVariableType<boolean> {
		for(const scope of this.activeScopes()){
			const type = scope.types[name];
			if(type){
				if(type instanceof ClassVariableType) return type;
				else fail(f.quote`Type ${name} is not a class, it is ${scope.types[name]}`, range);
			}
		}
		this.handleNonexistentClass(name, range);
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
	coerceValue<T extends VariableType, S extends VariableType>(value:VariableTypeMapping<T>, from:T, to:S, range?:TextRangeLike):VariableTypeMapping<S> {
		//typescript really hates this function, beware
		let assignabilityError;
		if((assignabilityError = typesAssignable(to, from)) === true) return value as never;
		let disabledConfig:Config<unknown, true> | null = null;
		if(from.is("STRING") && to.is("CHAR")){
			if(configs.coercion.string_to_char.value){
				const v = (value as VariableTypeMapping<PrimitiveVariableType<"STRING" | "CHAR">>);
				if(v.length == 1) return v as never;
				else assignabilityError = f.quote`the length of the string ${v} is not 1`;
			} else disabledConfig = configs.coercion.string_to_char;
		}
		if(from.is("INTEGER") && to.is("REAL")) return value as never;
		if(from.is("REAL") && to.is("INTEGER")) return Math.trunc(value as VariableTypeMapping<PrimitiveVariableType<"REAL" | "INTEGER">>) as never;
		if(to.is("STRING")){
			if(from.is("BOOLEAN")){
				if(configs.coercion.booleans_to_string.value) return (value as VariableTypeMapping<PrimitiveVariableType<"BOOLEAN">>).toString().toUpperCase() as never;
				else disabledConfig = configs.coercion.booleans_to_string;
			} else if(from.is("INTEGER") || from.is("REAL")){
				if(configs.coercion.numbers_to_string.value) return (value as VariableTypeMapping<PrimitiveVariableType<"INTEGER" | "REAL">>).toString() as never;
				else disabledConfig = configs.coercion.numbers_to_string;
			} else if(from.is("CHAR")){
				if(configs.coercion.char_to_string.value) return (value as VariableTypeMapping<PrimitiveVariableType<"CHAR">>).toString() as never;
				else disabledConfig = configs.coercion.char_to_string;
			} else if(from.is("DATE")){
				if(configs.coercion.numbers_to_string.value) return (value as VariableTypeMapping<PrimitiveVariableType<"INTEGER" | "REAL">>).toString() as never;
				else disabledConfig = configs.coercion.numbers_to_string;
			} else if(from instanceof ArrayVariableType){
				if(configs.coercion.arrays_to_string.value){
					if(from.elementType instanceof PrimitiveVariableType || from.elementType instanceof EnumeratedVariableType){
						(null! as VariableTypeMapping<EnumeratedVariableType>) satisfies string;
						return `[${(value as VariableTypeMapping<ArrayVariableType>).join(",")}]` as never;
					} else assignabilityError = `the type of the elements in the array does not support coercion to string`;
				} else disabledConfig = configs.coercion.arrays_to_string;
			} else if(from instanceof EnumeratedVariableType){
				if(configs.coercion.enums_to_string.value) return value as VariableTypeMapping<EnumeratedVariableType> satisfies string as never;
				else disabledConfig = configs.coercion.enums_to_string;
			}
		}
		if(from instanceof EnumeratedVariableType && (to.is("INTEGER") || to.is("REAL"))){
			if(configs.coercion.enums_to_integer.value) return from.values.indexOf(value as VariableTypeMapping<EnumeratedVariableType>) as never;
			else disabledConfig = configs.coercion.enums_to_integer;
		}
		fail(f.quote`Cannot coerce value of type ${from} to ${to}` + (
			assignabilityError ? `: ${assignabilityError}.` :
			disabledConfig ? `\nhelp: enable the config "${disabledConfig.name}" to allow this` : ""
		), range);
	}
	cloneValue<T extends VariableType>(type:T, value:VariableTypeMapping<T> | null):VariableTypeMapping<T> | null {
		if(value == null) return value;
		if(typeof value == "string") return value;
		if(typeof value == "number") return value;
		if(typeof value == "boolean") return value;
		if(value instanceof Date) return new Date(value) as VariableTypeMapping<T>;
		if(Array.isArray(value)) return value.slice().map(v =>
			this.cloneValue((type as ArrayVariableType).elementType ?? crash(`Cannot clone value in an array of unknown type`), v)
		) as VariableTypeMapping<T>;
		if(type instanceof PointerVariableType) return value; //just pass it through, because pointer data doesn't have any mutable sub items (other than the variable itself)
		if(type instanceof RecordVariableType) return Object.fromEntries(Object.entries(value)
			.map(([k, v]) => [k, this.cloneValue(type.fields[k][0], v as VariableValue)])
		) as VariableTypeMapping<RecordVariableType> as VariableTypeMapping<T>;
		if(type instanceof ClassVariableType) return {
			properties: Object.fromEntries(Object.entries((value as VariableTypeMapping<ClassVariableType>).properties)
				.map(([k, v]) => [k, this.cloneValue(type.properties[k][0], v as VariableValue)])
			),
			propertyTypes: {},
			type: (value as VariableTypeMapping<ClassVariableType>).type
		} satisfies VariableTypeMapping<ClassVariableType> as VariableTypeMapping<ClassVariableType> as VariableTypeMapping<T>;
		crash(f.quote`Cannot clone value of type ${type}`);
	}
	assembleScope(func:ProcedureStatement | FunctionStatement, args:RangeArray<ExpressionAST>){
		if(func.args.size != args.length) fail(f.quote`Incorrect number of arguments for function ${func.name}`, args);
		const scope:VariableScope = {
			statement: func,
			opaque: !(func instanceof ClassProcedureStatement || func instanceof ClassFunctionStatement),
			variables: {},
			types: {},
		};
		for(const [i, [name, {type, passMode}]] of [...func.args.entries()].entries()){
			const rType = this.resolveVariableType(type);
			if(passMode == "reference"){
				const varData = this.evaluateExpr(args[i], "variable");
				if(!typesEqual(varData.type, rType)) fail(f.quote`Expected the argument to be of type ${rType}, but it was of type ${varData.type}. Cannot coerce BYREF arguments, please change the variable's type or change the pass mode to BYVAL.`, args[i]);
				scope.variables[name] = {
					declaration: func,
					mutable: true,
					type: rType,
					get value(){ return varData.value ?? fail(`Variable (passed by reference) has not been initialized`, args[i]); },
					set value(value){ varData.value = value; }
				};
			} else {
				const { type, value } = this.evaluateExpr(args[i], rType);
				if(type instanceof ArrayVariableType && !type.lengthInformation) crash(f.quote`evaluateExpr returned an array type of unspecified length at evaluating ${args[i]}`);
				scope.variables[name] = {
					declaration: func,
					mutable: true,
					type,
					value: this.cloneValue(rType, value)
				};
			}
		}
		return scope;
	}
	callFunction<T extends boolean>(funcNode:FunctionData, args:RangeArray<ExpressionAST>, requireReturnValue?:T):VariableValue | (T extends false ? null : never) {
		const func = funcNode.controlStatements[0];
		if(func instanceof ProcedureStatement && requireReturnValue)
			fail(`Cannot use return value of ${func.name}() as it is a procedure`, undefined);

		const scope = this.assembleScope(func, args);
		const output = this.runBlock(funcNode.nodeGroups[0], scope);
		if(func instanceof ProcedureStatement){
			//requireReturnValue satisfies false;
			return null as never;
		} else { //must be functionstatement
			if(!output) fail(f.quote`Function ${func.name} did not return a value`, undefined); //TODO create rangeExternal and set it to funcNode.nodeGroups[0] here
			return output.value;
		}
	}
	callClassMethod<T extends boolean>(method:ClassMethodData, clazz:ClassVariableType, instance:VariableTypeMapping<ClassVariableType>, args:RangeArray<ExpressionAST>, requireReturnValue?:T):(
		T extends false ? null :
		T extends undefined ? TypedValue | null :
		T extends true ? TypedValue :
		never
	) {
		const func = method.controlStatements[0];
		if(func instanceof ClassProcedureStatement && requireReturnValue === true)
			fail(`Cannot use return value of ${func.name}() as it is a procedure`, undefined);
		if(func instanceof ClassFunctionStatement && requireReturnValue === false && !configs.statements.call_functions.value)
			fail(`CALL cannot be used on functions according to Cambridge.\n${configs.statements.call_functions.errorHelp}`, undefined);

		const classScope = instance.type.getScope(this, instance);
		const methodScope = this.assembleScope(func, args);
		const previousClassData = this.classData;
		this.classData = {instance, method, clazz};
		const output = this.runBlock(method.nodeGroups[0], classScope, methodScope);
		this.classData = previousClassData;
		if(func instanceof ClassProcedureStatement){
			//requireReturnValue satisfies false;
			return null as never;
		} else { //must be functionstatement
			if(!output) fail(f.quote`Function ${func.name} did not return a value`, undefined);
			return typedValue(this.resolveVariableType(func.returnType), output.value) as never;
		}
	}
	callBuiltinFunction(fn:BuiltinFunctionData, args:RangeArray<ExpressionAST>, returnType?:VariableType):TypedValue {
		if(fn.args.size != args.length) fail(f.quote`Incorrect number of arguments for function ${fn.name}`, undefined);
		if(!fn.returnType) fail(f.quote`Builtin function ${fn.name} does not return a value`, undefined);
		const evaluatedArgs:[VariableValue, TextRange][] = [];
		let i = 0;
		nextArg:
		for(const {type} of fn.args.values()){
			const errors:SoodocodeError[] = [];
			for(const possibleType of type){
				if(tryRunOr(() => {
					evaluatedArgs.push([this.evaluateExpr(args[i], possibleType).value, args[i].range]);
					i ++;
				}, err => errors.push(err)))
					continue nextArg;
			}
			throw errors.at(-1);
		}
		const processedArgs:RangeAttached<BoxPrimitive<VariableValue>>[] =
			evaluatedArgs.map(([value, range]) =>
				//Attach the range to the values
				Object.assign(boxPrimitive(value), {range})
			);
		if(returnType) return typedValue(returnType, this.coerceValue(fn.impl.apply(this, processedArgs), fn.returnType, returnType));
		else return typedValue(fn.returnType, fn.impl.apply(this, processedArgs));
	}
	runBlock(code:ProgramASTNode[], ...scopes:VariableScope[]):void | {
		type: "function_return";
		value: VariableValue;
	}{
		this.scopes.push(...scopes);
		let returned:null | VariableValue = null;
		const {typeNodes, constants, others} = groupArray(code, c =>
			(c instanceof TypeStatement ||
			c instanceof ProgramASTBranchNode && c.controlStatements[0] instanceof TypeStatement) ? "typeNodes" :
			c instanceof ConstantStatement ? "constants" :
			"others"
		, ["constants", "others", "typeNodes"]) as {
			typeNodes: (TypeStatement | (ProgramASTBranchNode & {controlStatements: [TypeStatement]}))[],
			constants: ConstantStatement[],
			others: ProgramASTNode[]
		};
		//First types: run constants
		for(const node of constants){
			node.run(this);
		}
		//Second pass: initialize types
		const types: [name:string, type:VariableType<boolean>][] = [];
		for(const node of typeNodes){
			let name, type;
			if(node instanceof Statement){
				[name, type] = node.createType(this);
			} else {
				[name, type] = node.controlStatements[0].createTypeBlock(this, node);
			}
			if(this.getCurrentScope().types[name]) fail(f.quote`Type ${name} was defined twice`, node);
			this.getCurrentScope().types[name] = type as VariableType<any>; //it will get initialized later
			types.push([name, type]);
		}
		//Third pass: resolve types
		for(const [name, type] of types){
			this.currentlyResolvingTypeName = name;
			if(type instanceof PointerVariableType) this.currentlyResolvingPointerTypeName = name;
			type.init(this);
			this.currentlyResolvingPointerTypeName = null;
		}
		this.currentlyResolvingTypeName = null;
		//Fourth pass: check type size
		for(const [name, type] of types){
			type.validate(this);
		}
		//Fifth pass: everything else
		for(const node of others){
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
			opaque: true,
			variables: {},
			types: {}
		});

		for(const [name, file] of Object.entries(this.openFiles)){
			if(file == undefined) delete this.openFiles[name];
			else fail(f.quote`File ${name} was not closed`, file.openRange);
		}
	}
	getOpenFile(filename:string):OpenedFile;
	getOpenFile<T extends FileMode>(filename:string, modes:T[], operationDescription:string):OpenedFileOfType<T>;
	getOpenFile(filename:string, modes?:FileMode[], operationDescription?:string):OpenedFile {
		const data = (this.openFiles[filename] ?? fail(f.quote`File ${filename} is not open or does not exist.`, undefined));
		if(modes && operationDescription && !modes.includes(data.mode))
			fail(f.quote`${operationDescription} requires the file to have been opened with mode ${modes.map(m => `"${m}"`).join(" or ")}, but the mode is ${data.mode}`, undefined);
		return data;
	}
}
