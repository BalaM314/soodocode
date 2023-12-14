import type { ProgramAST } from "./parser.js";
import type { ConstantStatement, DeclarationStatement } from "./statements.js";

interface FileData {
	name: string;
	text: string;
	/** If null, the file has not been opened, or has been closed. */
	mode: FileMode | null;
}

interface VariableData {
	type: VariableType;
	/** Null indicates that the variable has not been initialized */
	value: VariableTypeMapping[keyof VariableTypeMapping] | null;
	declaration: DeclarationStatement;
	mutable: true;
}
interface FunctionData {
	type: VariableType;
	/** Null indicates that the variable has not been initialized */
	value: VariableTypeMapping[keyof VariableTypeMapping] | null;
	declaration: DeclarationStatement;
}
interface ConstantData {
	type: VariableType;
	value: VariableTypeMapping[keyof VariableTypeMapping];
	declaration: ConstantStatement;
	mutable: false;
}

export class Runtime {
	variables: Record<string, VariableData | ConstantData> = {};
	functions: Record<string, FunctionData> = {};
	types: Record<string, VariableData> = {};
	files: Record<string, FileData> = {};
	/** program counter, points to the currently executing (or just executed) instruction */
	pc:number[] = [];
	constructor(
		public code:ProgramAST,
		public _input: () => string,
		public _output: (message:string) => void,
	){}
	tick(){
		//??????????????????
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

type FileMode = "READ" | "WRITE" | "APPEND";
