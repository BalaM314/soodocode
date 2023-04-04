/*
temp0.onkeydown = e => {
	if(e.key == "Tab"){
		e.preventDefault();
		const start = temp0.selectionStart;
		let x = temp0.value.split("");
		x.splice(start, 0, "\t");
		temp0.value = x.join("");
		temp0.selectionStart = temp0.selectionEnd = start + 1;
	}
}
*/
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

const tokens = {
	number: /\d/,
	text: /\w_-/,
	escape: /\\/,
};

/**If I had a nickel for every time I made a super long AST to store every command in someone else's programming language, I'd have two nickels. That's not a lot, but it's weird that it happened twice. */
const statements = {
	declare: {
		matcher: /DECLARE/,
		executor: (statement:string, context:ExecutionContext):ExecutionContext => {
			return {
				...context,
				variables: {
					...context.variables,

				}
			};
		}
	}
};

function executeLine(line:string, context:ExecutionContext){

}

declare function executeSoodocode():void;

let firstRun = false;
