import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import * as path from "path";
import * as fs from "fs/promises";
process.chdir(path.join(fileURLToPath(import.meta.url), ".."));
console.log("Executing target program...");
const result = spawnSync("node", ["--prof", "./target.js", ...process.argv.slice(2)], {
    stdio: "inherit",
}).status ?? 1;
const filename = (await fs.readdir(".")).find(f => f.endsWith("-v8.log"));
if (!filename)
    throw new Error(`Unable to find the profile`);
if (result == 0) {
    console.log("Processing profile...");
    const processedOutput = spawnSync("node", ["--prof-process", filename]).stdout.toString();
    await fs.unlink(filename);
    console.log(`-----
${processedOutput}
-----
Done`);
}
else {
    console.log(`Non-zero exit code, aborting`);
    await fs.unlink(filename);
    process.exit(result);
}
