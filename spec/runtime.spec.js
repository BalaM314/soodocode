import "jasmine";
import { token } from "../src/lexer-types.js";
import { Runtime } from "../src/runtime.js";
import { SoodocodeError, fail } from "../src/utils.js";
import { process_ExpressionAST, process_ProgramAST, process_Statement } from "./spec_utils.js";
const tokenTests = Object.entries({}).map(([k, v]) => [k, token(v[0]), v[1], v[2]]);
const expressionTests = Object.entries({}).map(([k, v]) => [k, process_ExpressionAST(v[0]), v[1], v[2]]);
const statementTests = Object.entries({}).map(([k, v]) => [k, process_Statement(v[0]), v[1], v[2], v[3] ?? []]);
const programTests = Object.entries({}).map(([k, v]) => [k, process_ProgramAST(v[0]), v[1], v[2] ?? []]);
describe("runtime's token evaluator", () => {
    for (const [name, token, type, output] of tokenTests) {
        it(`should produce the expected output for ${name}`, () => {
            const runtime = new Runtime(() => fail(`Cannot input`), () => fail(`Cannot output`));
            if (output[0] == "error")
                expect(() => runtime.evaluateToken(token, type ?? undefined)).toThrowMatching(e => e instanceof SoodocodeError);
            else
                expect(runtime.evaluateToken(token, type ?? undefined)).toEqual(output);
        });
    }
});
describe("runtime's expression evaluator", () => {
    for (const [name, expression, type, output] of expressionTests) {
        it(`should produce the expected output for ${name}`, () => {
            const runtime = new Runtime(() => fail(`Cannot input`), () => fail(`Cannot output`));
            if (output[0] == "error")
                expect(() => runtime.evaluateExpr(expression, type ?? undefined)).toThrowMatching(e => e instanceof SoodocodeError);
            else
                expect(runtime.evaluateExpr(expression, type ?? undefined)).toEqual(output);
        });
    }
});
describe("runtime's statement executor", () => {
    for (const [name, statement, setup, test, inputs] of statementTests) {
        it(`should produce the expected output for ${name}`, () => {
            let output = null;
            const runtime = new Runtime(() => inputs.shift() ?? fail(`Program required input, but none was available`), message => output = message);
            setup(runtime);
            if (test == "error")
                expect(() => statement.run(runtime)).toThrowMatching(e => e instanceof SoodocodeError);
            else {
                const result = statement.run(runtime);
                test(runtime, result, output);
            }
        });
    }
});
describe("runtime's program execution", () => {
    for (const [name, program, output, inputs] of programTests) {
        it(`should produce the expected output for ${name}`, () => {
            let outputs = [];
            const runtime = new Runtime(() => inputs.shift() ?? fail(`Program required input, but none was available`), str => outputs.push(str));
            runtime.runBlock(program.nodes);
            expect(outputs.join("\n")).toEqual(output);
        });
    }
});
