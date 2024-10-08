import { Application, ApplicationError } from "cli-app";
import fs from "node:fs";
import fsP from "node:fs/promises";
import readline from "node:readline/promises";
import { symbolize, tokenize, parse, Runtime, FileSystem, File, tryRunOr, SoodocodeError, parseError, configs, fail as scFail, f, crash } from "../../build/index.js";
import path from "node:path";

function fail(message:string):never {
	throw new ApplicationError(message);
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
		fs.writeFileSync(this.descriptor(filename), newContent, this.encoding);
	}
	clearFile(filename:string){
		fs.writeFileSync(this.descriptor(filename), "", this.encoding);
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
			throw new Error(`not yet implemented`);
		},
		function output(values){
			console.log(values.map(v => v.asString()).join(" "));
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
	namedArgs: {
		verbose: {
			description: "If true, emits additional output.",
			aliases: ["v"],
			needsValue: false,
		}
	}
}, ["execute", "r"]);

soodocode.run(process.argv);
