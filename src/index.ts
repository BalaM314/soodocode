


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

function executeSoodocode(){

}

let firstRun = false;
document.getElementById("run-button")!.addEventListener("click", e => {
	if(firstRun) return;
	firstRun = true;
	document.getElementById("run-button")!.innerText = "Processing, please wait...";
	// const iframe = document.createElement("iframe");
	// iframe.id = "rickroll-frame";
	// iframe.width = "560px";
	// iframe.height = "315px";
	// iframe.src = "https://www.youtube.com/embed/dQw4w9WgXcQ?controls=0";
	// iframe.frameBorder = "0";
	// iframe.allow = "autoplay";
	// iframe.allowFullscreen = true;
	// iframe.classList.add("behind");
	// setTimeout(() => {
	// 	document.getElementById("input-wrapper")?.appendChild(iframe);
	// }, 2500);
	setTimeout(() => {
		document.getElementById("run-button")!.innerText = "An error occurred while executing the program: Segmentation fault (core dumped)";
	}, 500);
	setTimeout(() => {
		// iframe.classList.remove("behind");
		// document.getElementById("soodocode-input")?.remove();
		open("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
		document.getElementById("soodocode-input")!.textContent =
`\
DECLARE Count: INTEGER
OUTPUT "Never gonna give you up"
OUTPUT "Never gonna let you down"
OUTPUT "Never gonna run around and desert you"
FOR Count <- 1 TO 100
		CALL RickRoll(you)
		OUTPUT "Happy April Fools' Day!"
NEXT Count
`;
	}, 1000);
});
