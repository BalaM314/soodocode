import "jasmine";
import { AssignmentStatement, DeclarationStatement, IfStatement, InputStatement, OutputStatement, ProgramAST, Statement, parse, parseFunctionArguments, parseStatement, statements } from "../src/parser.js";
import type { Token } from "../src/lexer.js";

const sampleStatements:[name:string, program:Token[], output:Statement | "error"][] = Object.entries<[program:Token[], output:Statement | "error"]>({
	output: [
		[
			{text: "OUTPUT", type: "keyword.output"},
			{text: `"amogus"`, type: "string"},
		],
		new OutputStatement([
			{text: "OUTPUT", type: "keyword.output"},
			{text: `"amogus"`, type: "string"},
		])
	],
	input: [
		[
			{text: "INPUT", type: "keyword.input"},
			{text: `amogus`, type: "name"},
		],
		new InputStatement([
			{text: "INPUT", type: "keyword.input"},
			{text: `amogus`, type: "name"},
		])
	],
	declare: [
		[
			{text: "DECLARE", type: "keyword.declare"},
			{text: "amogus", type: "name"},
			{text: ":", type: "punctuation.colon"},
			{text: "NUMBER", type: "name"},
		],
		new DeclarationStatement([
			{text: "DECLARE", type: "keyword.declare"},
			{text: "amogus", type: "name"},
			{text: ":", type: "punctuation.colon"},
			{text: "NUMBER", type: "name"},
		])
	],
	assign: [
		[
			{text: "amogus", type: "name"},
			{text: `<-`, type: "operator.assignment"},
			{text: "31415", type: "number.decimal"},
		],
		new AssignmentStatement([
			{text: "amogus", type: "name"},
			{text: `<-`, type: "operator.assignment"},
			{text: "31415", type: "number.decimal"},
		])
	],
	if: [
		[
			{text: "IF", type: "keyword.if"},
			{text: "5", type: "number.decimal"},
			{text: `<`, type: "operator.less_than"},
			{text: "x", type: "name"},
			{text: "THEN", type: "keyword.then"},
		],
		new IfStatement([
			{text: "IF", type: "keyword.if"},
			{text: "5", type: "number.decimal"},
			{text: `<`, type: "operator.less_than"},
			{text: "x", type: "name"},
			{text: "THEN", type: "keyword.then"},
		])
	],
	empty: [
		[
		],
		"error"
	],
	randomjunk1: [
		[
			{text: "31415", type: "number.decimal"},
			{text: "amogus", type: "name"},
			{text: `<-`, type: "operator.assignment"},
		],
		"error"
	],
	randomjunk2: [
		[
			{text: "amogus", type: "name"},
			{text: "31415", type: "number.decimal"},
			{text: `OUTPUT`, type: "keyword.output"},
		],
		"error"
	],
}).map(p => [p[0], p[1][0], p[1][1]]);
const samplePrograms:[name:string, program:Token[], output:ProgramAST | "error"][] = Object.entries<[program:Token[], output:ProgramAST | "error"]>({
	output: [
		[
			{text: "OUTPUT", type: "keyword.output"},
			{text: `"amogus"`, type: "string"},
			{text: "\n", type: "newline"},
		],
		[new OutputStatement([
			{text: "OUTPUT", type: "keyword.output"},
			{text: `"amogus"`, type: "string"},
		])]
	],
	outputInputDeclareAssign: [
		[
			{text: "OUTPUT", type: "keyword.output"},
			{text: `"amogus"`, type: "string"},
			{text: "\n", type: "newline"},
			{text: "INPUT", type: "keyword.input"},
			{text: `amogus`, type: "name"},
			{text: "\n", type: "newline"},
			{text: "DECLARE", type: "keyword.declare"},
			{text: "amogus", type: "name"},
			{text: ":", type: "punctuation.colon"},
			{text: "NUMBER", type: "name"},
			{text: "\n", type: "newline"},
			{text: "amogus", type: "name"},
			{text: `<-`, type: "operator.assignment"},
			{text: "31415", type: "number.decimal"},
		],
		[
			new OutputStatement([
				{text: "OUTPUT", type: "keyword.output"},
				{text: `"amogus"`, type: "string"},
			]),
			new InputStatement([
				{text: "INPUT", type: "keyword.input"},
				{text: `amogus`, type: "name"},
			]),
			new DeclarationStatement([
				{text: "DECLARE", type: "keyword.declare"},
				{text: "amogus", type: "name"},
				{text: ":", type: "punctuation.colon"},
				{text: "NUMBER", type: "name"},
			]),
			new AssignmentStatement([
				{text: "amogus", type: "name"},
				{text: `<-`, type: "operator.assignment"},
				{text: "31415", type: "number.decimal"},
			]),
		]
	],
	if: [
		[
			{text: "INPUT", type: "keyword.input"},
			{text: `x`, type: "name"},
			{text: "\n", type: "newline"},
			{text: "IF", type: "keyword.if"},
			{text: "x", type: "name"},
			{text: "<", type: "operator.less_than"},
			{text: "5", type: "number.decimal"},
			{text: "THEN", type: "keyword.then"},
			{text: "\n", type: "newline"},
			{text: "OUTPUT", type: "keyword.output"},
			{text: `"amogus"`, type: "string"},
			{text: "\n", type: "newline"},
			{text: "ENDIF", type: "keyword.if_end"},
		],
		[
			new InputStatement([
				{text: "INPUT", type: "keyword.input"},
				{text: `x`, type: "name"},
			]),
			{
				type: "if",
				startStatement: new IfStatement([
					{text: "IF", type: "keyword.if"},
					{text: "x", type: "name"},
					{text: "<", type: "operator.less_than"},
					{text: "5", type: "number.decimal"},
					{text: "THEN", type: "keyword.then"},
				]),
				nodes: [
					new OutputStatement([
						{text: "OUTPUT", type: "keyword.output"},
						{text: `"amogus"`, type: "string"},
					]),
				],
				endStatement: new statements.startKeyword["keyword.if_end"]!([ //TODO bad
					{text: "ENDIF", type: "keyword.if_end"}
				]),
			}
		],
	],
	nested_if: [
		[
			{text: "INPUT", type: "keyword.input"},
			{text: `x`, type: "name"},
			{text: "\n", type: "newline"},
			{text: "IF", type: "keyword.if"},
			{text: "x", type: "name"},
			{text: "<", type: "operator.less_than"},
			{text: "5", type: "number.decimal"},
			{text: "THEN", type: "keyword.then"},
			{text: "\n", type: "newline"},
			{text: "OUTPUT", type: "keyword.output"},
			{text: `"amogus"`, type: "string"},
			{text: "\n", type: "newline"},
			{text: "IF", type: "keyword.if"},
			{text: "x", type: "name"},
			{text: "<", type: "operator.less_than"},
			{text: "2", type: "number.decimal"},
			{text: "THEN", type: "keyword.then"},
			{text: "\n", type: "newline"},
			{text: "OUTPUT", type: "keyword.output"},
			{text: `"sussy"`, type: "string"},
			{text: "\n", type: "newline"},
			{text: "ENDIF", type: "keyword.if_end"},
			{text: "\n", type: "newline"},
			{text: "ENDIF", type: "keyword.if_end"},
		],
		[
			new InputStatement([
				{text: "INPUT", type: "keyword.input"},
				{text: `x`, type: "name"},
			]),
			{
				type: "if",
				startStatement: new IfStatement([
					{text: "IF", type: "keyword.if"},
					{text: "x", type: "name"},
					{text: "<", type: "operator.less_than"},
					{text: "5", type: "number.decimal"},
					{text: "THEN", type: "keyword.then"},
				]),
				nodes: [
					new OutputStatement([
						{text: "OUTPUT", type: "keyword.output"},
						{text: `"X is less than 5"`, type: "string"},
					]),
					{
						type: "if",
						startStatement: new IfStatement([
							{text: "IF", type: "keyword.if"},
							{text: "x", type: "name"},
							{text: "<", type: "operator.less_than"},
							{text: "2", type: "number.decimal"},
							{text: "THEN", type: "keyword.then"},
						]),
						nodes: [
							new OutputStatement([
								{text: "OUTPUT", type: "keyword.output"},
								{text: `"X is also less than 2"`, type: "string"},
							]),
						],
						endStatement: new statements.startKeyword["keyword.if_end"]!([ //TODO bad
							{text: "ENDIF", type: "keyword.if_end"}
						]),
					}
				],
				endStatement: new statements.startKeyword["keyword.if_end"]!([ //TODO bad
					{text: "ENDIF", type: "keyword.if_end"}
				]),
			}
		],
	]
}).map(p => [p[0], p[1][0], p[1][1]]);

