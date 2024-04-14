/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the runtime, which executes the program AST.
*/


import { builtinFunctions } from "./builtin_functions.js";
import { Token } from "./lexer-types.js";
import {
	ProgramASTBranchNode, ProgramASTNode, ExpressionASTBranchNode, ExpressionAST,
	ExpressionASTNode, ExpressionASTArrayAccessNode, ExpressionASTFunctionCallNode
} from "./parser-types.js";
import { operators } from "./parser.js";
import {
	ProcedureStatement, Statement, ConstantStatement, DeclareStatement, ForStatement,
	FunctionStatement, DefineStatement, BuiltinFunctionArguments
} from "./statements.js";
import { SoodocodeError, crash, errorBoundary, fail, fquote, impossible } from "./utils.js";

//TODO: fix coercion
//CONFIG: array initialization

/**Stores the JS type used for each pseudocode variable type */
export type VariableTypeMapping<T> =
	T extends "INTEGER" ? number :
	T extends "REAL" ? number :
	T extends "STRING" ? string :
	T extends "CHAR" ? string :
	T extends "BOOLEAN" ? boolean :
	T extends "DATE" ? Date :
	T extends ArrayVariableType ? Array<VariableTypeMapping<ArrayElementVariableType> | null> :
	T extends RecordVariableType ? Record<string, unknown> : //replacing "unknown" with VariableTypeMapping<any> breaks ts
	T extends PointerVariableType ? VariableData<T["target"]> | ConstantData<T["target"]> :
	T extends EnumeratedVariableType ? string :
	T extends SetVariableType ? Array<VariableTypeMapping<PrimitiveVariableType>> :
	never
;


export type PrimitiveVariableTypeName =
	| "INTEGER"
	| "REAL"
	| "STRING"
	| "CHAR"
	| "BOOLEAN"
	| "DATE"
;

export type PrimitiveVariableType = PrimitiveVariableTypeName;
/** Contains data about an array type. Processed from an ExpressionASTArrayTypeNode. */
export class ArrayVariableType {
	totalLength:number;
	arraySizes:number[];
	constructor(
		public lengthInformation: [low:number, high:number][],
		public type: Exclude<UnresolvedVariableType, ArrayVariableType>,
	){
		if(this.lengthInformation.some(b => b[1] < b[0])) fail(`Invalid length information: upper bound cannot be less than lower bound`);
		if(this.lengthInformation.some(b => b.some(n => !Number.isSafeInteger(n)))) fail(`Invalid length information: bound was not an integer`);
		this.arraySizes = this.lengthInformation.map(b => b[1] - b[0] + 1);
		this.totalLength = this.arraySizes.reduce((a, b) => a * b, 1);
	}
	toString(){
		return `ARRAY[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}] OF ${this.type}`;
	}
	toQuotedString(){
		return `ARRAY[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}] OF ${this.type}`;
	}
	getInitValue(runtime:Runtime):VariableTypeMapping<ArrayVariableType> {
		const type = runtime.resolveVariableType(this.type);
		if(type instanceof ArrayVariableType) crash(`Attempted to initialize array of arrays`);
		return Array.from({length: this.totalLength}, () => typeof type == "string" ? null : type.getInitValue(runtime) as VariableTypeMapping<ArrayElementVariableType> | null);
	}
}
export class RecordVariableType {
	constructor(
		public name: string,
		public fields: Record<string, VariableType>,
	){}
	toString(){
		return `${this.name} (user-defined record type)`;
	}
	toQuotedString(){
		return fquote`${this.name} (user-defined record type)`;
	}
	getInitValue(runtime:Runtime):VariableValue | null {
		return Object.fromEntries(Object.entries(this.fields).map(([k, v]) => [k, v]).map(([k, v]) => [k,
			typeof v == "string" ? null : v.getInitValue(runtime)
		]));
	}
};
export class PointerVariableType {
	constructor(
		public name: string,
		public target: VariableType
	){}
	toString():string {
		return `${this.name} (user-defined pointer type ^${this.target})`;
	}
	toQuotedString():string {
		return fquote`${this.name} (user-defined pointer type ^${this.target})`;
	}
	getInitValue(runtime:Runtime):VariableValue | null {
		return null;
	}
}
export class EnumeratedVariableType {
	constructor(
		public name: string,
		public values: string[]
	){}
	toString(){
		return `${this.name} (user-defined enumerated type)`;
	}
	toQuotedString(){
		return fquote`${this.name} (user-defined enumerated type)`;
	}
	getInitValue(runtime:Runtime):VariableValue | null {
		return null;
	}
}
export class SetVariableType {
	constructor(
		public name: string,
		public baseType: PrimitiveVariableType,
	){}
	toString(){
		return `${this.name} (user-defined set type containing ${this.baseType})`
	}
	toQuotedString(){
		return fquote`${this.name} (user-defined set type containing ${this.baseType})`
	}
	getInitValue(runtime:Runtime):VariableValue | null {
		fail(`Cannot declare a set variable with the DECLARE statement, please use the DEFINE statement`);
	}
}

