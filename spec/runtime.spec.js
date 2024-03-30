import "jasmine";
import { token } from "../src/lexer-types.js";
import { Runtime } from "../src/runtime.js";
import { SoodocodeError, fail } from "../src/utils.js";
import { process_ExpressionAST, process_ProgramAST, process_Statement } from "./spec_utils.js";
const tokenTests = Object.entries({}).map(([k, v]) => [k, token(v[0]), v[1], v[2]]);
const expressionTests = Object.entries({}).map(([k, v]) => [k, process_ExpressionAST(v[0]), v[1], v[2]]);
const statementTests = Object.entries({}).map(([k, v]) => [k, process_Statement(v[0]), v[1], v[2], v[3] ?? []]);
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