describe("parseFunctionArguments", () => {
	it("should parse function arguments", () => {
		function process(input:string | Map<string, string>){
			if(input instanceof Map) return Object.fromEntries(input.entries());
			else return input;
		}
		expect(process(parseFunctionArguments([
			{ type: "keyword.function", text: "FUNCTION" },
			{ type: "name", text: "Amogus" },
			{ type: "parentheses.open", text: "(" },
			{ type: "parentheses.close", text: ")" },
			{ type: "keyword.returns", text: "RETURNS" },
			{ type: "name", text: "INTEGER "}
		], 3, 2))).toEqual({
	
		});
		expect(process(parseFunctionArguments([
			{ type: "keyword.function", text: "FUNCTION" },
			{ type: "name", text: "Amogus" },
			{ type: "parentheses.open", text: "(" },
			{ type: "name", text: "arg" },
			{ type: "punctuation.colon", text: ":" },
			{ type: "name", text: "INTEGER" },
			{ type: "parentheses.close", text: ")" },
			{ type: "keyword.returns", text: "RETURNS" },
			{ type: "name", text: "INTEGER "}
		], 3, 5))).toEqual({
			arg: "INTEGER"
		});
		expect(process(parseFunctionArguments([
			{ type: "keyword.function", text: "FUNCTION" },
			{ type: "name", text: "Amogus" },
			{ type: "parentheses.open", text: "(" },
			{ type: "name", text: "arg" },
			{ type: "punctuation.colon", text: ":" },
			{ type: "name", text: "INTEGER" },
			{ type: "punctuation.comma", text: "," },
			{ type: "name", text: "arg2" },
			{ type: "punctuation.colon", text: ":" },
			{ type: "name", text: "BOOLEAN" },
			{ type: "parentheses.close", text: ")" },
			{ type: "keyword.returns", text: "RETURNS" },
			{ type: "name", text: "INTEGER "}
		], 3, 9))).toEqual({
			arg: "INTEGER",
			arg2: "BOOLEAN"
		});
		expect(process(parseFunctionArguments([
			{ type: "keyword.function", text: "FUNCTION" },
			{ type: "name", text: "Amogus" },
			{ type: "parentheses.open", text: "(" },
			{ type: "name", text: "arg" },
			{ type: "punctuation.colon", text: ":" },
			{ type: "name", text: "INTEGER" },
			{ type: "punctuation.comma", text: "," },
			{ type: "name", text: "arg2" },
			{ type: "punctuation.colon", text: ":" },
			{ type: "name", text: "BOOLEAN" },
			{ type: "punctuation.comma", text: "," },
			{ type: "name", text: "arg3" },
			{ type: "punctuation.colon", text: ":" },
			{ type: "name", text: "USERSUPPLIED" },
			{ type: "parentheses.close", text: ")" },
			{ type: "keyword.returns", text: "RETURNS" },
			{ type: "name", text: "INTEGER "}
		], 3, 13))).toEqual({
			arg: "INTEGER",
			arg2: "BOOLEAN",
			arg3: "USERSUPPLIED",
		});
	});

	it("should throw on invalid function arguments", () => {
		expect(parseFunctionArguments([
			{ type: "keyword.function", text: "FUNCTION" },
			{ type: "name", text: "Amogus" },
			{ type: "parentheses.open", text: "(" },
			{ type: "name", text: "arg2" },
			{ type: "parentheses.close", text: ")" },
			{ type: "keyword.returns", text: "RETURNS" },
			{ type: "name", text: "INTEGER "}
		], 3, 3)).toEqual(jasmine.any(String));
		expect(parseFunctionArguments([
			{ type: "keyword.function", text: "FUNCTION" },
			{ type: "name", text: "Amogus" },
			{ type: "parentheses.open", text: "(" },
			{ type: "name", text: "arg2" },
			{ type: "punctuation.colon", text: ":" },
			{ type: "parentheses.close", text: ")" },
			{ type: "keyword.returns", text: "RETURNS" },
			{ type: "name", text: "INTEGER "}
		], 3, 4)).toEqual(jasmine.any(String));
		expect(parseFunctionArguments([
			{ type: "keyword.function", text: "FUNCTION" },
			{ type: "name", text: "Amogus" },
			{ type: "parentheses.open", text: "(" },
			{ type: "name", text: "arg2" },
			{ type: "punctuation.colon", text: ":" },
			{ type: "name", text: "INTEGER" },
			{ type: "name", text: "arg2" },
			{ type: "parentheses.close", text: ")" },
			{ type: "keyword.returns", text: "RETURNS" },
			{ type: "name", text: "INTEGER "}
		], 3, 6)).toEqual(jasmine.any(String));
		expect(parseFunctionArguments([
			{ type: "keyword.function", text: "FUNCTION" },
			{ type: "name", text: "Amogus" },
			{ type: "parentheses.open", text: "(" },
			{ type: "name", text: "arg2" },
			{ type: "punctuation.colon", text: ":" },
			{ type: "name", text: "INTEGER" },
			{ type: "punctuation.comma", text: "," },
			{ type: "parentheses.close", text: ")" },
			{ type: "keyword.returns", text: "RETURNS" },
			{ type: "name", text: "INTEGER "}
		], 3, 6)).toEqual(jasmine.any(String));
	});
});

describe("parseStatement", () => {
	for(const [name, program, output] of sampleStatements){
		if(output == "error"){
			it(`should not parse ${name} into a statement`, () => {
				expect(() => parseStatement(program)).toThrow();
			});
		} else {
			it(`should parse ${name} into a statement`, () => {
				expect(parseStatement(program)).toEqual(output);
			});
		}
	}
});

describe("parse", () => {
	for(const [name, program, output] of samplePrograms){
		if(output == "error"){
			it(`should not parse ${name} into a program`, () => {
				expect(() => parse(program)).toThrow();
			});
		} else {
			it(`should parse ${name} into a program`, () => {
				expect(parse(program)).toEqual(output);
			});
		}
	}
});
