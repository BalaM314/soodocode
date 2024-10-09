import { Application, ApplicationError } from "cli-app";
import fs from "node:fs";
import fsP from "node:fs/promises";
import { symbolize, tokenize, parse, Runtime, SoodocodeError, parseError, configs, fail as scFail, f, crash } from "../../build/index.js";
import path from "node:path";
function fail(message) {
    throw new ApplicationError(message);
}
class NodeJSFileSystem {
    rootDirectory;
    encoding;
    fileDescriptors = {};
    constructor(rootDirectory = process.cwd(), encoding = "utf-8") {
        this.rootDirectory = rootDirectory;
        this.encoding = encoding;
    }
    resolveSafe(filename) {
        const filepath = path.resolve(this.rootDirectory, filename);
        if (!filepath.startsWith(this.rootDirectory))
            scFail(f.quote `Cannot access file ${filepath}: it is not inside the directory ${this.rootDirectory}\nhelp: change the working directory and try again`, undefined);
        return filepath;
    }
    descriptor(filename) {
        return this.fileDescriptors[this.resolveSafe(filename)] ?? crash(`Missing file descriptor`);
    }
    hasFile(filename) {
        return fs.existsSync(this.resolveSafe(filename));
    }
    openFile(filename, create = false) {
        const filepath = this.resolveSafe(filename);
        if (!fs.existsSync(filepath) && !create)
            return undefined;
        this.fileDescriptors[filepath] = fs.openSync(filepath, fs.constants.O_RDWR | fs.constants.O_CREAT);
        return {
            name: filename,
            text: fs.readFileSync(filepath, this.encoding)
        };
    }
    closeFile(filename) {
        fs.closeSync(this.descriptor(filename));
    }
    createFile(filename) {
        this.openFile(filename, true);
    }
    updateFile(filename, newContent) {
        fs.writeFileSync(this.descriptor(filename), newContent, this.encoding);
    }
    clearFile(filename) {
        fs.writeFileSync(this.descriptor(filename), "", this.encoding);
    }
    deleteFile(filename) {
        const filepath = this.resolveSafe(filename);
        try {
            this.closeFile(filepath);
        }
        catch { }
        fs.unlinkSync(filepath);
    }
    listFiles() {
        return fs.readdirSync(this.rootDirectory);
    }
}
const soodocode = new Application("soodocode", "CLI interface for the Soodocode runtime");
soodocode.command("run", "Runs a soodocode file.", async (opts, app) => {
    const filename = opts.positionalArgs[0];
    const data = await fsP.readFile(filename, "utf-8")
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
