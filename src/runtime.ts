import { Token } from "./lexer.js";
import { operators, type ExpressionAST, type ProgramAST, type ProgramASTTreeNode } from "./parser.js";
import { ProcedureStatement } from "./statements.js";
import { ConstantStatement, DeclarationStatement, ForStatement, FunctionStatement } from "./statements.js";
import { crash, fail } from "./utils.js";

interface FileData {
	name: string;
	text: string;
	/** If null, the file has not been opened, or has been closed. */
	mode: FileMode | null;
}

type VariableData<T extends VariableType = VariableType> = {
	type: T;
	/** Null indicates that the variable has not been initialized */
	value: VariableTypeMapping[T] | null;
	declaration: DeclarationStatement | FunctionStatement | ProcedureStatement;
	mutable: true;
}
type FunctionData = /* Must be a function or procedure */ ProgramASTTreeNode;

interface ConstantData {
	type: VariableType;
	value: VariableValueType;
	declaration: ConstantStatement | ForStatement | FunctionStatement | ProcedureStatement; //TODO is this the best solution?
	mutable: false;
}

type VariableScope = Record<string, VariableData | ConstantData>;

export class Runtime {
	scopes: VariableScope[] = [];
	functions: Record<string, FunctionData> = {};
	types: Record<string, VariableData> = {};
	files: Record<string, FileData> = {};
	constructor(
		public _input: () => string,
		public _output: (message:string) => void,
	){}
	evaluateExpr(expr:ExpressionAST):[type:VariableType, value:VariableValueType];
	evaluateExpr<T extends VariableType>(expr:ExpressionAST, type:T):[type:VariableType, value:VariableTypeMapping[T]];
	evaluateExpr(expr:ExpressionAST, type?:VariableType):[type:VariableType, value:VariableValueType] {
		//TODO should we attempt coercion?
		if("operator" in expr){
			//Tree node
			switch(expr.operator){
				case "array access": crash(`Arrays are not yet supported`); //TODO arrays
				case "function call":
					const fn = this.functions[expr.operatorToken.text];
					if(!fn) fail(`Function ${expr.operatorToken.text} is not defined.`);
					if(fn.type == "procedure") fail(`Procedure ${expr.operatorToken.text} does not return a value.`);
					const statement = fn.controlStatements[0] as FunctionStatement; //TODO fix
					if(type && statement.returnType != type) fail(`Expected a value of type ${type}, but the function ${expr.operatorToken.text} returns a value of type ${statement.returnType}`);
					return ["INTEGER", this.callFunction(fn, expr.nodes, true)];
			}

			//arithmetic
			if(type == "REAL" || type == "INTEGER" || expr.operator.category == "arithmetic"){
				if(type && !(type == "REAL" || type == "INTEGER"))
					fail(`Cannot evaluate expression starting with ${expr.operator.type}: expected the expression to evaluate to a value of type ${type}, but the operator produces a numeric result`);
				
				const guessedType = type ?? "REAL"; //Use this type to evaluate the expression
				let value:number;
				//if the requested type is INTEGER, the sub expressions will be evaluated as integers and return an error if not possible
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
						const is_equal = (leftType == rightType) && (left == right);
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
		} else {
			//Leaf node
			switch(expr.type){
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
						const val = Number(expr.text);
						if(!Number.isFinite(val))
							fail(`Value ${expr.text} cannot be converted to a number: too large`);
						if(type == "INTEGER"){
							if(type == "INTEGER" && !Number.isInteger(val))
								fail(`Value ${expr.text} cannot be converted to an integer`);
							if(type == "INTEGER" && !Number.isSafeInteger(val))
								fail(`Value ${expr.text} cannot be converted to an integer: too large`);
							return ["INTEGER", val];
						} else if(type == "STRING") return ["STRING", expr.text];
						else {
							return ["REAL", val];
						}
					} else fail(`Cannot convert number to type ${type}`);
				case "string":
					if(!type || type == "STRING") return ["STRING", expr.text.slice(1, -1)]; //remove the quotes
					else fail(`Cannot convert value ${expr.text} to ${type}`);
				case "name":
					const variable = this.getVariable(expr.text);
					if(!variable) fail(`Undeclared variable ${expr.text}`);
					if(variable.value == null) fail(`Cannot use the value of uninitialized variable ${expr.text}`);
					if(type) return [type, this.coerceValue(variable.value, variable.type, type)];
					else return [variable.type, variable.value];
				default: fail(`Cannot evaluate token of type ${expr.type}`);
			}
		}
	}
	/** Returned variable may not be initialized */
	getVariable(name:string):VariableData | ConstantData | null {
		for(let i = this.scopes.length - 1; i >= 0; i--){
			if(this.scopes[i][name]) return this.scopes[i][name];
		}
		return null;
	}
	getCurrentScope():VariableScope {
		return this.scopes.at(-1) ?? crash(`No scope?`);
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
	callFunction(func:FunctionData, args:ExpressionAST[]):VariableValueType | null;
	callFunction(func:FunctionData, args:ExpressionAST[], requireReturnValue:true):VariableValueType;
	callFunction(func:FunctionData, args:ExpressionAST[], requireReturnValue = false):VariableValueType | null {
		if(func.controlStatements[0] instanceof ProcedureStatement){
			if(requireReturnValue) fail(`Cannot use return value of ${(func.controlStatements[0].tokens[1] as Token).text}() as it is a procedure`);
			//TODO fix above line
		} else if(func.controlStatements[0] instanceof FunctionStatement){
			//all good
		} else crash(`Invalid function ${func.controlStatements[0].stype}`);

		//Assemble scope
		if(func.controlStatements[0].args.size != args.length) fail(`Incorrect number of arguments for function ${func.controlStatements[0].name}`);
		const scope:VariableScope = {};
		let i = 0;
		for(const [name, {type, passMode}] of func.controlStatements[0].args){
			scope[name] = {
				declaration: func.controlStatements[0],
				mutable: passMode == "reference",
				type: type as VariableType,
				value: this.evaluateExpr(args[i], type as VariableType)[1]
			}
			i ++;
		}
		this.runBlock(func.nodeGroups[0], scope);
		if(func.controlStatements[0] instanceof ProcedureStatement){
			return null;
		} else { //must be functionstatement
			return crash(`Obtaining the return value from functions is not yet implemented`); //TODO return
		}
	}
	runBlock(code:ProgramAST, scope:VariableScope = {}){
		this.scopes.push(scope);
		for(const node of code){
			if("nodeGroups" in node){
				node.controlStatements[0].runBlock(this, node);
			} else {
				node.run(this);
			}
		}
		this.scopes.pop() ?? crash(`Scope somehow disappeared`);
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