export function typesEqual(a:VariableType, b:VariableType):boolean {
	return a == b ||
		(a instanceof ArrayVariableType && b instanceof ArrayVariableType && a.arraySizes.toString() == b.arraySizes.toString() && (
			a.type == b.type ||
			Array.isArray(a.type) && Array.isArray(b.type) && a.type[1] == b.type[1]
		)) ||
		(a instanceof PointerVariableType && b instanceof PointerVariableType && typesEqual(a.target, b.target)) ||
		(a instanceof SetVariableType && b instanceof SetVariableType && a.baseType == b.baseType)
	;
}

export type UnresolvedVariableType =
	| PrimitiveVariableType
	| ArrayVariableType
	| ["unresolved", name:string]
;
export type VariableType =
	| PrimitiveVariableType
	| ArrayVariableType
	| RecordVariableType
	| PointerVariableType
	| EnumeratedVariableType
	| SetVariableType
;
export type ArrayElementVariableType = PrimitiveVariableType | RecordVariableType | PointerVariableType | EnumeratedVariableType;
export type VariableValue = VariableTypeMapping<any>;

export type FileMode = "READ" | "WRITE" | "APPEND" | "RANDOM";
export type File = {
	name: string;
	text: string;
}
export type OpenedFile = {
	file: File;
	mode: FileMode;
} & ({
	mode: "READ";
	lines: string[];
	lineNumber: number;
} | {
	mode: "WRITE" | "APPEND" | "RANDOM";
})

export type VariableData<T extends VariableType = VariableType, /** Set this to never for initialized */ Uninitialized = null> = {
	type: T;
	/** Null indicates that the variable has not been initialized */
	value: VariableTypeMapping<T> | Uninitialized;
	declaration: DeclareStatement | FunctionStatement | ProcedureStatement | DefineStatement | "dynamic";
	mutable: true;
}
export type ConstantData<T extends VariableType = VariableType> = {
	type: T;
	/** Cannot be null */
	value: VariableTypeMapping<T>;
	declaration: ConstantStatement | ForStatement | FunctionStatement | ProcedureStatement;
	mutable: false;
}
/** Either a function or a procedure */
export type FunctionData = ProgramASTBranchNode & {
	nodeGroups: [body:ProgramASTNode[]];
} & ({
	type: "function";
	controlStatements: [start:FunctionStatement, end:Statement];
} | {
	type: "procedure";
	controlStatements: [start:ProcedureStatement, end:Statement];
});
export type BuiltinFunctionData = {
	args:BuiltinFunctionArguments;
	returnType:VariableType | null;
	name:string;
	impl: (...args:VariableValue[]) => VariableValue;
};


