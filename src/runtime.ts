import { operators, type ExpressionAST, type ProgramAST, type ProgramASTTreeNode } from "./parser.js";
import { ProcedureStatement, type ConstantStatement, type DeclarationStatement } from "./statements.js";
import { crash } from "./utils.js";
import { fail } from "./utils.js";

interface FileData {
	name: string;
	text: string;
	/** If null, the file has not been opened, or has been closed. */
	mode: FileMode | null;
}

interface VariableData { //TODO mapped type
	type: VariableType;
	/** Null indicates that the variable has not been initialized */
	value: VariableValueType | null;
	declaration: DeclarationStatement;
	mutable: true;
}
type FunctionData = /* Must be a function or procedure */ ProgramASTTreeNode;

interface ConstantData {
	type: VariableType;
	value: VariableValueType;
	declaration: ConstantStatement;
	mutable: false;
}

export class Runtime {
	variables: Record<string, VariableData | ConstantData> = {};
	functions: Record<string, FunctionData> = {};
	types: Record<string, VariableData> = {};
	files: Record<string, FileData> = {};
	constructor(
		public _input: () => string,
		public _output: (message:string) => void,
	){}
	evaluateExpr(expr:ExpressionAST):VariableValueType {
		if("operator" in expr){
			switch(expr.operator){
				case "array access": crash(`Arrays are not yet supported`);
				case "function call": return this.callFunction(expr.operatorToken.text, expr.nodes, true);
				case operators.add: return this.evaluateExprTyped(expr.nodes[0], "INTEGER") + this.evaluateExprTyped(expr.nodes[1], "INTEGER"); //TODO support REALs
				case operators.subtract: return this.evaluateExprTyped(expr.nodes[0], "INTEGER") - this.evaluateExprTyped(expr.nodes[1], "INTEGER"); //TODO support REALs
				case operators.multiply: return this.evaluateExprTyped(expr.nodes[0], "INTEGER") * this.evaluateExprTyped(expr.nodes[1], "INTEGER"); //TODO support REALs
				case operators.divide: return this.evaluateExprTyped(expr.nodes[0], "INTEGER") / this.evaluateExprTyped(expr.nodes[1], "INTEGER"); //TODO support REALs
				case operators.mod: return this.evaluateExprTyped(expr.nodes[0], "INTEGER") % this.evaluateExprTyped(expr.nodes[1], "INTEGER"); //TODO support REALs
				default: crash("Not yet implemented"); //TODO
			}
		} else {
			switch(expr.type){
				case "boolean.false": return false;
				case "boolean.true": return false;
				case "number.decimal": return Number(expr.text);
				case "string": return expr.text.slice(1, -1); //remove the quotes
				case "name":
					if(!(expr.text in this.variables)) fail(`Undeclared variable ${expr.text}`);
					if(this.variables[expr.text].value == null) fail(`Cannot use the value of uninitialized variable ${expr.text}`);
					return this.variables[expr.text].value!;
				default: fail(`Cannot evaluate token of type ${expr.type}`);
			}
		}
	}
	evaluateExprTyped<T extends VariableType>(expr:ExpressionAST, type:T):VariableTypeMapping[T] {
		const result = this.evaluateExpr(expr);
		switch(type){
			//note: I am unable to think of a way to avoid using "as any" in this function impl
			case "INTEGER":
				if(typeof result == "number") return result as any;
				else fail(`Cannot convert expression to number`);
			default:
				crash(`not yet implemented`);//TODO
		}
	}
	callFunction(name:string, args:ExpressionAST[]):VariableValueType | null;
	callFunction(name:string, args:ExpressionAST[], requireReturnValue:true):VariableValueType;
	callFunction(name:string, args:ExpressionAST[], requireReturnValue = false):VariableValueType | null {
		const func = this.functions[name];
		if(!name) fail(`Unknown function ${name}`);
		if(func.controlStatements[0] instanceof ProcedureStatement){
			if(requireReturnValue) fail(`Cannot use return value of ${name}() as it is a procedure`);
			//TODO scope?
			this.runBlock([func]);
			return null;
		} else { //must be functionstatement
			this.runBlock([func]);
			return crash(`Executing functions is not yet implemented`);
		}
	}
	runBlock(code:ProgramAST){
		for(const line of code){
			if("nodeGroups" in line){
				crash(`TODO`);
			} else {
				line.run(this);
			}
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
