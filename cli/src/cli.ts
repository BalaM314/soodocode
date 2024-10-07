import { Application, ApplicationError } from "cli-app";
import * as fs from "node:fs/promises";
import * as readline from "node:readline/promises";
import { symbolize, tokenize, parse, Runtime, FileSystem, File, tryRunOr, SoodocodeError, parseError, configs } from "../../build/index.js";

function fail(message:string):never {
	throw new ApplicationError(message);
}

class NodeJSFileSystem implements FileSystem {
	constructor(public rootDirectory:string = process.cwd()){}
	hasFile(filename:string):boolean {
		throw new Error("Method not implemented.");
	}
	openFile(filename:string):File | undefined;
	openFile(filename:string, create:true):File;
	openFile(filename:string, create:boolean):File | undefined;
	openFile(filename:unknown, create?:unknown):File | undefined {
		throw new Error("Method not implemented.");
	}
	closeFile(filename:string){
		throw new Error("Method not implemented.");
	}
	createFile(filename:string){
		throw new Error("Method not implemented.");
	}
	updateFile(filename:string, newContent:string){
		throw new Error("Method not implemented.");
	}
	clearFile(filename:string, newContent:string){
		throw new Error("Method not implemented.");
	}
	deleteFile(filename:string){
		throw new Error("Method not implemented.");
	}
	listFiles():string[] {
		throw new Error("Method not implemented.");
	}
}

const soodocode = new Application("soodocode", "CLI interface for the Soodocode runtime");
soodocode.command("run", "Runs a soodocode file.", async (opts, app) => {
	const filename = opts.positionalArgs[0];
	const data = await fs.readFile(filename, "utf-8")
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
			//TODO show range
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
