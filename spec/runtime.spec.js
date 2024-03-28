import "jasmine";
import { process_ProgramAST } from "./spec_utils.js";
import { Runtime } from "../src/runtime.js";
import { fail } from "../src/utils.js";
const programTests = Object.entries({}).map(([k, v]) => [k, process_ProgramAST(v[0]), v[1], v[2] ?? []]);
describe("runtime program execution", () => {
    for (const [name, program, output, inputs] of programTests) {
        it(`should produce the expected output for ${name}`, () => {
            let outputs = [];
            const runtime = new Runtime(() => inputs.shift() ?? fail(`Program required input, but none was available`), str => outputs.push(str));
            runtime.runBlock(program.nodes);
            expect(outputs.join("\n")).toEqual(output);
        });
    }
});
