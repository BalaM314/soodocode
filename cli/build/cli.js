import { Application, ApplicationError } from "cli-app";
import * as fs from "node:fs/promises";
import { symbolize, tokenize, parse, Runtime, SoodocodeError, parseError, configs } from "../../build/index.js";
function fail(message) {
    throw new ApplicationError(message);
}
class NodeJSFileSystem {
    rootDirectory;
    constructor(rootDirectory = process.cwd()) {
        this.rootDirectory = rootDirectory;
    }
    hasFile(filename) {
        throw new Error("Method not implemented.");
    }
    openFile(filename, create) {
        throw new Error("Method not implemented.");
    }
    closeFile(filename) {
        throw new Error("Method not implemented.");
    }
    createFile(filename) {
        throw new Error("Method not implemented.");
    }
    updateFile(filename, newContent) {
        throw new Error("Method not implemented.");
    }
    clearFile(filename, newContent) {
        throw new Error("Method not implemented.");
    }
    deleteFile(filename) {
        throw new Error("Method not implemented.");
    }
    listFiles() {
        throw new Error("Method not implemented.");
    }
}
const soodocode = new Application("soodocode", "CLI interface for the Soodocode runtime");
soodocode.command("run", "Runs a soodocode file.", async (opts, app) => {
    const filename = opts.positionalArgs[0];
    const data = await fs.readFile(filename, "utf-8")
        .catch(() => fail(`Failed to read the file "${filename}"`));
    const runtime = new Runtime(function input(message, type) {
        throw new Error(`not yet implemented`);
    }, function output(values) {
        console.log(values.map(v => v.asString()).join(" "));
    }, new NodeJSFileSystem());
    configs.statements.max_statements.value = 1_100_000;
    configs.arrays.max_size_bytes.value = 512 * 1024 * 1024;
    try {
        runtime.runProgram(parse(tokenize(symbolize(data))).nodes);
    }
    catch (err) {
        if (err instanceof SoodocodeError) {
            console.error(err.formatMessage(data));
        }
        else if (err instanceof RangeError && err.message == "Maximum call stack size exceeded") {
            console.error(`Maximum call stack size exceeded\nhelp: make sure your recursive functions can reach their base case`);
        }
        else {
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
