import "jasmine";
import { symbolize, tokenize } from "../../build/lexer.js";
import { parse } from "../../build/parser.js";
import { Runtime } from "../../build/runtime.js";
import { SoodocodeError, fail, forceType } from "../../build/utils.js";

type ErrorData = string;

const fullTests:Record<string, [code:string, output:string[] | ErrorData, inputs?:string[]]> = {
	empty: [
``,
		[]
	],
	mostlyEmpty: [
`\t
   \t 

 `,
		[]
	],
};

describe("soodocode", () => {
	for(const [name, [code, expectedOutput, inputs]] of Object.entries(fullTests)){
		it(`should produce the expected output for ${name}`, () => {
			const program = parse(tokenize(symbolize(code)));
			const outputs:string[] = [];
			const runtime = new Runtime(() => inputs?.shift() ?? fail(`Program required input, but none was available`), t => outputs.push(t));
			if(Array.isArray(expectedOutput)){
				runtime.runProgram(program.nodes);
				expect(outputs).toEqual(expectedOutput);
			} else {
				let err;
				try {
					runtime.runProgram(program.nodes);
					fail(`Execution did not throw an error`);
				} catch(e){ err = e; }
				expect(err).toBeInstanceOf(SoodocodeError);
				forceType<SoodocodeError>(err);
				expect(err.message).toEqual(expectedOutput);
			}
		});
	}
});
