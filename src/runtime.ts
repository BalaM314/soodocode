import type { ExpressionAST, ExpressionASTTreeNode, ProgramAST } from "./parser.js";
import type { ConstantStatement, DeclarationStatement } from "./statements.js";
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
interface FunctionData {
	type: VariableType;
	value: ExpressionASTTreeNode;
}
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
				default: crash("TODO parse expressions with operators");
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


type VariableType = "INTEGER" | "REAL" | "STRING" | "CHAR" | "BOOLEAN" | "DATE" | string;

/**Stores the JS type used for each pseudocode variable type */
interface VariableTypeMapping {
	"INTEGER": number;
	"REAL": number;
	"STRING": string;
	"CHAR": string;
	"BOOLEAN": boolean;
	"DATE": Date;
}

export type VariableValueType = VariableTypeMapping[keyof VariableTypeMapping];

type FileMode = "READ" | "WRITE" | "APPEND";
