import { Token, TokenType } from "./lexer.js";
import { operators, type ExpressionAST, type ProgramAST, type ProgramASTTreeNode, ProgramASTNode, ProgramASTTreeNodeType } from "./parser.js";
import { ProcedureStatement, Statement, ConstantStatement, DeclarationStatement, ForStatement, FunctionStatement } from "./statements.js";
import { crash, fail } from "./utils.js";

interface FileData {
	name: string;
	text: string;
	/** If null, the file has not been opened, or has been closed. */
	mode: FileMode | null;
}

export type VariableData<T extends VariableType = VariableType> = {
	type: T;
	/** Null indicates that the variable has not been initialized */
	value: VariableTypeMapping[T] | null;
	declaration: DeclarationStatement | FunctionStatement | ProcedureStatement;
	mutable: true;
}
/** Either a function or a procedure TODO cleanup */
export type FunctionData = ProgramASTTreeNode & {
	nodeGroups: [body:ProgramASTNode[]];
} & ({
	type: "function";
	controlStatements: [start:FunctionStatement, end:Statement];
} | {
	type: "procedure";
	controlStatements: [start:ProcedureStatement, end:Statement];
});

interface ConstantData {
	type: VariableType;
	value: VariableValueType;
	declaration: ConstantStatement | ForStatement | FunctionStatement | ProcedureStatement; //TODO is this the best solution?
	mutable: false;
}

export type VariableScope = {
	statement: Statement | "global";
	variables: Record<string, VariableData | ConstantData>;
};

export class Runtime {
	scopes: VariableScope[] = [{
		statement: "global",
		variables: {}
	}];
	functions: Record<string, FunctionData> = {};
	types: Record<string, VariableData> = {};
	files: Record<string, FileData> = {};
	constructor(
		public _input: (message:string) => string,
		public _output: (message:string) => void,
	){}
	evaluateExpr(expr:ExpressionAST):[type:VariableType, value:VariableValueType];
	evaluateExpr<T extends VariableType>(expr:ExpressionAST, type:T):[type:VariableType, value:VariableTypeMapping[T]];
	evaluateExpr(expr:ExpressionAST, type?:VariableType):[type:VariableType, value:VariableValueType] {

		if(expr instanceof Token)
			return this.evaluateToken(expr, type);

		//Tree node
		switch(expr.operator){
			case "array access": crash(`Arrays are not yet supported`); //TODO arrays
			case "function call":
				const fn = this.functions[expr.operatorToken.text];
				if(!fn) fail(`Function ${expr.operatorToken.text} is not defined.`);
				if(fn.type == "procedure") fail(`Procedure ${expr.operatorToken.text} does not return a value.`);
				const statement = fn.controlStatements[0];
				const output = this.callFunction(fn, expr.nodes, true);
				if(type) return [type, this.coerceValue(output, statement.returnType, type)];
				else return [statement.returnType, output];
		}

		//arithmetic
		if(type == "REAL" || type == "INTEGER" || expr.operator.category == "arithmetic"){
			if(type && !(type == "REAL" || type == "INTEGER"))
				fail(`Cannot evaluate expression starting with ${expr.operator.type}: expected the expression to evaluate to a value of type ${type}, but the operator produces a numeric result`);
			
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
					fail(`Cannot evaluate expression starting with ${expr.operator.type}: expected the expression to evaluate to a value of type ${type}, but the operator produces a numeric result`);
			}
			return [guessedType, value];
		}

		//logical
		if(type == "BOOLEAN" || expr.operator.category == "logical"){
			if(type && !(type == "BOOLEAN"))
				fail(`Cannot evaluate expression starting with ${expr.operator.type}: expected the expression to evaluate to a value of type ${type}, but the operator produces a boolean result`);

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
				fail(`Cannot evaluate expression starting with ${expr.operator.type}: expected the expression to evaluate to a value of type ${type}, but the operator produces a string result`);
			switch(expr.operator){
				case operators.string_concatenate:
					return ["STRING", this.evaluateExpr(expr.nodes[0], "STRING")[1] + this.evaluateExpr(expr.nodes[1], "STRING")[1]];
				default:
					fail(`Cannot evaluate expression starting with ${expr.operator}: expected the expression to evaluate to a value of type ${type}`);
			}
		}

		crash(`This should not be possible`);
	}
	evaluateToken(token:Token, type?:VariableType):[type:VariableType, value:VariableValueType] {
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
			case "name":
				const variable = this.getVariable(token.text);
				if(!variable) fail(`Undeclared variable ${token.text}`);
				if(variable.value == null) fail(`Cannot use the value of uninitialized variable ${token.text}`);
				if(type) return [type, this.coerceValue(variable.value, variable.type, type)];
				else return [variable.type, variable.value];
			default: fail(`Cannot evaluate token of type ${token.type}`);
		}
	}
	/** Returned variable may not be initialized */
	getVariable(name:string):VariableData | ConstantData | null {
		for(let i = this.scopes.length - 1; i >= 0; i--){
			if(this.scopes[i].variables[name]) return this.scopes[i].variables[name];
		}
		return null;
	}
	getCurrentScope():VariableScope {
		return this.scopes.at(-1) ?? crash(`No scope?`);
	}
	getCurrentFunction():FunctionData | null {
		const scope = this.scopes.findLast(
			(s):s is VariableScope & { statement: FunctionStatement | ProcedureStatement } =>
			s.statement instanceof FunctionStatement || s.statement instanceof ProcedureStatement
		);
		if(!scope) return null;
		return this.functions[scope.statement.name] ?? crash(`impossible`);
	}
	coerceValue<T extends VariableType, S extends VariableType>(value:VariableTypeMapping[T], from:T, to:S):VariableTypeMapping[S] {
		//typescript really hates this function, beware
		if(from as any == to) return value as any;
		if(from == "STRING" && to == "CHAR") return value as any;
		if(from == "INTEGER" && to == "REAL") return value as any;
		if(from == "REAL" && to == "INTEGER") return Math.trunc(value as any) as any;
		if(to == "STRING" && value.toString) return value.toString() as any;
		fail(`Cannot coerce value of type ${from} to ${to}`);
	}
	callFunction(funcNode:FunctionData, args:ExpressionAST[]):VariableValueType | null;
	callFunction(funcNode:FunctionData, args:ExpressionAST[], requireReturnValue:true):VariableValueType;
	callFunction(funcNode:FunctionData, args:ExpressionAST[], requireReturnValue = false):VariableValueType | null {
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
			variables: {}
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
	runBlock(code:ProgramAST, scope?:VariableScope):void | {
		type: "function_return";
		value: VariableValueType;
	}{
		if(scope)
			this.scopes.push(scope);
		let returned:null | VariableValueType = null;
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



/**Stores the JS type used for each pseudocode variable type */
export type VariableTypeMapping = {
	"INTEGER": number;
	"REAL": number;
	"STRING": string;
	"CHAR": string;
	"BOOLEAN": boolean;
	"DATE": Date;
}

export type VariableType = keyof VariableTypeMapping /* | string*/;
export type VariableValueType = VariableTypeMapping[keyof VariableTypeMapping];

type FileMode = "READ" | "WRITE" | "APPEND";
