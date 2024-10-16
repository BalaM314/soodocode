import { Application, ApplicationError } from "cli-app";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import fsP from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { configs, crash, f, File, FileSystem, parse, parseError, Runtime, fail as scFail, SoodocodeError, symbolize, tokenize } from "../../core/build/index.js";

function fail(message:string):never {
	throw new ApplicationError(message);
}

// Behold, the Node.JS!
/** Uses a shell command. If platform is windows, uses cmd. If platform is linux, uses sh read. */
function promptSync():string {
	process.stdout.write("> ");
	let command:[string, string[]];
	if(os.platform() == "win32"){
		command = ["cmd", ["/V:ON", "/C", `set /p response= && echo !response!`]];
	} else {
		command = ["sh", ["-c", "read response; echo $response"]];
	}
	return spawnSync(...command, {
		stdio: ["inherit", "pipe", "inherit"]
	}).stdout.toString();
}

class NodeJSFileSystem implements FileSystem {
	private fileDescriptors: Partial<Record<string, number>> = {};
	constructor(
		public rootDirectory:string = process.cwd(),
		public encoding:BufferEncoding = "utf-8",
	){}
	/** Resolves a filename relative to the current directory, but fails if the resolved path is outside the root directory. */
	private resolveSafe(filename:string):string {
		const filepath = path.resolve(this.rootDirectory, filename);
		if(!filepath.startsWith(this.rootDirectory))
			scFail(f.quote`Cannot access file ${filepath}: it is not inside the directory ${this.rootDirectory}\nhelp: change the working directory and try again`, undefined);
		return filepath;
	}
	private descriptor(filename:string):number {
		return this.fileDescriptors[this.resolveSafe(filename)] ?? crash(`Missing file descriptor`);
	}
	hasFile(filename:string):boolean {
		return fs.existsSync(this.resolveSafe(filename));
	}
	openFile(filename:string):File | undefined;
	openFile(filename:string, create:true):File;
	openFile(filename:string, create:boolean):File | undefined;
	openFile(filename:string, create = false):File | undefined {
		console.log(`Opened file ${filename}`);
		const filepath = this.resolveSafe(filename);
		if(!fs.existsSync(filepath) && !create) return undefined;
		this.fileDescriptors[filepath] = fs.openSync(filepath, fs.constants.O_RDWR | fs.constants.O_CREAT);
		return {
			name: filename,
			text: fs.readFileSync(filepath, this.encoding)
		};
	}
	closeFile(filename:string){
		fs.closeSync(this.descriptor(filename));
	}
	createFile(filename:string){
		this.openFile(filename, true);
	}
	updateFile(filename:string, newContent:string){
		fs.ftruncateSync(this.descriptor(filename));
		fs.writeFileSync(this.descriptor(filename), newContent);
	}
	clearFile(filename:string){
		fs.ftruncateSync(this.descriptor(filename));
	}
	deleteFile(filename:string){
		const filepath = this.resolveSafe(filename);
		try {
			this.closeFile(filepath);
		} catch { /* ignore */ }
		fs.unlinkSync(filepath);
	}
	listFiles():string[] {
		return fs.readdirSync(this.rootDirectory);
	}
}

const soodocode = new Application("soodocode", "CLI interface for the Soodocode runtime");
soodocode.command("run", "Runs a soodocode file.", async (opts, app) => {
	const filename = opts.positionalArgs[0];
	const data = await fsP.readFile(filename, "utf-8")
		.catch(() => fail(`Failed to read the file "${filename}"`));
	
	const runtime = new Runtime(
		function input(message, type){
			//ignore the message and type, the user will be able to see the previously output message
			return promptSync();
		},
		function output(values){
			console.log(values.map(v => v.asString()).join(""));
		},
		new NodeJSFileSystem(),
	);
	//Adjust default configs, nodejs has less overhead than browser and can handle more stuff
	configs.statements.max_statements.value = 1_100_000; //1.1 million
	configs.arrays.max_size_bytes.value = 512 * 1024 * 1024; //512 MiB
	try {
		runtime.runProgram(parse(tokenize(symbolize(data))).nodes);
	} catch(err){
		if(err instanceof SoodocodeError){
			console.error(err.formatMessage(data));
		} else if(err instanceof RangeError && err.message == "Maximum call stack size exceeded"){
			console.error(`Maximum call stack size exceeded\nhelp: make sure your recursive functions can reach their base case`);
		} else {
			console.error(`Soodocode crashed! ${parseError(err)}`);
		}
	}
}, true, {
	positionalArgs: [{
		name: "file",
		description: "Path to the file to run",
		required: true,
	}],
}, ["execute", "r"]);

soodocode.run(process.argv);
