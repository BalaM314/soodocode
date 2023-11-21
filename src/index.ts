
interface ExecutionContext {
	variables: {
		[index: string]: VariableData;
	}
	file: OpenedFileData | null;
	files: {
		[filename: string]: string[];
	}
}

interface OpenedFileData {
	name: string;
	mode: FileMode;
}

interface VariableData {
	type: VariableType;
	value: VariableTypeMapping[keyof VariableTypeMapping];
}

enum VariableType {
	INTEGER = "INTEGER",
	REAL = "REAL",
	STRING = "STRING",
	CHAR = "CHAR",
	BOOLEAN = "BOOLEAN",
	DATE = "DATE"
}

/**Stores the JS type used for each pseudocode variable type */
interface VariableTypeMapping {
	"INTEGER": number;
	"REAL": number;
	"STRING": string;
	"CHAR": string;
	"BOOLEAN": boolean;
	"DATE": Date;
}

enum FileMode {
	READ = "READ",
	WRITE = "WRITE",
	APPEND = "APPEND"
}

function executeLine(line:string, context:ExecutionContext){

}

declare function executeSoodocode():void;

let firstRun = false;
