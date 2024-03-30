/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the runtime, which executes the program AST.
*/


import { builtinFunctions } from "./builtin_functions.js";
import { Token } from "./lexer-types.js";
import {
	ProgramASTBranchNode, ProgramASTNode, ExpressionASTBranchNode, ExpressionAST, ArrayVariableType,
	ExpressionASTNode
} from "./parser-types.js";
import { operators } from "./parser.js";
import {
	ProcedureStatement, Statement, ConstantStatement, DeclarationStatement, ForStatement,
	FunctionStatement, FunctionArguments
} from "./statements.js";
import { crash, errorBoundary, fail, fquote } from "./utils.js";

/**Stores the JS type used for each pseudocode variable type */
export type VariableTypeMapping<T> =
	T extends "INTEGER" ? number :
	T extends "REAL" ? number :
	T extends "STRING" ? string :
	T extends "CHAR" ? string :
	T extends "BOOLEAN" ? boolean :
	T extends "DATE" ? Date :
	T extends ArrayVariableType ? Array<VariableTypeMapping<T["type"]> | null> ://Arrays are initialized to all nulls, TODO confirm: does cambridge use INTEGER[]s being initialized to zero?
	T extends RecordVariableType ? Record<string, unknown> :
	T extends PointerVariableType ? VariableData<T["target"]> | ConstantData<T["target"]> :
	T extends EnumeratedVariableType ? string :
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
export class RecordVariableType {
	constructor(
		public name: string,
		public fields: Record<string, VariableType>,
	){}
	toString(){
		return fquote`record type ${this.name}`;
	}
};
export class PointerVariableType {
	constructor(
		public name: string,
		public target: VariableType
	){}
	toString():string {
		return fquote`pointer type ${this.name} (^${this.target})`;
	}
}
export class EnumeratedVariableType {
	constructor(
		public name: string,
		public values: string[]
	){}
	toString(){
		return fquote`enumerated type ${this.name}`;
	}
}

//TODO refactor this to support pointers, user defined records, etc
export type VariableType =
	| PrimitiveVariableType
	| ArrayVariableType
	| RecordVariableType
	| PointerVariableType
	| EnumeratedVariableType
;
export type VariableValue = VariableTypeMapping<VariableType>;

type FileMode = "READ" | "WRITE" | "APPEND";

interface FileData {
	name: string;
	text: string;
	/** If null, the file has not been opened, or has been closed. */
	mode: FileMode | null;
}

export type VariableData<T extends VariableType = VariableType, Initialized = false> = {
	type: T;
	/** Null indicates that the variable has not been initialized */
	value: VariableTypeMapping<T> | (Initialized extends false ? null : never);
	declaration: DeclarationStatement | FunctionStatement | ProcedureStatement;
	mutable: true;
}
export type ConstantData<T extends VariableType = VariableType> = {
	type: T;
	/** Cannot be null */
	value: VariableTypeMapping<T>;
	declaration: ConstantStatement | ForStatement | FunctionStatement | ProcedureStatement;
	mutable: false;
}
/** Either a function or a procedure TODO cleanup */
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
	args:FunctionArguments;
	returnType:VariableType | null;
	name:string;
	impl: (...args:VariableValue[]) => VariableValue;
};


export type VariableScope = {
	statement: Statement | "global";
	variables: Record<string, VariableData | ConstantData>;
	types: Record<string, VariableType>;
};

