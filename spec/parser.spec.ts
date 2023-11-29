import "jasmine";
import type { Token } from "../src/lexer.js";
import { ProgramAST, parse, parseFunctionArguments, parseStatement, operators, ExpressionAST, parseExpression } from "../src/parser.js";
import { Statement, statements } from "../src/statements.js";

//copy(tokenize(symbolize(``)).map(t => `{text: "${t.text}", type: "${t.type}"},`).join("\n"))

const sampleExpressions:[name:string, expression:Token[], output:ExpressionAST | "error"][] = Object.entries<[program:Token[], output:ExpressionAST | "error"]>({
	number: [
		[
			{text: "5", type: "number.decimal"},
		],
		{text: "5", type: "number.decimal"},
	],
	variable: [
		[
			{text: "x", type: "name"},
		],
		{text: "x", type: "name"},
	],
	parens: [
		[
			{text: "(", type: "parentheses.open"},
			{text: "x", type: "name"},
			{text: ")", type: "parentheses.close"},
		],
		{text: "x", type: "name"},
	],
	manyparens: [
		[
			{text: "(", type: "parentheses.open"},
			{text: "(", type: "parentheses.open"},
			{text: "(", type: "parentheses.open"},
			{text: "(", type: "parentheses.open"},
			{text: "(", type: "parentheses.open"},
			{text: "(", type: "parentheses.open"},
			{text: "(", type: "parentheses.open"},
			{text: "x", type: "name"},
			{text: ")", type: "parentheses.close"},
			{text: ")", type: "parentheses.close"},
			{text: ")", type: "parentheses.close"},
			{text: ")", type: "parentheses.close"},
			{text: ")", type: "parentheses.close"},
			{text: ")", type: "parentheses.close"},
			{text: ")", type: "parentheses.close"},
		],
		{text: "x", type: "name"},
	],
	addition: [
		[
			{text: "x", type: "name"},
			{text: "+", type: "operator.add"},
			{text: "y", type: "name"},
		],
		{
			operator: operators.add,
			operatorToken: {text: "+", type: "operator.add"},
			nodes: [
				{text: "x", type: "name"},
				{text: "y", type: "name"},
			]
		},
	],
	precedence1: [
		[
			{text: "x", type: "name"},
			{text: "-", type: "operator.subtract"},
			{text: "y", type: "name"},
			{text: "*", type: "operator.multiply"},
			{text: "z", type: "name"},
		],
		{
			operator: operators.subtract,
			operatorToken: {text: "-", type: "operator.subtract"},
			nodes: [
				{text: "x", type: "name"},
				{
					operator: operators.multiply,
					operatorToken: {text: "*", type: "operator.multiply"},
					nodes: [
						{text: "y", type: "name"},
						{text: "z", type: "name"},
					]
				},
			]
		},
	],
	precedence2: [
		[
			{text: "x", type: "name"},
			{text: "*", type: "operator.multiply"},
			{text: "y", type: "name"},
			{text: "-", type: "operator.subtract"},
			{text: "z", type: "name"},
		],
		{
			operator: operators.subtract,
			operatorToken: {text: "-", type: "operator.subtract"},
			nodes: [
				{
					operator: operators.multiply,
					operatorToken: {text: "*", type: "operator.multiply"},
					nodes: [
						{text: "x", type: "name"},
						{text: "y", type: "name"},
					]
				},
				{text: "z", type: "name"},
			]
		},
	],
	SussyBaka: [
		[	
			{text: "(", type: "parentheses.open"},
			{text: "a", type: "name"},
			{text: ">=", type: "operator.greater_than_equal"},
			{text: "b", type: "name"},
			{text: "-", type: "operator.subtract"},
			{text: "c", type: "name"},
			{text: "MOD", type: "operator.mod"},
			{text: "d", type: "name"},
			{text: "<", type: "operator.less_than"},
			{text: "e", type: "name"},
			{text: "+", type: "operator.add"},
			{text: "f", type: "name"},
			{text: "<=", type: "operator.less_than_equal"},
			{text: "g", type: "name"},
			{text: "=", type: "operator.equal_to"},
			{text: "h", type: "name"},
			{text: "*", type: "operator.multiply"},
			{text: "i", type: "name"},
			{text: "/", type: "operator.divide"},
			{text: "j", type: "name"},
			{text: ">", type: "operator.greater_than"},
			{text: "k", type: "name"},
			{text: "DIV", type: "operator.integer_divide"},
			{text: "l", type: "name"},
			{text: "<>", type: "operator.not_equal_to"},
			{text: "m", type: "name"},
			{text: "OR", type: "operator.or"},
			{text: "n", type: "name"},
			{text: "AND", type: "operator.and"},
			{text: "NOT", type: "operator.not"},
			{text: "o", type: "name"},
			{text: ")", type: "parentheses.close"},
			{text: "OR", type: "operator.or"},
			{text: "(", type: "parentheses.open"},
			{text: "a", type: "name"},
			{text: ">=", type: "operator.greater_than_equal"},
			{text: "(", type: "parentheses.open"},
			{text: "b", type: "name"},
			{text: "-", type: "operator.subtract"},
			{text: "c", type: "name"},
			{text: ")", type: "parentheses.close"},
			{text: "MOD", type: "operator.mod"},
			{text: "(", type: "parentheses.open"},
			{text: "(", type: "parentheses.open"},
			{text: "d", type: "name"},
			{text: "<", type: "operator.less_than"},
			{text: "(", type: "parentheses.open"},
			{text: "e", type: "name"},
			{text: "+", type: "operator.add"},
			{text: "(", type: "parentheses.open"},
			{text: "f", type: "name"},
			{text: "<=", type: "operator.less_than_equal"},
			{text: "g", type: "name"},
			{text: ")", type: "parentheses.close"},
			{text: "=", type: "operator.equal_to"},
			{text: "h", type: "name"},
			{text: "*", type: "operator.multiply"},
			{text: "i", type: "name"},
			{text: ")", type: "parentheses.close"},
			{text: "/", type: "operator.divide"},
			{text: "j", type: "name"},
			{text: ")", type: "parentheses.close"},
			{text: ">", type: "operator.greater_than"},
			{text: "k", type: "name"},
			{text: "DIV", type: "operator.integer_divide"},
			{text: "(", type: "parentheses.open"},
			{text: "(", type: "parentheses.open"},
			{text: "l", type: "name"},
			{text: ")", type: "parentheses.close"},
			{text: ")", type: "parentheses.close"},
			{text: "<>", type: "operator.not_equal_to"},
			{text: "m", type: "name"},
			{text: "OR", type: "operator.or"},
			{text: "n", type: "name"},
			{text: ")", type: "parentheses.close"},
			{text: "AND", type: "operator.and"},
			{text: "NOT", type: "operator.not"},
			{text: "o", type: "name"},
			{text: ")", type: "parentheses.close"},
		],
		//this tree is sufficiently colossal to force me to remove the 2846 tabs, 212 newlines, and 276 whitespaces that would be there if I formatted it normally, including TWENTY SIX TABS IN A ROW
		//how to edit it?
		//dont
		{
operatorToken:{type:"operator.or",text:"OR"},operator:operators.or,nodes:[{operatorToken:{type:"operator.or",text:"OR"},operator:operators.or,nodes:[{operatorToken:{type:"operator.not_equal_to",text:"<>"},operator:operators.not_equal_to,nodes:[{operatorToken:{type:"operator.equal_to",text:"="},operator:operators.equal_to,nodes:[{operatorToken:{type:"operator.less_than_equal",text:"<="},operator:operators.less_than_equal,nodes:[{operatorToken:{type:"operator.less_than",text:"<"},operator:operators.less_than,nodes:[{operatorToken:{type:"operator.greater_than_equal",text:">="},operator:operators.greater_than_equal,nodes:[{type:"name",text:"a"},{operatorToken:{type:"operator.subtract",text:"-"},operator:operators.subtract,nodes:[{type:"name",text:"b"},{operatorToken:{type:"operator.mod",text:"MOD"},operator:operators.mod,nodes:[{type:"name",text:"c"},{type:"name",text:"d"}]}]}]},{operatorToken:{type:"operator.add",text:"+"},operator:operators.add,nodes:[{type:"name",text:"e"},{type:"name",text:"f"}]}]},{type:"name",text:"g"}]},{operatorToken:{type:"operator.greater_than",text:">"},operator:operators.greater_than,nodes:[{operatorToken:{type:"operator.divide",text:"/"},operator:operators.divide,nodes:[{operatorToken:{type:"operator.multiply",text:"*"},operator:operators.multiply,nodes:[{type:"name",text:"h"},{type:"name",text:"i"}]},{type:"name",text:"j"}]},{operatorToken:{type:"operator.integer_divide",text:"DIV"},operator:operators.integer_divide,nodes:[{type:"name",text:"k"},{type:"name",text:"l"}]}]}]},{type:"name",text:"m"}]},{operatorToken:{type:"operator.and",text:"AND"},operator:operators.and,nodes:[{type:"name",text:"n"},{operatorToken:{type:"operator.not",text:"NOT"},operator:operators.not,nodes:[{type:"name",text:"o"}]}]}]},{operatorToken:{type:"operator.and",text:"AND"},operator:operators.and,nodes:[{operatorToken:{type:"operator.greater_than_equal",text:">="},operator:operators.greater_than_equal,nodes:[{type:"name",text:"a"},{operatorToken:{type:"operator.mod",text:"MOD"},operator:operators.mod,nodes:[{operatorToken:{type:"operator.subtract",text:"-"},operator:operators.subtract,nodes:[{type:"name",text:"b"},{type:"name",text:"c"}]},{operatorToken:{type:"operator.or",text:"OR"},operator:operators.or,nodes:[{operatorToken:{type:"operator.not_equal_to",text:"<>"},operator:operators.not_equal_to,nodes:[{operatorToken:{type:"operator.greater_than",text:">"},operator:operators.greater_than,nodes:[{operatorToken:{type:"operator.less_than",text:"<"},operator:operators.less_than,nodes:[{type:"name",text:"d"},{operatorToken:{type:"operator.divide",text:"/"},operator:operators.divide,nodes:[{operatorToken:{type:"operator.equal_to",text:"="},operator:operators.equal_to,nodes:[{operatorToken:{type:"operator.add",text:"+"},operator:operators.add,nodes:[{type:"name",text:"e"},{operatorToken:{type:"operator.less_than_equal",text:"<="},operator:operators.less_than_equal,nodes:[{type:"name",text:"f"},{type:"name",text:"g"}]}]},{operatorToken:{type:"operator.multiply",text:"*"},operator:operators.multiply,nodes:[{type:"name",text:"h"},{type:"name",text:"i"}]}]},{type:"name",text:"j"}]}]},{operatorToken:{type:"operator.integer_divide",text:"DIV"},operator:operators.integer_divide,nodes:[{type:"name",text:"k"},{type:"name",text:"l"}]}]},{type:"name",text:"m"}]},{type:"name",text:"n"}]}]}]},{operatorToken:{type:"operator.not",text:"NOT"},operator:operators.not,nodes:[{type:"name",text:"o"}]}]}]
		}
	]
}).map(p => [p[0], p[1][0], p[1][1]]);


