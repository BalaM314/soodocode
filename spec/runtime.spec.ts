import "jasmine";
import { Token, token } from "../src/lexer-types.js";
import { ExpressionAST, ProgramAST, ProgramASTLeafNode } from "../src/parser-types.js";
import { EnumeratedVariableType, Runtime, VariableType, VariableValue } from "../src/runtime.js";
import { AssignmentStatement, DeclarationStatement, OutputStatement, StatementExecutionResult } from "../src/statements.js";
import { SoodocodeError, fail } from "../src/utils.js";
import { _ExpressionAST, _ProgramAST, _ProgramASTLeafNode, _Token, process_ExpressionAST, process_ProgramAST, process_Statement } from "./spec_utils.js";

const tokenTests = Object.entries<[token:_Token, type:VariableType | null, output:[type:VariableType, value:VariableValue] | ["error"], setup?:(r:Runtime) => unknown]>({
	boolean_true: [
		["boolean.true", "true"],
		"BOOLEAN",
		["BOOLEAN", true]
	],
	boolean_false: [
		["boolean.false", "false"],
		"BOOLEAN",
		["BOOLEAN", false]
	],
	number_int: [
		["number.decimal", "5"],
		"INTEGER",
		["INTEGER", 5]
	],
	number_int2: [
		["number.decimal", "1398403"],
		"INTEGER",
		["INTEGER", 1398403]
	],
	number_real: [
		["number.decimal", "5"],
		"REAL",
		["REAL", 5]
	],
	number_real2: [
		["number.decimal", "1398403"],
		"REAL",
		["REAL", 1398403]
	],
	number_decimal: [
		["number.decimal", "5.2"],
		null,
		["REAL", 5.2]
	],
	number_decimal_int: [
		["number.decimal", "5.2"],
		"INTEGER",
		["error"]
	],
	number_negative: [
		["number.decimal", "-5"],
		"INTEGER",
		["INTEGER", -5]
	],
	number_negative_decimal: [
		["number.decimal", "-5.2"],
		null,
		["REAL", -5.2]
	],
	number_too_large: [
		["number.decimal", "9".repeat(45)],
		"INTEGER",
		["error"]
	],
	number_real_too_large: [
		["number.decimal", "9".repeat(309)],
		"REAL",
		["error"]
	],
	number_negative_too_large: [
		["number.decimal", "-" + "9".repeat(45)],
		"INTEGER",
		["error"]
	],
	variable_number: [
		["name", "x"],
		"INTEGER",
		["INTEGER", 5],
		r => r.getCurrentScope().variables["x"] = {
			mutable: false,
			declaration: null!,
			type: "INTEGER",
			value: 5
		}
	],
	enum_valid: (() => {
		const type = new EnumeratedVariableType(
			"amogusType",
			["amoma", "sugoma", "amoma", "sugus"]
		);
		return [
			["name", "amoma"],
			type,
			[type, "amoma"],
			r => r.getCurrentScope().types["amogusType"] = type
		];
	})(),
	enum_invalid_different: (() => {
		const type1 = new EnumeratedVariableType(
			"amogusType",
			["amoma", "sugoma", "amoma", "sugus"]
		);
		const type2 = new EnumeratedVariableType(
			"dayOfWeek",
			["sunday", "monday", "tuesday", "wednesday", "thursday", "friday"]
		);
		return [
			["name", "amoma"],
			type2,
			["error"],
			r => r.getCurrentScope().types["amogusType"] = type1
		];
	})(),
	enum_invalid_nonexistent: (() => {
		const type = new EnumeratedVariableType(
			"amogusType",
			["amoma", "sugoma", "amoma", "sugus"]
		);
		return [
			["name", "sussybaka"],
			null,
			["error"],
			r => r.getCurrentScope().types["amogusType"] = type
		];
	})(),
}).map<[name:string, token:Token, type:VariableType | null, output:[type:VariableType, value:VariableValue] | ["error"], setup:(r:Runtime) => unknown]>(([k, v]) => [k, token(v[0]), v[1], v[2], v[3] ?? (() => {})]);

const expressionTests = Object.entries<[expression:_ExpressionAST, type:VariableType | null, output:[type:VariableType, value:VariableValue] | ["error"]]>({
	addNumbers: [
		["tree", "add", [
			["number.decimal", "5"],
			["number.decimal", "6"]
		]],
		"INTEGER",
		["INTEGER", 11]
	]
}).map<[name:string, expression:ExpressionAST, type:VariableType | null, output:[type:VariableType, value:VariableValue] | ["error"]]>(([k, v]) => [k, process_ExpressionAST(v[0]), v[1], v[2]]);

const statementTests = Object.entries<[statement:_ProgramASTLeafNode, setup:(r:Runtime) => unknown, test:"error" | ((r:Runtime, result:StatementExecutionResult | void, message:string | null) => unknown), inputs?:string[]]>({
	declare1: [
		[DeclarationStatement, [
			["keyword.declare", "DECLARE"],
			["name", "x"],
			["punctuation.colon", ":"],
			["name", "DATE"],
		]],
		r => {},
		r => expect(r.scopes[0]?.variables?.x).toEqual({
			declaration: jasmine.any(DeclarationStatement),
			mutable: true,
			type: "DATE",
			value: null
		})
	]
}).map<[name:string, statement:ProgramASTLeafNode, setup:(r:Runtime) => unknown, test:"error" | ((r:Runtime, result:StatementExecutionResult | void, message:string | null) => unknown), inputs:string[]]>(([k, v]) => [k, process_Statement(v[0]), v[1], v[2], v[3] ?? []]);

const programTests = Object.entries<[program:_ProgramAST, output:string, inputs?:string[]]>({
	simpleProgram: [
		[
			[DeclarationStatement, [
				["keyword.declare", "DECLARE"],
				["name", "x"],
				["punctuation.colon", ":"],
				["name", "STRING"],
			]],
			[AssignmentStatement, [
				["name", "x"],
				["operator.assignment", "<-"],
				["string", `"amogus"`],
			]],
			[OutputStatement, [
				["keyword.output", "OUTPUT"],
				["name", "x"],
			]],
		],
		`amogus`
	]
}).map<[name:string, program:ProgramAST, output:string, inputs:string[]]>(([k, v]) => [k, process_ProgramAST(v[0]), v[1], v[2] ?? []]);


describe("runtime's token evaluator", () => {
	for(const [name, token, type, output, setup] of tokenTests){
		it(`should produce the expected output for ${name}`, () => {
			const runtime = new Runtime(() => fail(`Cannot input`), () => fail(`Cannot output`));
			setup(runtime);
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