export class Runtime {
	scopes: VariableScope[] = [{
		statement: "global",
		variables: {},
		types: {}
	}];
	functions: Record<string, FunctionData> = {};
	types: Record<string, VariableData> = {};
	files: Record<string, FileData> = {};
	constructor(
		public _input: (message:string) => string,
		public _output: (message:string) => void,
	){}
	processArrayAccess(expr:ExpressionASTBranchNode, operation:"get", type?:VariableType):[type:VariableType, value:VariableValue];
	processArrayAccess(expr:ExpressionASTBranchNode, operation:"set", value:ExpressionAST):void;
	@errorBoundary
	processArrayAccess(expr:ExpressionASTBranchNode, operation:"get" | "set", arg2?:VariableType | ExpressionAST):[type:VariableType, value:VariableValue] | void {

		//Make sure the variable exists and is an array
		const _variable = this.getVariable(expr.operatorToken.text);
		if(!_variable) fail(`Undeclared variable ${expr.operatorToken.text}`, expr.operatorToken);
		if(!(_variable.type instanceof ArrayVariableType)) fail(`Cannot convert variable of type ${_variable.type} to an array`, expr.operatorToken);
		const variable = _variable as VariableData<ArrayVariableType, true>;
		const varTypeData = variable.type;

		//TODO is there any way of getting a 1D array out of a 2D array?
		//Forbids getting any arrays from arrays
		if(arg2 instanceof ArrayVariableType)
			fail(`Cannot evaluate expression starting with "array access": expected the expression to evaluate to a value of type ${arg2}, but the operator produces a result of type ${varTypeData.type}`, expr.operatorToken);

		if(expr.nodes.length != variable.type.lengthInformation.length)
			fail(
`Cannot evaluate expression starting with "array access": \
${variable.type.lengthInformation.length}-dimensional array requires ${variable.type.lengthInformation.length} indices, \
but found ${expr.nodes.length} indices`,
				expr.nodes
			);
		const indexes:[ExpressionASTNode, number][] = expr.nodes.map(e => [e, this.evaluateExpr(e, "INTEGER")[1]]);
		let invalidIndexIndex;
		if(
			(invalidIndexIndex = indexes.findIndex(([expr, value], index) =>
				value > varTypeData.lengthInformation[index][1] ||
				value < varTypeData.lengthInformation[index][0])
			) != -1
		) fail(`Array index out of bounds: value ${indexes[invalidIndexIndex][1]} was not in range (${varTypeData.lengthInformation[invalidIndexIndex].join(" to ")})`, indexes[invalidIndexIndex][0]);
		const index = indexes.reduce((acc, [e, value], index) => (acc + value - varTypeData.lengthInformation[index][0]) * (index == indexes.length - 1 ? 1 : varTypeData.arraySizes[index]), 0);
		if(index >= variable.value.length) crash(`Array index bounds check failed`);
		if(operation == "get"){
			const type = arg2 as VariableType;
			const output = variable.value[index];
			if(output == null) fail(`Cannot use the value of uninitialized variable ${expr.operatorToken.text}[${indexes.map(([name, val]) => val).join(", ")}]`, expr.operatorToken);
			if(type) return [type, this.coerceValue(output, variable.type.type, type)];
			else return [variable.type.type, output];
		} else {
			(variable.value as Array<VariableValue>)[index] = this.evaluateExpr(arg2 as ExpressionAST, varTypeData.type)[1];
		}
	}
	evaluateExpr(expr:ExpressionAST):[type:VariableType, value:VariableValue];
	evaluateExpr<T extends VariableType | undefined>(expr:ExpressionAST, type:T):[type:T, value:VariableTypeMapping<T>];
	evaluateExpr(expr:ExpressionAST, type?:VariableType):[type:VariableType, value:VariableValue] {

		if(expr instanceof Token)
			return this.evaluateToken(expr, type);

		//Branch node

		//Special cases
		switch(expr.operator){
			case "array access":
				return this.processArrayAccess(expr, "get", type);
			case "function call":
				const fn = this.getFunction(expr.operatorToken.text);
				if("name" in fn){
					const output = this.callBuiltinFunction(fn, expr.nodes);
					if(type) return [type, this.coerceValue(output[1], output[0], type)];
					else return output;
				} else {
					if(fn.type == "procedure") fail(`Procedure ${expr.operatorToken.text} does not return a value.`);
					const statement = fn.controlStatements[0];
					const output = this.callFunction(fn, expr.nodes, true);
					if(type) return [type, this.coerceValue(output, statement.returnType, type)];
					else return [statement.returnType, output];
				}
		}

		//arithmetic
		if(type == "REAL" || type == "INTEGER" || expr.operator.category == "arithmetic"){
			if(type && !(type == "REAL" || type == "INTEGER"))
				fail(`Cannot evaluate expression starting with ${expr.operator.name}: expected the expression to evaluate to a value of type ${type}, but the operator produces a numeric result`);

			const guessedType = type ?? "REAL"; //Use this type to evaluate the expression
			let value:number;
			//if the requested type is INTEGER, the sub expressions will be evaluated as integers and return an error if not possible
			if(expr.operator.unary){
				const [operandType, operand] = this.evaluateExpr(expr.nodes[0], guessedType);
				switch(expr.operator){
					case operators.negate:
						return ["INTEGER", -operand];
					default: crash("impossible");
				}
			}
			const [leftType, left] = this.evaluateExpr(expr.nodes[0], guessedType);
			const [rightType, right] = this.evaluateExpr(expr.nodes[1], guessedType);
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
						);
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
					fail(`Cannot evaluate expression starting with ${expr.operator.name}: expected the expression to evaluate to a value of type ${type}, but the operator produces a numeric result`);
			}
			return [guessedType, value];
		}

		//logical
		if(type == "BOOLEAN" || expr.operator.category == "logical"){
			if(type && !(type == "BOOLEAN"))
				fail(`Cannot evaluate expression starting with ${expr.operator.name}: expected the expression to evaluate to a value of type ${type}, but the operator produces a boolean result`);

			if(expr.operator.unary){
				switch(expr.operator){
					case operators.not:
						return ["BOOLEAN", !this.evaluateExpr(expr.nodes[0], "BOOLEAN")[1]];
					default: crash("impossible");
				}
			}
			switch(expr.operator){
				case operators.and:
					return ["BOOLEAN", this.evaluateExpr(expr.nodes[0], "BOOLEAN")[1] && this.evaluateExpr(expr.nodes[1], "BOOLEAN")[1]];
				case operators.or:
					return ["BOOLEAN", this.evaluateExpr(expr.nodes[0], "BOOLEAN")[1] || this.evaluateExpr(expr.nodes[1], "BOOLEAN")[1]];
				case operators.equal_to:
				case operators.not_equal_to:
					//Type is unknown
					const [leftType, left] = this.evaluateExpr(expr.nodes[0]);
					const [rightType, right] = this.evaluateExpr(expr.nodes[1]);
					const typesMatch =
						(leftType == rightType) ||
						(leftType == "INTEGER" && rightType == "REAL") ||
						(leftType == "REAL" && rightType == "INTEGER");
					const is_equal = typesMatch && (left == right);
					if(expr.operator == operators.equal_to) return ["BOOLEAN", is_equal];
					else return ["BOOLEAN", !is_equal];
				case operators.greater_than:
					return ["BOOLEAN", this.evaluateExpr(expr.nodes[0], "REAL")[1] > this.evaluateExpr(expr.nodes[1], "REAL")[1]];
				case operators.greater_than_equal:
					return ["BOOLEAN", this.evaluateExpr(expr.nodes[0], "REAL")[1] >= this.evaluateExpr(expr.nodes[1], "REAL")[1]];
				case operators.less_than:
					return ["BOOLEAN", this.evaluateExpr(expr.nodes[0], "REAL")[1] < this.evaluateExpr(expr.nodes[1], "REAL")[1]];
				case operators.less_than_equal:
					return ["BOOLEAN", this.evaluateExpr(expr.nodes[0], "REAL")[1] <= this.evaluateExpr(expr.nodes[1], "REAL")[1]];
				default:
					fail(`Cannot evaluate expression starting with ${expr.operator}: expected the expression to evaluate to a value of type ${type}`);
			}
		}

		//string
		if(type == "STRING" || expr.operator.category == "string"){
			if(type && !(type == "STRING"))
				fail(`Cannot evaluate expression starting with ${expr.operator.name}: expected the expression to evaluate to a value of type ${type}, but the operator produces a string result`);
			switch(expr.operator){
				case operators.string_concatenate:
					return ["STRING", this.evaluateExpr(expr.nodes[0], "STRING")[1] + this.evaluateExpr(expr.nodes[1], "STRING")[1]];
				default:
					fail(`Cannot evaluate expression starting with ${expr.operator}: expected the expression to evaluate to a value of type ${type}`);
			}
		}

		crash(`This should not be possible`);
	}
	evaluateToken(token:Token, type?:VariableType):[type:VariableType, value:VariableValue] {
		switch(token.type){
			case "boolean.false":
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
			case "name":
				const enumType = this.getEnum(token.text);
				if(enumType){
					if(!type || type === enumType) return [enumType, token.text];
					else fail(fquote`Cannot convert value of type ${enumType} to ${type}`);
				} else {
					const variable = this.getVariable(token.text);
					if(!variable) fail(`Undeclared variable ${token.text}`);
					if(variable.value == null) fail(`Cannot use the value of uninitialized variable ${token.text}`);
					if(type) return [type, this.coerceValue(variable.value, variable.type, type)];
					else return [variable.type, variable.value];
				}
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
	/** Returned variable may not be initialized */
	getVariable(name:string):VariableData | ConstantData | null {
		for(let i = this.scopes.length - 1; i >= 0; i--){
			if(this.scopes[i].variables[name]) return this.scopes[i].variables[name];
		}
		return null;
	}
	getEnum(name:string):EnumeratedVariableType | null {
		for(let i = this.scopes.length - 1; i >= 0; i--){
			const data = Object.values(this.scopes[i].types)
				.find((data):data is EnumeratedVariableType => data instanceof EnumeratedVariableType && data.values.includes(name))
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
		if(from as any == to) return value as any;
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
			scope.variables[name] = {
				declaration: func,
				mutable: passMode == "reference",
				type,
				value: this.evaluateExpr(args[i], type)[1]
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
		for(const {type} of fn.args.values()){
			processedArgs.push(this.evaluateExpr(args[i], type)[1]);
			i ++;
		}
		//TODO maybe coerce the value?
		return [fn.returnType, fn.impl(...processedArgs) as VariableValue];
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
}