const sampleStatements:[name:string, program:Token[], output:Statement | "error"][] = Object.entries<[program:Token[], output:Statement | "error"]>({
	output: [
		[
			{text: "OUTPUT", type: "keyword.output"},
			{text: `"amogus"`, type: "string"},
		],
		new statements.byType["output"]([
			{text: "OUTPUT", type: "keyword.output"},
			{text: `"amogus"`, type: "string"},
		])
	],
	input: [
		[
			{text: "INPUT", type: "keyword.input"},
			{text: `amogus`, type: "name"},
		],
		new statements.byType["input"]([
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
		new statements.byType["declaration"]([
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
		new statements.byType["assignment"]([
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
		new statements.byType["if"]([
			{text: "IF", type: "keyword.if"},
			{
				operatorToken: {text: `<`, type: "operator.less_than"},
				operator: operators.less_than,
				nodes: [
					{text: "5", type: "number.decimal"},
					{text: "x", type: "name"},
				]
			},
			{text: "THEN", type: "keyword.then"},
		])
	],
	until1: [
		[
			{text: "UNTIL", type: "keyword.dowhile_end"},
			{text: "5", type: "number.decimal"},
			{text: `<`, type: "operator.less_than"},
			{text: "x", type: "name"},
		],
		new statements.byType["dowhile.end"]([
			{text: "UNTIL", type: "keyword.dowhile_end"},
			{
				operatorToken: {text: `<`, type: "operator.less_than"},
				operator: operators.less_than,
				nodes: [
					{text: "5", type: "number.decimal"},
					{text: "x", type: "name"},
				]
			},
		])
	],
	until2: [
		[
			{text: "UNTIL", type: "keyword.dowhile_end"},
			{text: `NOT`, type: "operator.not"},
			{text: "x", type: "name"},
		],
		new statements.byType["dowhile.end"]([
			{text: "UNTIL", type: "keyword.dowhile_end"},
			{
				operatorToken: {text: `NOT`, type: "operator.not"},
				operator: operators.not,
				nodes: [
					{text: "x", type: "name"},
				]
			},
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
	incompleteDeclare1: [
		[
			{text: `DECLARE`, type: "keyword.declare"},
		],
		"error"
	],
	incompleteDeclare2: [
		[
			{text: `DECLARE`, type: "keyword.declare"},
			{text: "amogus", type: "name"},
		],
		"error"
	],
	incompleteDeclare3: [
		[
			{text: `DECLARE`, type: "keyword.declare"},
			{text: "amogus", type: "name"},
			{text: ":", type: "punctuation.colon"},
		],
		"error"
	],
	incompleteDeclare4: [
		[
			{text: `DECLARE`, type: "keyword.declare"},
			{text: "amogus", type: "name"},
			{text: "INTEGER", type: "name"},
		],
		"error"
	],
	incompleteOutput: [
		[
			{text: `OUTPUT`, type: "keyword.output"},
		],
		"error"
	],
	incompleteIf1: [
		[
			{text: `IF`, type: "keyword.if"},
		],
		"error"
	],
	incompleteIf2: [
		[
			{text: `IF`, type: "keyword.if"},
			{text: "amogus", type: "name"},
		],
		"error"
	],
	incompleteIf3: [
		[
			{text: `IF`, type: "keyword.if"},
			{text: "amogus", type: "name"},
			{text: "<", type: "operator.less_than"},
		],
		"error"
	],
	incompleteIf4: [
		[
			{text: `IF`, type: "keyword.if"},
			{text: "amogus", type: "name"},
			{text: "<", type: "operator.less_than"},
			{text: "5", type: "number.decimal"},
		],
		"error"
	],
	incompleteIf5: [
		[
			{text: `IF`, type: "keyword.if"},
			{text: `THEN`, type: "keyword.then"},
		],
		"error"
	],
	incompleteIf6: [
		[
			{text: `IF`, type: "keyword.if"},
			{text: "<", type: "operator.less_than"},
			{text: `THEN`, type: "keyword.then"},
		],
		"error"
	],
	incompleteIf7: [
		[
			{text: `IF`, type: "keyword.if"},
			{text: "amogus", type: "name"},
			{text: "<", type: "operator.less_than"},
			{text: `THEN`, type: "keyword.then"},
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
		[new statements.byType["output"]([
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
			new statements.byType["output"]([
				{text: "OUTPUT", type: "keyword.output"},
				{text: `"amogus"`, type: "string"},
			]),
			new statements.byType["input"]([
				{text: "INPUT", type: "keyword.input"},
				{text: `amogus`, type: "name"},
			]),
			new statements.byType["declaration"]([
				{text: "DECLARE", type: "keyword.declare"},
				{text: "amogus", type: "name"},
				{text: ":", type: "punctuation.colon"},
				{text: "NUMBER", type: "name"},
			]),
			new statements.byType["assignment"]([
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
			new statements.byType["input"]([
				{text: "INPUT", type: "keyword.input"},
				{text: `x`, type: "name"},
			]),
			{
				type: "if",
				controlStatements: [
					new statements.byType["if"]([
						{text: "IF", type: "keyword.if"},
						{
							operatorToken: {text: `<`, type: "operator.less_than"},
							operator: operators.less_than,
							nodes: [
								{text: "x", type: "name"},
								{text: "5", type: "number.decimal"},
							]
						},
						{text: "THEN", type: "keyword.then"},
					]),
					new statements.byType["if.end"]([
						{text: "ENDIF", type: "keyword.if_end"}
					])
				],
				nodeGroups: [[
					new statements.byType["output"]([
						{text: "OUTPUT", type: "keyword.output"},
						{text: `"amogus"`, type: "string"},
					]),
				]],
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
			{text: `"X is less than 5"`, type: "string"},
			{text: "\n", type: "newline"},
			{text: "IF", type: "keyword.if"},
			{text: "x", type: "name"},
			{text: "<", type: "operator.less_than"},
			{text: "2", type: "number.decimal"},
			{text: "THEN", type: "keyword.then"},
			{text: "\n", type: "newline"},
			{text: "OUTPUT", type: "keyword.output"},
			{text: `"X is also less than 2"`, type: "string"},
			{text: "\n", type: "newline"},
			{text: "ENDIF", type: "keyword.if_end"},
			{text: "\n", type: "newline"},
			{text: "ENDIF", type: "keyword.if_end"},
		],
		[
			new statements.byType["input"]([
				{text: "INPUT", type: "keyword.input"},
				{text: `x`, type: "name"},
			]),
			{
				type: "if",
				controlStatements: [
					new statements.byType["if"]([
						{text: "IF", type: "keyword.if"},
						{
							operatorToken: {text: `<`, type: "operator.less_than"},
							operator: operators.less_than,
							nodes: [
								{text: "x", type: "name"},
								{text: "5", type: "number.decimal"},
							]
						},
						{text: "THEN", type: "keyword.then"},
					]),
					new statements.byType["if.end"]([
						{text: "ENDIF", type: "keyword.if_end"}
					]),
				],
				nodeGroups: [[
					new statements.byType["output"]([
						{text: "OUTPUT", type: "keyword.output"},
						{text: `"X is less than 5"`, type: "string"},
					]),
					{
						type: "if",
						controlStatements: [
							new statements.byType["if"]([
								{text: "IF", type: "keyword.if"},
								{
									operatorToken: {text: `<`, type: "operator.less_than"},
									operator: operators.less_than,
									nodes: [
										{text: "x", type: "name"},
										{text: "2", type: "number.decimal"},
									]
								},
								{text: "THEN", type: "keyword.then"},
							]),
							new statements.byType["if.end"]([
								{text: "ENDIF", type: "keyword.if_end"}
							])
						],
						nodeGroups: [[
							new statements.byType["output"]([
								{text: "OUTPUT", type: "keyword.output"},
								{text: `"X is also less than 2"`, type: "string"},
							]),
						]],
					}
				]],
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

describe("parseExpression", () => {
	for(const [name, program, output] of sampleExpressions){
		if(output === "error"){
			it(`should not parse ${name} into an expression`, () => {
				expect(() => parseExpression(program)).toThrow();
			});
		} else {
			it(`should parse ${name} into an expression`, () => {
				expect(parseExpression(program)).toEqual(output);
			});
		}
	}
});

describe("parseStatement", () => {
	for(const [name, program, output] of sampleStatements){
		if(output === "error"){
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
		if(output === "error"){
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
