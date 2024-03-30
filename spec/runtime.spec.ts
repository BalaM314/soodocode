import "jasmine";
import { Token, token } from "../src/lexer-types.js";
import { ExpressionAST, ProgramAST, ProgramASTLeafNode } from "../src/parser-types.js";
import { Runtime, VariableType, VariableValueType } from "../src/runtime.js";
import { StatementExecutionResult } from "../src/statements.js";
import { SoodocodeError, fail } from "../src/utils.js";
import { _ExpressionAST, _ProgramAST, _ProgramASTLeafNode, _Token, process_ExpressionAST, process_ProgramAST, process_Statement } from "./spec_utils.js";

const tokenTests = Object.entries<[token:_Token, type:VariableType | null, output:[type:VariableType, value:VariableValueType] | ["error"]]>({

}).map<[name:string, token:Token, type:VariableType | null, output:[type:VariableType, value:VariableValueType] | ["error"]]>(([k, v]) => [k, token(v[0]), v[1], v[2]]);

const expressionTests = Object.entries<[expression:_ExpressionAST, type:VariableType | null, output:[type:VariableType, value:VariableValueType] | ["error"]]>({

}).map<[name:string, expression:ExpressionAST, type:VariableType | null, output:[type:VariableType, value:VariableValueType] | ["error"]]>(([k, v]) => [k, process_ExpressionAST(v[0]), v[1], v[2]]);

const statementTests = Object.entries<[statement:_ProgramASTLeafNode, setup:(r:Runtime) => unknown, test:"error" | ((r:Runtime, result:StatementExecutionResult | void, message:string | null) => unknown), inputs?:string[]]>({

}).map<[name:string, statement:ProgramASTLeafNode, setup:(r:Runtime) => unknown, test:"error" | ((r:Runtime, result:StatementExecutionResult | void, message:string | null) => unknown), inputs:string[]]>(([k, v]) => [k, process_Statement(v[0]), v[1], v[2], v[3] ?? []]);

const programTests = Object.entries<[program:_ProgramAST, output:string, inputs?:string[]]>({

}).map<[name:string, program:ProgramAST, output:string, inputs:string[]]>(([k, v]) => [k, process_ProgramAST(v[0]), v[1], v[2] ?? []]);


describe("runtime's token evaluator", () => {
	for(const [name, token, type, output] of tokenTests){
		it(`should produce the expected output for ${name}`, () => {
			const runtime = new Runtime(() => fail(`Cannot input`), () => fail(`Cannot output`));
			if(output[0] == "error")
				expect(() => runtime.evaluateToken(token, type ?? undefined)).toThrowMatching(e => e instanceof SoodocodeError)
			else
				expect(runtime.evaluateToken(token, type ?? undefined)).toEqual(output);
		});
	}
});

describe("runtime's expression evaluator", () => {
	for(const [name, expression, type, output] of expressionTests){
		it(`should produce the expected output for ${name}`, () => {
			const runtime = new Runtime(() => fail(`Cannot input`), () => fail(`Cannot output`));
			if(output[0] == "error")
				expect(() => runtime.evaluateExpr(expression, type ?? undefined)).toThrowMatching(e => e instanceof SoodocodeError)
			else
				expect(runtime.evaluateExpr(expression, type ?? undefined)).toEqual(output);
		});
	}
});

describe("runtime's statement executor", () => {
	for(const [name, statement, setup, test, inputs] of statementTests){
		it(`should produce the expected output for ${name}`, () => {
			let output:string | null = null;
			const runtime = new Runtime(
				() => inputs.shift() ?? fail(`Program required input, but none was available`),
				message => output = message
			);
			setup(runtime);
			if(test == "error")
				expect(() => statement.run(runtime)).toThrowMatching(e => e instanceof SoodocodeError)
			else {
				const result = statement.run(runtime);
				test(runtime, result, output);
			}
		});
	}
});

describe("runtime's program execution", () => {
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
