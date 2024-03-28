import "jasmine";
import { ProgramAST } from "../src/parser-types.js";
import { OutputStatement } from "../src/statements.js";
import { _ProgramAST, _Token, process_ProgramAST } from "./spec_utils.js";
import { Runtime } from "../src/runtime.js";
import { fail } from "../src/utils.js";
import { Token, token } from "../src/lexer-types.js";

const programTests = Object.entries<[program:_ProgramAST, output:string, inputs?:string[]]>({
	
}).map<[name:string, program:ProgramAST, output:string, inputs:string[]]>(([k, v]) => [k, process_ProgramAST(v[0]), v[1], v[2] ?? []]);


describe("runtime program execution", () => {
	for(const [name, program, output, inputs] of programTests){
		it(`should produce the expected output for ${name}`, () => {
			let outputs:string[] = [];
			const runtime = new Runtime(
				() => inputs.shift() ?? fail(`Program required input, but none was available`),
				str => outputs.push(str)
			);
			runtime.runBlock(program.nodes);
			expect(outputs.join("\n")).toEqual(output);
		});
	}
});
