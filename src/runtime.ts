import type { ExpressionAST, ExpressionASTTreeNode, ProgramAST } from "./parser.js";
import type { ConstantStatement, DeclarationStatement } from "./statements.js";
import { crash } from "./utils.js";

interface FileData {
	name: string;
	text: string;
	/** If null, the file has not been opened, or has been closed. */
	mode: FileMode | null;
}

interface VariableData {
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
		crash(`TODO`);
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