export type VariableScope = {
	statement: Statement | "global";
	variables: Record<string, VariableData | ConstantData>;
	types: Record<string, VariableType>;
};

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
		this.files = JSON.parse(this.backupFiles ?? fail(`No backup to load`));
	}
}

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
		if(!(_variable.type instanceof ArrayVariableType)) fail(`Cannot convert variable of type ${_variable.type} to an array`, expr.target);
		const variable = _variable as VariableData<ArrayVariableType, never>;
		const varTypeData = variable.type;

		//TODO is there any way of getting a 1D array out of a 2D array?
		//Forbids getting any arrays from arrays
		if(arg2 instanceof ArrayVariableType)
			fail(`Cannot evaluate expression starting with "array access": expected the expression to evaluate to a value of type ${arg2}, but the operator produces a result of type ${varTypeData.type}`, expr.target);

		if(expr.indices.length != variable.type.lengthInformation.length)
			fail(
`Cannot evaluate expression starting with "array access": \
${variable.type.lengthInformation.length}-dimensional array requires ${variable.type.lengthInformation.length} indices, \
but found ${expr.indices.length} indices`,
				expr.indices
			);
		const indexes:[ExpressionASTNode, number][] = expr.indices.map(e => [e, this.evaluateExpr(e, "INTEGER")[1]]);
		let invalidIndexIndex;
		if(
			(invalidIndexIndex = indexes.findIndex(([expr, value], index) =>
				value > varTypeData.lengthInformation[index][1] ||
				value < varTypeData.lengthInformation[index][0])
			) != -1
		) fail(
`Array index out of bounds: \
value ${indexes[invalidIndexIndex][1]} was not in range \
(${varTypeData.lengthInformation[invalidIndexIndex].join(" to ")})`,
			indexes[invalidIndexIndex][0]);
		const index = indexes.reduce((acc, [e, value], index) =>
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
			if(output == null) fail(`Cannot use the value of uninitialized variable ${expr.target.getText()}[${indexes.map(([name, val]) => val).join(", ")}]`, expr.target);
			if(type) return [type, this.coerceValue(output, this.resolveVariableType(varTypeData.type), type)];
			else return [this.resolveVariableType(varTypeData.type), output];
		} else {
			(variable.value as Array<VariableValue>)[index] = this.evaluateExpr(arg2 as ExpressionAST, this.resolveVariableType(varTypeData.type))[1];
		}
	}
	processRecordAccess(expr:ExpressionASTBranchNode, operation:"get", type?:VariableType):[type:VariableType, value:VariableValue];
	processRecordAccess(expr:ExpressionASTBranchNode, operation:"get", type:"variable"):VariableData | ConstantData;
	processRecordAccess(expr:ExpressionASTBranchNode, operation:"get", type?:VariableType | "variable"):[type:VariableType, value:VariableValue] | VariableData | ConstantData;
	processRecordAccess(expr:ExpressionASTBranchNode, operation:"set", value:ExpressionAST):void;
	@errorBoundary()
	processRecordAccess(expr:ExpressionASTBranchNode, operation:"get" | "set", arg2?:VariableType | "variable" | ExpressionAST):[type:VariableType, value:VariableValue] | VariableData | ConstantData | void {
		//this code is terrible
		//note to self:
		//do not use typescript overloads like this
		//the extra code DRYness is not worth it
		if(!(expr.nodes[1] instanceof Token)) impossible();
		const property = expr.nodes[1].text;
		
		if(operation == "set" || arg2 == "variable"){
			const variable = this.evaluateExpr(expr.nodes[0], "variable");
			if(!(variable.type instanceof RecordVariableType)) fail(fquote`Cannot access property ${property} on variable of type ${variable.type} because it is not a record type and cannot have proprties`, expr.nodes[0]);
			const outputType = variable.type.fields[property] ?? fail(fquote`Property ${property} does not exist on type ${variable.type}`, expr.nodes[1]);
			if(arg2 == "variable"){
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
			}
			const value = arg2 as ExpressionAST;
			(variable.value as Record<string, unknown>)[property] = this.evaluateExpr(value, outputType)[1];
		} else {
			const type = arg2 as VariableType;
			const [objType, obj] = this.evaluateExpr(expr.nodes[0]);
			if(!(objType instanceof RecordVariableType)) fail(fquote`Cannot access property on value of type ${objType} because it is not a record type and cannot have proprties`, expr.nodes[0]);
			const outputType = objType.fields[property] ?? fail(fquote`Property ${property} does not exist on value of type ${objType}`, expr.nodes[1]);
			const value = (obj as Record<string, VariableValue>)[property];
			if(value === null) fail(`Cannot use the value of uninitialized variable ${expr.nodes[0].toString()}.${property}`, expr.nodes[1]);
			if(type) return [type, this.coerceValue(value, outputType, type)];
			else return [outputType, value];
		}

	}
	evaluateExpr(expr:ExpressionAST):[type:VariableType, value:VariableValue];
	evaluateExpr(expr:ExpressionAST, undefined:undefined, recursive:boolean):[type:VariableType, value:VariableValue];
	evaluateExpr(expr:ExpressionAST, type:"variable", recursive?:boolean):VariableData | ConstantData;
	evaluateExpr<T extends VariableType | undefined>(expr:ExpressionAST, type:T, recursive?:boolean):[type:T & {}, value:VariableTypeMapping<T>];
	@errorBoundary({
		predicate: (expr, type, recursive) => !recursive,
		message: () => `Cannot evaluate expression $rc: `
	})
	evaluateExpr(expr:ExpressionAST, type?:VariableType | "variable", recursive = false):[type:VariableType, value:unknown] | VariableData | ConstantData {
		if(expr == undefined) crash(`expr was ${expr}`);

		if(expr instanceof Token)
			return this.evaluateToken(expr, type as never);

		//Branch node

		//Special cases where the operator isn't a normal operator
		if(expr instanceof ExpressionASTArrayAccessNode)
			return this.processArrayAccess(expr, "get", type);
		if(expr instanceof ExpressionASTFunctionCallNode) {
			if(type == "variable") fail(fquote`Expected this expression to evaluate to a variable, but found a function call.`);
			const fn = this.getFunction(expr.functionName.text);
			if("name" in fn){
				const output = this.callBuiltinFunction(fn, expr.args);
				if(type) return [type, this.coerceValue(output[1], output[0], type)];
				else return output;
			} else {
				if(fn.type == "procedure") fail(`Procedure ${expr.functionName.text} does not return a value.`);
				const statement = fn.controlStatements[0];
				const output = this.callFunction(fn, expr.args, true);
				if(type) return [type, this.coerceValue(output, this.resolveVariableType(statement.returnType), type)];
				else return [this.resolveVariableType(statement.returnType), output];
			}
		}

		//Operator that returns a result of unknown type
		if(expr.operator.category == "special"){
			switch(expr.operator){
				case operators.access:
					return this.processRecordAccess(expr, "get", type);
				case operators.pointer_reference:
					if(type == "variable") fail(`Cannot evaluate a referencing expression as a variable`);
					if(type && !(type instanceof PointerVariableType)) fail(`Expected result to be of type ${type}, but the refernce operator will return a pointer`);
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
							const pointerType = this.getPointerTypeFor(targetType) ?? fail(fquote`Cannot find a pointer type for ${targetType}`);
							return [pointerType, {
								type: targetType,
								declaration: "dynamic",
								mutable: true,
								value: targetValue
							} satisfies VariableData];
						} else throw err;
					}
					const pointerType = this.getPointerTypeFor(variable.type) ?? fail(fquote`Cannot find a pointer type for ${variable.type}`);
					if(type) return [pointerType, this.coerceValue(variable, pointerType, type)];
					else return [pointerType, variable];
				case operators.pointer_dereference:
					let pointerVariableType:VariableType, variableValue:VariableValue | null;
					[pointerVariableType, variableValue] = this.evaluateExpr(expr.nodes[0], undefined, true);
					if(variableValue == null) fail(`Cannot dereference value because it has not been initialized`, expr.nodes[0]);
					if(!(pointerVariableType instanceof PointerVariableType)) fail(`Cannot dereference value of type ${pointerVariableType} because it is not a pointer`, expr.nodes[0]);
					const pointerVariableData = variableValue as VariableTypeMapping<PointerVariableType>;
					if(type == "variable"){
						if(!pointerVariableData.mutable) fail(`Cannot assign to constant`, expr);
						return pointerVariableData;
					} else {
						if(pointerVariableData.value == null) fail(`Cannot dereference ${expr.nodes[0]} because the underlying value has not been initialized`, expr.nodes[0]);
						if(type) return [pointerVariableType.target, this.coerceValue(pointerVariableData.value, pointerVariableType.target, type)];
						else return [pointerVariableType.target, pointerVariableData.value];
					}
				default: impossible();
			}
		}

		if(type == "variable") fail(`Cannot evaluate this expression as a variable`);

		//arithmetic
		if(type == "REAL" || type == "INTEGER" || expr.operator.category == "arithmetic"){
			if(type && !(type == "REAL" || type == "INTEGER"))
				fail(fquote`expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a number`);

			const guessedType = type ?? "REAL"; //Use this type to evaluate the expression
			let value:number;
			//if the requested type is INTEGER, the sub expressions will be evaluated as integers and return an error if not possible
			if(expr.operator.type == "unary_prefix"){
				const [operandType, operand] = this.evaluateExpr(expr.nodes[0], guessedType, true);
				switch(expr.operator){
					case operators.negate:
						return ["INTEGER", -operand];
					default: crash("impossible");
				}
			}
			const [leftType, left] = this.evaluateExpr(expr.nodes[0], guessedType, true);
			const [rightType, right] = this.evaluateExpr(expr.nodes[1], guessedType, true);
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
					if(type == "INTEGER")
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
					fail(fquote`expected the expression to evaluate to a value of type ${type ?? impossible()}, but the operator ${expr.operator} produces a result of another type`);
			}
			return [guessedType, value];
		}

		//logical
		if(type == "BOOLEAN" || expr.operator.category == "logical"){
			if(type && !(type == "BOOLEAN"))
				fail(fquote`expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a boolean`);

			if(expr.operator.type == "unary_prefix"){
				switch(expr.operator){
					case operators.not:
						return ["BOOLEAN", !this.evaluateExpr(expr.nodes[0], "BOOLEAN", true)[1]];
					default: crash("impossible");
				}
			}
			switch(expr.operator){
				case operators.and:
					return ["BOOLEAN", this.evaluateExpr(expr.nodes[0], "BOOLEAN", true)[1] && this.evaluateExpr(expr.nodes[1], "BOOLEAN", true)[1]];
				case operators.or:
					return ["BOOLEAN", this.evaluateExpr(expr.nodes[0], "BOOLEAN", true)[1] || this.evaluateExpr(expr.nodes[1], "BOOLEAN", true)[1]];
				case operators.equal_to:
				case operators.not_equal_to:
					//Type is unknown
					const [leftType, left] = this.evaluateExpr(expr.nodes[0], undefined, true);
					const [rightType, right] = this.evaluateExpr(expr.nodes[1], undefined, true);
					const typesMatch =
						(leftType == rightType) ||
						(leftType == "INTEGER" && rightType == "REAL") ||
						(leftType == "REAL" && rightType == "INTEGER");
					const is_equal = typesMatch && (left == right);
					if(expr.operator == operators.equal_to) return ["BOOLEAN", is_equal];
					else return ["BOOLEAN", !is_equal];
				case operators.greater_than:
					return ["BOOLEAN", this.evaluateExpr(expr.nodes[0], "REAL", true)[1] > this.evaluateExpr(expr.nodes[1], "REAL", true)[1]];
				case operators.greater_than_equal:
					return ["BOOLEAN", this.evaluateExpr(expr.nodes[0], "REAL", true)[1] >= this.evaluateExpr(expr.nodes[1], "REAL", true)[1]];
				case operators.less_than:
					return ["BOOLEAN", this.evaluateExpr(expr.nodes[0], "REAL", true)[1] < this.evaluateExpr(expr.nodes[1], "REAL", true)[1]];
				case operators.less_than_equal:
					return ["BOOLEAN", this.evaluateExpr(expr.nodes[0], "REAL", true)[1] <= this.evaluateExpr(expr.nodes[1], "REAL", true)[1]];
				default:
					fail(fquote`expected the expression to evaluate to a value of type ${type!}, but the operator ${expr.operator} returns another type`);
			}
		}

		//string
		if(type == "STRING" || expr.operator.category == "string"){
			if(type && !(type == "STRING"))
				fail(`expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns a string`);
			switch(expr.operator){
				case operators.string_concatenate:
					return ["STRING", this.evaluateExpr(expr.nodes[0], "STRING", true)[1] + this.evaluateExpr(expr.nodes[1], "STRING", true)[1]];
				default:
					fail(`expected the expression to evaluate to a value of type ${type}, but the operator ${expr.operator} returns another type`);
			}
		}

		expr.operator.category satisfies never;
		impossible();
	}
	evaluateToken(token:Token):[type:VariableType, value:VariableValue];
	evaluateToken(token:Token, type:"variable"):VariableData | ConstantData;
	evaluateToken<T extends VariableType | undefined>(token:Token, type:T):[type:T & {}, value:VariableTypeMapping<T>];
	evaluateToken(token:Token, type?:VariableType | "variable"):[type:VariableType, value:unknown] | VariableData | ConstantData {
		if(token.type == "name"){
			const enumType = this.getEnumFromValue(token.text);
			if(enumType){
				if(!type || type === enumType) return [enumType, token.text];
				else fail(fquote`Cannot convert value of type ${enumType} to ${type}`);
			} else {
				const variable = this.getVariable(token.text);
				if(!variable) fail(`Undeclared variable ${token.text}`);
				if(type == "variable") return variable;
				if(variable.value == null) fail(`Cannot use the value of uninitialized variable ${token.text}`);
				if(type !== undefined) return [type, this.coerceValue(variable.value, variable.type, type)];
				else return [variable.type, variable.value];
			}
		}
		if(type == "variable") fail(fquote`Cannot evaluate token ${token.text} as a variable`);
		switch(token.type){
			case "boolean.false":
				//TODO bad coercion
				if(!type || type == "BOOLEAN") return ["BOOLEAN", false];
				else if(type == "STRING") return ["STRING", "FALSE"];
				else fail(`Cannot convert value FALSE to ${type}`);
			case "boolean.true":
				if(!type || type == "BOOLEAN") return ["BOOLEAN", true];
				else if(type == "STRING") return ["STRING", "TRUE"];
				else fail(`Cannot convert value TRUE to ${type}`);
			case "number.decimal":
				if(!type || type == "INTEGER" || type == "REAL" || type == "STRING"){
					const val = Number(token.text);
					if(!Number.isFinite(val))
						fail(`Value ${token.text} cannot be converted to a number: too large`);
					if(type == "INTEGER"){
						if(type == "INTEGER" && !Number.isInteger(val))
							fail(`Value ${token.text} cannot be converted to an integer`);
						if(type == "INTEGER" && !Number.isSafeInteger(val))
							fail(`Value ${token.text} cannot be converted to an integer: too large`);
						return ["INTEGER", val];
					} else if(type == "STRING") return ["STRING", token.text];
					else {
						return ["REAL", val];
					}
				} else fail(`Cannot convert number to type ${type}`);
			case "string":
				if(!type || type == "STRING") return ["STRING", token.text.slice(1, -1)]; //remove the quotes
				else fail(`Cannot convert value ${token.text} to ${type}`);
			case "char":
				if(!type || type == "CHAR") return ["CHAR", token.text.slice(1, -1)]; //remove the quotes
				else fail(`Cannot convert value ${token.text} to ${type}`);
			default: fail(`Cannot evaluate token of type ${token.type}`);
		}
	}
	static NotStaticError = class extends Error {}
	static evaluateToken(token:Token, type?:VariableType):[type:VariableType, value:VariableValue] {
		//major shenanigans
		try {
			return this.prototype.evaluateToken.call(new Proxy({}, {
				get(){ throw new Runtime.NotStaticError(); },
			}), token, type);
		} catch(err){
			if(err instanceof Runtime.NotStaticError) fail(`Cannot evaluate token ${token} in a static context`, token);
			else throw err;
		}
	}
	resolveVariableType(type:UnresolvedVariableType):VariableType {
		if(typeof type == "string") return type;
		else if(type instanceof ArrayVariableType) return type;
		else return this.getType(type[1]) ?? fail(fquote`Type ${type[1]} does not exist`);
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
				.find((data):data is EnumeratedVariableType => data instanceof EnumeratedVariableType && data.values.includes(name))
			if(data) return data;
		}
		return null;
	}
	getPointerTypeFor(type:VariableType):PointerVariableType | null {
		for(let i = this.scopes.length - 1; i >= 0; i--){
			const data = Object.values(this.scopes[i].types)
				.find((data):data is PointerVariableType => data instanceof PointerVariableType && (
					data.target === type ||
					//Array types
					data.target instanceof ArrayVariableType && type instanceof ArrayVariableType &&
					data.target.arraySizes.join(" ") == type.arraySizes.join(" ") &&
					data.target.type.toString() == type.type.toString()
				))
			if(data) return data;
		}
		return null;
	}
	getCurrentScope():VariableScope {
		return this.scopes.at(-1) ?? crash(`No scope?`);
	}
	getFunction(name:string):FunctionData | BuiltinFunctionData {
		return this.functions[name] ?? builtinFunctions[name] ?? fail(`Function "${name}" is not defined.`);
	}
	getCurrentFunction():FunctionData | null {
		const scope = this.scopes.findLast(
			(s):s is VariableScope & { statement: FunctionStatement | ProcedureStatement } =>
			s.statement instanceof FunctionStatement || s.statement instanceof ProcedureStatement
		);
		if(!scope) return null;
		return this.functions[scope.statement.name] ?? crash(`impossible`);
	}
	coerceValue<T extends VariableType, S extends VariableType>(value:VariableTypeMapping<T>, from:T, to:S):VariableTypeMapping<S> {
		//typescript really hates this function, beware
		if(typesEqual(from, to)) return value as any;
		if(from == "STRING" && to == "CHAR") return value as any;
		if(from == "INTEGER" && to == "REAL") return value as any;
		if(from == "REAL" && to == "INTEGER") return Math.trunc(value as any) as any;
		if(to == "STRING"){
			if(from == "BOOLEAN" || from == "CHAR" || from == "DATE" || from == "INTEGER" || from == "REAL" || from == "STRING")
				return value.toString() as any;
			else if(from instanceof ArrayVariableType) return `[${(value as unknown[]).join(",")}]` as any;
		}
		fail(fquote`Cannot coerce value of type ${from} to ${to}`);
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
			.map(([k, v]) => [k, this.cloneValue(type.fields[k], v as any)])
		) as VariableTypeMapping<T>;
		crash(`cannot clone value of type ${type}`);
	}
	callFunction(funcNode:FunctionData, args:ExpressionAST[]):VariableValue | null;
	callFunction(funcNode:FunctionData, args:ExpressionAST[], requireReturnValue:true):VariableValue;
	callFunction(funcNode:FunctionData, args:ExpressionAST[], requireReturnValue = false):VariableValue | null {
		const func = funcNode.controlStatements[0];
		if(func instanceof ProcedureStatement){
			if(requireReturnValue) fail(`Cannot use return value of ${func.name}() as it is a procedure`);
		} else if(func instanceof FunctionStatement){
			//all good
		} else crash(`Invalid function ${(func as Statement).stype}`); //unreachable

		//Assemble scope
		if(func.args.size != args.length) fail(`Incorrect number of arguments for function ${func.name}`);
		const scope:VariableScope = {
			statement: func,
			variables: {},
			types: {},
		};
		let i = 0;
		for(const [name, {type, passMode}] of func.args){
			const rType = this.resolveVariableType(type);
			if(passMode == "reference"){
				const varData = this.evaluateExpr(args[i], "variable");
				if(!typesEqual(varData.type, rType)) fail(fquote`Expected the argument to be of type ${rType}, but it was of type ${varData.type}. Cannot coerce BYREF arguments, please change the variable's type.`);
				scope.variables[name] = {
					declaration: func,
					mutable: true,
					type: rType,
					get value(){ return varData.value ?? fail(`Variable (passed by reference) has not been initialized`); },
					set value(value){ varData.value = value; }
				}
			} else {
				const value = this.evaluateExpr(args[i], rType)[1];
				scope.variables[name] = {
					declaration: func,
					mutable: true,
					type: rType,
					value: this.cloneValue(rType, value)
				}
			}
			i ++;
		}
		const output = this.runBlock(funcNode.nodeGroups[0], scope);
		if(func instanceof ProcedureStatement){
			return null;
		} else { //must be functionstatement
			if(!output) fail(`Function ${func.name} did not return a value`);
			return output.value;
		}
	}
	callBuiltinFunction(fn:BuiltinFunctionData, args:ExpressionAST[], returnType?:VariableType):[type:VariableType, value:VariableValue] {
		if(fn.args.size != args.length) fail(`Incorrect number of arguments for function ${fn.name}`);
		if(!fn.returnType) fail(`Builtin function ${fn.name} did not return a value`);
		const processedArgs:VariableValue[] = [];
		let i = 0;
		nextArg:
		for(const {type} of fn.args.values()){
			let errors:SoodocodeError[] = [];
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
		if(returnType) return [returnType, this.coerceValue(fn.impl(...processedArgs), fn.returnType, returnType)];
		else return [fn.returnType, fn.impl(...processedArgs)];
	}
	runBlock(code:ProgramASTNode[], scope?:VariableScope):void | {
		type: "function_return";
		value: VariableValue;
	}{
		if(scope)
			this.scopes.push(scope);
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
		if(scope)
			this.scopes.pop() ?? crash(`Scope somehow disappeared`);
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
			else fail(`File ${filename} was not closed`);
		}
	}
}
