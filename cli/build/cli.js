import { Application, ApplicationError } from "cli-app";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import fsP from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { configs, crash, f, parse, parseError, Runtime, fail as scFail, SoodocodeError, symbolize, tokenize } from "../../build/index.js";
function fail(message) {
    throw new ApplicationError(message);
}
function promptSync() {
    process.stdout.write("> ");
    let command;
    if (os.platform() == "win32") {
        command = ["cmd", ["/V:ON", "/C", `set /p response= && echo !response!`]];
    }
    else {
        command = ["sh", ["-c", "read response; echo $response"]];
    }
    return spawnSync(...command, {
        stdio: ["inherit", "pipe", "inherit"]
    }).stdout.toString();
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
        console.log(`Opened file ${filename}`);
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
        fs.ftruncateSync(this.descriptor(filename));
        fs.writeFileSync(this.descriptor(filename), newContent);
    }
    clearFile(filename) {
        fs.ftruncateSync(this.descriptor(filename));
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
        return promptSync();
    }, function output(values) {
        console.log(values.map(v => v.asString()).join(""));
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
}, ["execute", "r"]);
soodocode.run(process.argv);
