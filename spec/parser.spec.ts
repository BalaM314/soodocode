/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains unit tests for the parser.
*/


import "jasmine";
import { Token, TokenType } from "../src/lexer.js";
import { ProgramAST, parse, parseFunctionArguments, parseStatement, operators, ExpressionAST, parseExpression, OperatorType, ExpressionASTTreeNode, Operator, ProgramASTTreeNodeType, ArrayTypeData, parseType } from "../src/parser.js";
import { AssignmentStatement, DeclarationStatement, DoWhileEndStatement, FunctionArguments, IfStatement, InputStatement, OutputStatement, ProcedureStatement, Statement, statements } from "../src/statements.js";
import { SoodocodeError } from "../src/utils.js";

//copy(tokenize(symbolize(``)).map(t => `{text: "${t.text}", type: "${t.type}"},`).join("\n"))

//i miss rust macros

type _ExpressionAST = _ExpressionASTNode;
type _ExpressionASTLeafNode = _Token;
type _Token = [type:TokenType, text:string];
type _ExpressionASTNode = _ExpressionASTLeafNode | _ExpressionASTTreeNode;
type _ExpressionASTTreeNode = [
	"tree",
	operator: _Operator | [type: "function call", name:string] | [type: "array access", name:string],
	nodes: _ExpressionASTNode[],
];
type _Operator = Exclude<OperatorType, "assignment" | "pointer">;

const operatorTokens: Record<Exclude<OperatorType, "assignment" | "pointer">, Token> = {
	"add": new Token("operator.add", "+"),
	"subtract": new Token("operator.subtract", "-"),
	"multiply": new Token("operator.multiply", "*"),
	"divide": new Token("operator.divide", "/"),
	"mod": new Token("operator.mod", "MOD"),
	"integer_divide": new Token("operator.integer_divide", "DIV"),
	"and": new Token("operator.and", "AND"),
	"or": new Token("operator.or", "OR"),
	"not": new Token("operator.not", "NOT"),
	"equal_to": new Token("operator.equal_to", "="),
	"not_equal_to": new Token("operator.not_equal_to", "<>"),
	"less_than": new Token("operator.less_than", "<"),
	"greater_than": new Token("operator.greater_than", ">"),
	"less_than_equal": new Token("operator.less_than_equal", "<="),
	"greater_than_equal": new Token("operator.greater_than_equal", ">="),
	"string_concatenate": new Token("operator.string_concatenate", "&"),
	"negate": new Token("operator.subtract", "-"),
}

function token(type:TokenType, text:string):Token {
	return new Token(type, text);
}

function processExpressionASTLike(input:_ExpressionAST):ExpressionAST {
	if(input.length == 2){
		return new Token(...input);
	} else {
		let operator:Operator | "array access" | "function call";
		let operatorToken:Token;
		if(Array.isArray(input[1]) && input[1][0] == "array access"){
			operator = input[1][0];
			operatorToken = new Token("name", input[1][1]);
		} else if(Array.isArray(input[1]) && input[1][0] == "function call"){
			operator = input[1][0];
			operatorToken = new Token("name", input[1][1]);
		} else {
			operator = operators[input[1]];
			operatorToken = operatorTokens[input[1]];
		}
		return {
			nodes: input[2].map(processExpressionASTLike),
			operator, operatorToken
		} satisfies ExpressionASTTreeNode;
	}
}

const sampleExpressions:[name:string, expression:Token[], output:ExpressionAST | "error"][] = Object.entries<[program:_Token[], output:_ExpressionAST | "error"]>({
	number: [
		[
			["number.decimal", "5"],
		],
		["number.decimal", "5"],
	],
	variable: [
		[
			["name", "x"],
		],
		["name", "x"],
	],
	parens: [
		[
			["parentheses.open", "("],
			["name", "x"],
			["parentheses.close", ")"],
		],
		["name", "x"],
	],
	manyparens: [
		[
			["parentheses.open", "("],
			["parentheses.open", "("],
			["parentheses.open", "("],
			["parentheses.open", "("],
			["parentheses.open", "("],
			["parentheses.open", "("],
			["parentheses.open", "("],
			["name", "x"],
			["parentheses.close", ")"],
			["parentheses.close", ")"],
			["parentheses.close", ")"],
			["parentheses.close", ")"],
			["parentheses.close", ")"],
			["parentheses.close", ")"],
			["parentheses.close", ")"],
		],
		["name", "x"],
	],
	addition: [
		[
			["name", "x"],
			["operator.add", "+"],
			["name", "y"],
		],
		["tree", "add", [
			["name", "x"],
			["name", "y"],
		]],
	],
	precedence1: [
		[
			["name", "x"],
			["operator.subtract", "-"],
			["name", "y"],
			["operator.multiply", "*"],
			["name", "z"],
		],
		["tree", "subtract", [
			["name", "x"],
			["tree", "multiply", [
				["name", "y"],
				["name", "z"],
			]],
		]],
	],
	precedence2: [
		[
			["name", "x"],
			["operator.multiply", "*"],
			["name", "y"],
			["operator.subtract", "-"],
			["name", "z"],
		],
		["tree", "subtract", [
			["tree", "multiply", [
				["name", "x"],
				["name", "y"],
			]],
			["name", "z"],
		]],
	],
	precedence3: [
		[
			["parentheses.open", "("],
			["name", "x"],
			["operator.multiply", "*"],
			["name", "y"],
			["parentheses.close", ")"],
			["operator.subtract", "-"],
			["name", "z"],
		],
		["tree", "subtract", [
			["tree", "multiply", [
				["name", "x"],
				["name", "y"],
			]],
			["name", "z"],
		]],
	],
	precedence4: [
		[
			["name", "x"],
			["operator.multiply", "*"],
			["parentheses.open", "("],
			["name", "y"],
			["operator.subtract", "-"],
			["name", "z"],
			["parentheses.close", ")"],
		],
		["tree", "multiply", [
			["name", "x"],
			["tree", "subtract", [
				["name", "y"],
				["name", "z"],
			]],
		]],
	],
	parenbug1: [
		[
			["parentheses.open", "("],
			["name", "x"],
			["parentheses.close", ")"],
			["operator.multiply", "*"],
			["parentheses.open", "("],
			["name", "y"],
			["parentheses.close", ")"],
		],
		["tree", "multiply", [
			["name", "x"],
			["name", "y"],
		]],
	],
	parenbad1: [
		[
			["parentheses.open", "("],
		],
		"error"
	],
	parenbad2: [
		[
			["parentheses.close", ")"],
		],
		"error"
	],
	parenbad3: [
		[
			["parentheses.open", "("],
			["parentheses.close", ")"],
		],
		"error"
	],
	parenbad4: [
		[
			["parentheses.close", ")"],
			["parentheses.open", "("],
		],
		"error"
	],
	parenbad5: [
		[
			["parentheses.open", "("],
			["name", "x"],
			["operator.multiply", "*"],
			["parentheses.open", "("],
			["name", "y"],
			["parentheses.close", ")"],
			["parentheses.open", "("],
			["operator.subtract", "-"],
			["name", "z"],
			["parentheses.close", ")"],
			["parentheses.close", ")"],
		],
		"error"
	],
	functioncall1: [
		[
			["name", "amogus"],
			["parentheses.open", "("],
			["parentheses.close", ")"],
		],
		["tree", ["function call", "amogus"], [

		]]
	],
	functioncall2: [
		[
			["name", "amogus"],
			["parentheses.open", "("],
			["number.decimal", "5"],
			["parentheses.close", ")"],
		],
		["tree", ["function call", "amogus"], [
			["number.decimal", "5"],
		]]
	],
	functioncall3: [
		[
			["name", "amogus"],
			["parentheses.open", "("],
			["number.decimal", "5"],
			["punctuation.comma", ","],
			["number.decimal", "6"],
			["punctuation.comma", ","],
			["boolean.true", "TRUE"],
			["punctuation.comma", ","],
			["string", `"sussy"`],
			["operator.string_concatenate", "&"],
			["string", `"amogus"`],
			["punctuation.comma", ","],
			["number.decimal", "0"],
			["parentheses.close", ")"],
		],
		["tree", ["function call", "amogus"], [
			["number.decimal", "5"],
			["number.decimal", "6"],
			["boolean.true", "TRUE"],
			["tree", "string_concatenate", [
				["string", `"sussy"`],
				["string", `"amogus"`],
			]],
			["number.decimal", "0"],
		]]
	],
	functioncallnested: [
		[
			["name", "amogus"],
			["parentheses.open", "("],
			["number.decimal", "5"],
			["punctuation.comma", ","],
			["number.decimal", "6"],
			["punctuation.comma", ","],
			["name", "sussy"],
			["parentheses.open", "("],
			["parentheses.close", ")"],
			["punctuation.comma", ","],
			["name", "baka"],
			["parentheses.open", "("],
			["name", "sussy"],
			["parentheses.open", "("],
			["parentheses.close", ")"],
			["parentheses.close", ")"],
			["punctuation.comma", ","],
			["string", `"sussy"`],
			["operator.string_concatenate", "&"],
			["string", `"amogus"`],
			["punctuation.comma", ","],
			["number.decimal", "0"],
			["parentheses.close", ")"],
		],
		["tree", ["function call", "amogus"], [
			["number.decimal", "5"],
			["number.decimal", "6"],
			["tree", ["function call", "sussy"], [

			]],
			["tree", ["function call", "baka"], [
				["tree", ["function call", "sussy"], [
				
				]],
			]],
			["tree", "string_concatenate", [
				["string", `"sussy"`],
				["string", `"amogus"`],
			]],
			["number.decimal", "0"],
		]]
	],
	functioncallbad1: [
		[
			["name", "amogus"],
			["parentheses.open", "("],
		],
		"error"
	],
	functioncallbad2: [
		[
			["name", "amogus"],
			["parentheses.open", "("],
			["punctuation.comma", ","],
			["parentheses.close", ")"],
		],
		"error"
	],
	functioncallbad3: [
		[
			["name", "amogus"],
			["parentheses.open", "("],
			["punctuation.comma", ","],
			["name", "baka"],
			["parentheses.close", ")"],
		],
		"error"
	],
	functioncallbad4: [
		[
			["name", "amogus"],
			["parentheses.open", "("],
			["name", "baka"],
			["name", "baka"],
			["parentheses.close", ")"],
		],
		"error"
	],
	functioncallbad5: [
		[
			["name", "amogus"],
			["parentheses.open", "("],
			["name", "baka"],
			["punctuation.comma", ","],
			["name", "baka"],
			["punctuation.comma", ","],
			["parentheses.close", ")"],
		],
		"error"
	],
	functioncallbad6: [
		[
			["name", "amogus"],
			["parentheses.open", "("],
			["number.decimal", "5"],
			["punctuation.comma", ","],
			["number.decimal", "6"],
			["punctuation.comma", ","],
			["name", "sussy"],
			["parentheses.open", "("],
			["parentheses.close", ")"],
			["name", "baka"],
			["parentheses.open", "("],
			["name", "sussy"],
			["parentheses.open", "("],
			["parentheses.close", ")"],
			["parentheses.close", ")"],
			["punctuation.comma", ","],
			["string", `"sussy"`],
			["operator.string_concatenate", "&"],
			["string", `"amogus"`],
			["punctuation.comma", ","],
			["number.decimal", "0"],
			["parentheses.close", ")"],
		],
		"error"
	],
	array1: [
		[
			["name", "amogus"],
			["bracket.open", "["],
			["number.decimal", "1"],
			["bracket.close", "]"],
		],
		["tree", ["array access", "amogus"], [
			["number.decimal", "1"],
		]]
	],
	array2: [
		[
			["name", "amogus"],
			["bracket.open", "["],
			["name", "a"],
			["operator.add", "+"],
			["name", "b"],
			["bracket.close", "]"],
		],
		["tree", ["array access", "amogus"], [
			["tree", "add", [
				["name", "a"],
				["name", "b"],
			]],
		]]
	],
	arraynested1: [
		[
			["name", "amogus"],
			["bracket.open", "["],
			["name", "a"],
			["operator.add", "+"],
			["name", "sussy"],
			["bracket.open", "["],
			["name", "b"],
			["operator.add", "+"],
			["name", "c"],
			["bracket.close", "]"],
			["bracket.close", "]"],
		],
		["tree", ["array access", "amogus"], [
			["tree", "add", [
				["name", "a"],
				["tree", ["array access", "sussy"], [
					["tree", "add", [
						["name", "b"],
						["name", "c"],
					]],
				]]
			]],
		]]
	],
	arrayfunction1: [
		[
			["name", "arr"],
			["bracket.open", "["],
			["name", "a"],
			["operator.add", "+"],
			["name", "amogus"],
			["parentheses.open", "("],
			["number.decimal", "5"],
			["punctuation.comma", ","],
			["number.decimal", "6"],
			["parentheses.close", ")"],
			["bracket.close", "]"],
		],
		["tree", ["array access", "arr"], [
			["tree", "add", [
				["name", "a"],
				["tree", ["function call", "amogus"], [
					["number.decimal", "5"],
					["number.decimal", "6"],
				]]
			]],
		]]
	],
	arrayfunction2: [
		[
			["name", "amogus"],
			["parentheses.open", "("],
			["name", "a"],
			["punctuation.comma", ","],
			["name", "b"],
			["operator.add", "+"],
			["name", "amogus"],
			["bracket.open", "["],
			["number.decimal", "5"],
			["punctuation.comma", ","],
			["number.decimal", "6"],
			["bracket.close", "]"],
			["parentheses.close", ")"],
		],
		["tree", ["function call", "amogus"], [
			["name", "a"],
			["tree", "add", [
				["name", "b"],
				["tree", ["array access", "amogus"], [
					["number.decimal", "5"],
					["number.decimal", "6"],
				]]
			]],
		]]
	],
	arraybad1: [
		[
			["name", "amogus"],
			["bracket.open", "["],
			["bracket.close", "]"],
		],
		"error"
	],
	arraybad2: [
		[
			["name", "amogus"],
			["bracket.open", "["],
			["bracket.open", "["],
			["bracket.close", "]"],
			["bracket.close", "]"],
		],
		"error"
	],
	arrayfunctionbad1: [
		[
			["name", "arr"],
			["bracket.open", "["],
			["name", "a"],
			["operator.add", "+"],
			["name", "amogus"],
			["parentheses.open", "("],
			["number.decimal", "5"],
			["number.decimal", "6"],
			["parentheses.close", ")"],
			["bracket.close", "]"],
		],
		"error"
	],
	arrayfunctionbad2: [
		[
			["name", "arr"],
			["bracket.open", "["],
			["name", "a"],
			["operator.add", "+"],
			["name", "amogus"],
			["parentheses.open", "("],
			["number.decimal", "5"],
			["punctuation.comma", ","],
			["number.decimal", "6"],
			["bracket.close", "]"],
			["parentheses.close", ")"],
		],
		"error"
	],
	SussyBaka: [
		[	
			["parentheses.open", "("],
			["name", "a"],
			["operator.greater_than_equal", ">="],
			["name", "b"],
			["operator.subtract", "-"],
			["name", "c"],
			["operator.mod", "MOD"],
			["name", "d"],
			["operator.less_than", "<"],
			["name", "e"],
			["operator.add", "+"],
			["name", "f"],
			["operator.less_than_equal", "<="],
			["name", "g"],
			["operator.equal_to", "="],
			["name", "h"],
			["operator.multiply", "*"],
			["name", "i"],
			["operator.divide", "/"],
			["name", "j"],
			["operator.greater_than", ">"],
			["name", "k"],
			["operator.integer_divide", "DIV"],
			["name", "l"],
			["operator.not_equal_to", "<>"],
			["name", "m"],
			["operator.or", "OR"],
			["name", "n"],
			["operator.and", "AND"],
			["operator.not", "NOT"],
			["name", "o"],
			["parentheses.close", ")"],
			["operator.or", "OR"],
			["parentheses.open", "("],
			["name", "a"],
			["operator.greater_than_equal", ">="],
			["parentheses.open", "("],
			["name", "b"],
			["operator.subtract", "-"],
			["name", "c"],
			["parentheses.close", ")"],
			["operator.mod", "MOD"],
			["parentheses.open", "("],
			["parentheses.open", "("],
			["name", "d"],
			["operator.less_than", "<"],
			["parentheses.open", "("],
			["name", "e"],
			["operator.add", "+"],
			["parentheses.open", "("],
			["name", "f"],
			["operator.less_than_equal", "<="],
			["name", "g"],
			["parentheses.close", ")"],
			["operator.equal_to", "="],
			["name", "h"],
			["operator.multiply", "*"],
			["name", "i"],
			["parentheses.close", ")"],
			["operator.divide", "/"],
			["name", "j"],
			["parentheses.close", ")"],
			["operator.greater_than", ">"],
			["name", "k"],
			["operator.integer_divide", "DIV"],
			["parentheses.open", "("],
			["parentheses.open", "("],
			["name", "l"],
			["parentheses.close", ")"],
			["parentheses.close", ")"],
			["operator.not_equal_to", "<>"],
			["name", "m"],
			["operator.or", "OR"],
			["name", "n"],
			["parentheses.close", ")"],
			["operator.and", "AND"],
			["operator.not", "NOT"],
			["name", "o"],
			["parentheses.close", ")"],
		],
		//this tree is hugee
		//how to edit it?
		//dont
		["tree","or",[["tree","or",[["tree","not_equal_to",[["tree","equal_to",[["tree","less_than_equal",[["tree","less_than",[["tree","greater_than_equal",[["name","a"],["tree","subtract",[["name","b"],["tree","mod",[["name","c"],["name","d"]]]]]]],["tree","add",[["name","e"],["name","f"]]]]],["name","g"]]],["tree","greater_than",[["tree","divide",[["tree","multiply",[["name","h"],["name","i"]]],["name","j"]]],["tree","integer_divide",[["name","k"],["name","l"]]]]]]],["name","m"]]],["tree","and",[["name","n"],["tree","not",[["name","o"]]]]]]],["tree","and",[["tree","greater_than_equal",[["name","a"],["tree","mod",[["tree","subtract",[["name","b"],["name","c"]]],["tree","or",[["tree","not_equal_to",[["tree","greater_than",[["tree","less_than",[["name","d"],["tree","divide",[["tree","equal_to",[["tree","add",[["name","e"],["tree","less_than_equal",[["name","f"],["name","g"]]]]],["tree","multiply",[["name","h"],["name","i"]]]]],["name","j"]]]]],["tree","integer_divide",[["name","k"],["name","l"]]]]],["name","m"]]],["name","n"]]]]]]],["tree","not",[["name","o"]]]]]]]
	],
	SussyBaka2: [
		[
			["parentheses.open", "("],
			["name", "amogus"],
			["parentheses.open", "("],
			["number.decimal", "1"],
			["operator.add", "+"],
			["parentheses.open", "("],
			["parentheses.open", "("],
			["number.decimal", "2"],
			["parentheses.close", ")"],
			["parentheses.close", ")"],
			["operator.subtract", "-"],
			["number.decimal", "3"],
			["operator.multiply", "*"],
			["number.decimal", "4"],
			["operator.divide", "/"],
			["number.decimal", "5"],
			["operator.mod", "MOD"],
			["number.decimal", "6"],
			["operator.integer_divide", "DIV"],
			["number.decimal", "7"],
			["operator.greater_than", ">"],
			["number.decimal", "8"],
			["operator.greater_than", ">"],
			["parentheses.open", "("],
			["number.decimal", "9"],
			["operator.equal_to", "="],
			["number.decimal", "10"],
			["parentheses.close", ")"],
			["operator.and", "AND"],
			["operator.not", "NOT"],
			["number.decimal", "12"],
			["punctuation.comma", ","],
			["string", `"sus"`],
			["punctuation.comma", ","],
			["name", "x"],
			["bracket.open", "["],
			["number.decimal", "5"],
			["bracket.close", "]"],
			["punctuation.comma", ","],
			["name", "amogus"],
			["parentheses.open", "("],
			["name", "arr"],
			["bracket.open", "["],
			["number.decimal", "1"],
			["punctuation.comma", ","],
			["number.decimal", "5"],
			["bracket.close", "]"],
			["punctuation.comma", ","],
			["name", "bigarr"],
			["bracket.open", "["],
			["name", "sussy"],
			["parentheses.open", "("],
			["parentheses.close", ")"],
			["punctuation.comma", ","],
			["name", "sussier"],
			["parentheses.open", "("],
			["number.decimal", "37"],
			["punctuation.comma", ","],
			["name", "y"],
			["bracket.open", "["],
			["number.decimal", "5"],
			["operator.add", "+"],
			["name", "z"],
			["bracket.open", "["],
			["number.decimal", "0"],
			["punctuation.comma", ","],
			["parentheses.open", "("],
			["parentheses.open", "("],
			["number.decimal", "0"],
			["parentheses.close", ")"],
			["parentheses.close", ")"],
			["bracket.close", "]"],
			["bracket.close", "]"],
			["parentheses.close", ")"],
			["bracket.close", "]"],
			["punctuation.comma", ","],
			["number.decimal", "5"],
			["parentheses.close", ")"],
			["parentheses.close", ")"],
			["operator.add", "+"],
			["number.decimal", "0"],
			["parentheses.close", ")"],
		],
		//yet another huge tree
		["tree","add",[["tree",["function call","amogus"],[["tree","and",[["tree","greater_than",[["tree","greater_than",[["tree","subtract",[["tree","add",[["number.decimal","1"],["number.decimal","2"]]],["tree","integer_divide",[["tree","mod",[["tree","divide",[["tree","multiply",[["number.decimal","3"],["number.decimal","4"]]],["number.decimal","5"]]],["number.decimal","6"]]],["number.decimal","7"]]]]],["number.decimal","8"]]],["tree","equal_to",[["number.decimal","9"],["number.decimal","10"]]]]],["tree","not",[["number.decimal","12"]]]]],["string","\"sus\""],["tree",["array access","x"],[["number.decimal","5"]]],["tree",["function call","amogus"],[["tree",["array access","arr"],[["number.decimal","1"],["number.decimal","5"]]],["tree",["array access","bigarr"],[["tree",["function call","sussy"],[]],["tree",["function call","sussier"],[["number.decimal","37"],["tree",["array access","y"],[["tree","add",[["number.decimal","5"],["tree",["array access","z"],[["number.decimal","0"],["number.decimal","0"]]]]]]]]]]],["number.decimal","5"]]]]],["number.decimal","0"]]]
	]
}).map<[name:string, expression:Token[], output:ExpressionAST | "error"]>(([name, [program, output]]) =>
	[
		name,
		program.map(t => new Token(t[0], t[1])),
		output == "error" ? "error" : processExpressionASTLike(output)
	]
);

type _Statement = [constructor:typeof Statement, input:(_Token | _ExpressionAST)[]];

const sampleStatements:[name:string, program:Token[], output:Statement | "error"][] = Object.entries<[program:_Token[], output:_Statement | "error"]>({
	output: [
		[
			["keyword.output", "OUTPUT"],
			["string", `"amogus"`],
		],
		[OutputStatement, [
			["keyword.output", "OUTPUT"],
			["string", `"amogus"`],
		]]
	],
	input: [
		[
			["keyword.input", "INPUT"],
			["name", `amogus`],
		],
		[InputStatement, [
			["keyword.input", "INPUT"],
			["name", `amogus`],
		]]
	],
	declare1: [
		[
			["keyword.declare", "DECLARE"],
			["name", "amogus"],
			["punctuation.colon", ":"],
			["name", "INTEGER"],
		],
		[DeclarationStatement, [
			["keyword.declare", "DECLARE"],
			["name", "amogus"],
			["punctuation.colon", ":"],
			["name", "INTEGER"],
		]]
	],
	declare2: [
		[
			["keyword.declare", "DECLARE"],
			["name", "amogus"],
			["punctuation.comma", ","],
			["name", "sussy"],
			["punctuation.colon", ":"],
			["name", "INTEGER"],
		],
		[DeclarationStatement, [
			["keyword.declare", "DECLARE"],
			["name", "amogus"],
			["punctuation.comma", ","],
			["name", "sussy"],
			["punctuation.colon", ":"],
			["name", "INTEGER"],
		]]
	],
	declareBad1: [
		[
			["keyword.declare", "DECLARE"],
			["punctuation.colon", ":"],
			["name", "INTEGER"],
		],
		"error"
	],
	declareBad2: [
		[
			["keyword.declare", "DECLARE"],
			["name", "amogus"],
			["punctuation.comma", ","],
			["punctuation.colon", ":"],
			["name", "INTEGER"],
		],
		"error"
	],
	declareBad3: [
		[
			["keyword.declare", "DECLARE"],
			["name", "amogus"],
			["name", "sussy"],
			["punctuation.colon", ":"],
			["name", "INTEGER"],
		],
		"error"
	],
	assign: [
		[
			["name", "amogus"],
			["operator.assignment", `<-`],
			["number.decimal", "31415"],
		],
		[AssignmentStatement, [
			["name", "amogus"],
			["operator.assignment", `<-`],
			["number.decimal", "31415"],
		]]
	],
	if: [
		[
			["keyword.if", "IF"],
			["number.decimal", "5"],
			["operator.less_than", `<`],
			["name", "x"],
			["keyword.then", "THEN"],
		],
		[IfStatement, [
			["keyword.if", "IF"],
			["tree", "less_than", [
				["number.decimal", "5"],
				["name", "x"],
			]],
			["keyword.then", "THEN"],
		]]
	],
	until1: [
		[
			["keyword.dowhile_end", "UNTIL"],
			["number.decimal", "5"],
			["operator.less_than", `<`],
			["name", "x"],
		],
		[DoWhileEndStatement, [
			["keyword.dowhile_end", "UNTIL"],
			["tree", "less_than", [
				["number.decimal", "5"],
				["name", "x"],
			]],
		]]
	],
	until2: [
		[
			["keyword.dowhile_end", "UNTIL"],
			["operator.not", `NOT`],
			["name", "x"],
		],
		[DoWhileEndStatement, [
			["keyword.dowhile_end", "UNTIL"],
			["tree", "not", [
					["name", "x"],
				]],
		]]
	],
	procedure1: [
		[
			["keyword.procedure", "PROCEDURE"],
			["name", "func"],
			["parentheses.open", `(`],
			["parentheses.close", `)`],
		],
		[ProcedureStatement, [
			["keyword.procedure", "PROCEDURE"],
			["name", "func"],
			["parentheses.open", `(`],
			["parentheses.close", `)`],
		]]
	],
	procedure2: [
		[
			["keyword.procedure", "PROCEDURE"],
			["name", "func"],
			["parentheses.open", `(`],
			["name", "x"],
			["punctuation.colon", ":"],
			["name", "INTEGER"],
			["parentheses.close", `)`],
		],
		[ProcedureStatement, [
			["keyword.procedure", "PROCEDURE"],
			["name", "func"],
			["parentheses.open", `(`],
			["name", "x"],
			["punctuation.colon", ":"],
			["name", "INTEGER"],
			["parentheses.close", `)`],
		]]
	],
	empty: [
		[
		],
		"error"
	],
	randomjunk1: [
		[
			["number.decimal", "31415"],
			["name", "amogus"],
			["operator.assignment", `<-`],
		],
		"error"
	],
	randomjunk2: [
		[
			["name", "amogus"],
			["number.decimal", "31415"],
			["keyword.output", `OUTPUT`],
		],
		"error"
	],
	incompleteDeclare1: [
		[
			["keyword.declare", `DECLARE`],
		],
		"error"
	],
	incompleteDeclare2: [
		[
			["keyword.declare", `DECLARE`],
			["name", "amogus"],
		],
		"error"
	],
	incompleteDeclare3: [
		[
			["keyword.declare", `DECLARE`],
			["name", "amogus"],
			["punctuation.colon", ":"],
		],
		"error"
	],
	incompleteDeclare4: [
		[
			["keyword.declare", `DECLARE`],
			["name", "amogus"],
			["name", "INTEGER"],
		],
		"error"
	],
	incompleteOutput: [
		[
			["keyword.output", `OUTPUT`],
		],
		"error"
	],
	incompleteIf1: [
		[
			["keyword.if", `IF`],
		],
		"error"
	],
	incompleteIf2: [
		[
			["keyword.if", `IF`],
			["name", "amogus"],
		],
		"error"
	],
	incompleteIf3: [
		[
			["keyword.if", `IF`],
			["name", "amogus"],
			["operator.less_than", "<"],
		],
		"error"
	],
	incompleteIf4: [
		[
			["keyword.if", `IF`],
			["name", "amogus"],
			["operator.less_than", "<"],
			["number.decimal", "5"],
		],
		"error"
	],
	incompleteIf5: [
		[
			["keyword.if", `IF`],
			["keyword.then", `THEN`],
		],
		"error"
	],
	incompleteIf6: [
		[
			["keyword.if", `IF`],
			["operator.less_than", "<"],
			["keyword.then", `THEN`],
		],
		"error"
	],
	incompleteIf7: [
		[
			["keyword.if", `IF`],
			["name", "amogus"],
			["operator.less_than", "<"],
			["keyword.then", `THEN`],
		],
		"error"
	],
	incompleteProcedure1: [
		[
			["keyword.procedure", `PROCEDURE`],
			["name", "amogus"],
			["parentheses.open", "("],
		],
		"error"
	],
}).map<[name:string, program:Token[], output:Statement | "error"]>(([name, [program, output]]) =>
	[
		name,
		program.map(t => new Token(t[0], t[1])),
		output == "error" ? "error" : new output[0](output[1].map(processExpressionASTLike))
	]
);

type _ProgramAST = _ProgramASTNode[];
type _ProgramASTLeafNode = _Statement;
type _ProgramASTNode = _ProgramASTLeafNode | _ProgramASTTreeNode;
type _ProgramASTTreeNode = {
	type: ProgramASTTreeNodeType;
	controlStatements: _Statement[];
	nodeGroups: _ProgramASTNode[][];
}

function processProgramASTLike(output:_ProgramAST):ProgramAST {
	return output.map(n => Array.isArray(n)
		? new n[0](n[1].map(processExpressionASTLike))
		: {
			type: n.type,
			controlStatements: n.controlStatements.map(s => new s[0](s[1].map(processExpressionASTLike))),
			nodeGroups: n.nodeGroups.map(processProgramASTLike),
		}
	)
}

const samplePrograms:[name:string, program:Token[], output:ProgramAST | "error"][] = Object.entries<[program:_Token[], output:_ProgramAST | "error"]>({
	output: [
		[
			["keyword.output", "OUTPUT"],
			["string", `"amogus"`],
			["newline", "\n"],
		],
		[[OutputStatement, [
			["keyword.output", "OUTPUT"],
			["string", `"amogus"`],
		]]]
	],
	outputInputDeclareAssign: [
		[
			["keyword.output", "OUTPUT"],
			["string", `"amogus"`],
			["newline", "\n"],
			["keyword.input", "INPUT"],
			["name", `amogus`],
			["newline", "\n"],
			["keyword.declare", "DECLARE"],
			["name", "amogus"],
			["punctuation.colon", ":"],
			["name", "INTEGER"],
			["newline", "\n"],
			["name", "amogus"],
			["operator.assignment", `<-`],
			["number.decimal", "31415"],
		],
		[
			[OutputStatement, [
				["keyword.output", "OUTPUT"],
				["string", `"amogus"`],
			]],
			[InputStatement, [
				["keyword.input", "INPUT"],
				["name", `amogus`],
			]],
			[DeclarationStatement, [
				["keyword.declare", "DECLARE"],
				["name", "amogus"],
				["punctuation.colon", ":"],
				["name", "INTEGER"],
			]],
			[AssignmentStatement, [
				["name", "amogus"],
				["operator.assignment", `<-`],
				["number.decimal", "31415"],
			]],
		]
	],
	if: [
		[
			["keyword.input", "INPUT"],
			["name", `x`],
			["newline", "\n"],
			["keyword.if", "IF"],
			["name", "x"],
			["operator.less_than", "<"],
			["number.decimal", "5"],
			["keyword.then", "THEN"],
			["newline", "\n"],
			["keyword.output", "OUTPUT"],
			["string", `"amogus"`],
			["newline", "\n"],
			["keyword.if_end", "ENDIF"],
		],
		[
			[InputStatement, [
				["keyword.input", "INPUT"],
				["name", `x`],
			]],
			{
				type: "if",
				controlStatements: [
					[IfStatement, [
						["keyword.if", "IF"],
						["tree", "less_than", [
							["name", "x"],
							["number.decimal", "5"],
						]],
						["keyword.then", "THEN"],
					]],
					[statements.byType["if.end"], [
						["keyword.if_end", "ENDIF"]
					]]
				],
				nodeGroups: [[
					[OutputStatement, [
						["keyword.output", "OUTPUT"],
						["string", `"amogus"`],
					]],
				]],
			}
		],
	],
	nested_if: [
		[
			["keyword.input", "INPUT"],
			["name", `x`],
			["newline", "\n"],
			["keyword.if", "IF"],
			["name", "x"],
			["operator.less_than", "<"],
			["number.decimal", "5"],
			["keyword.then", "THEN"],
			["newline", "\n"],
			["keyword.output", "OUTPUT"],
			["string", `"X is less than 5"`],
			["newline", "\n"],
			["keyword.if", "IF"],
			["name", "x"],
			["operator.less_than", "<"],
			["number.decimal", "2"],
			["keyword.then", "THEN"],
			["newline", "\n"],
			["keyword.output", "OUTPUT"],
			["string", `"X is also less than 2"`],
			["newline", "\n"],
			["keyword.if_end", "ENDIF"],
			["newline", "\n"],
			["keyword.if_end", "ENDIF"],
		],
		[
			[InputStatement, [
				["keyword.input", "INPUT"],
				["name", `x`],
			]],
			{
				type: "if",
				controlStatements: [
					[IfStatement, [
						["keyword.if", "IF"],
						["tree", "less_than", [
							["name", "x"],
							["number.decimal", "5"],
						]],
						["keyword.then", "THEN"],
					]],
					[statements.byType["if.end"], [
						["keyword.if_end", "ENDIF"]
					]],
				],
				nodeGroups: [[
					[OutputStatement, [
						["keyword.output", "OUTPUT"],
						["string", `"X is less than 5"`],
					]],
					{
						type: "if",
						controlStatements: [
							[IfStatement, [
								["keyword.if", "IF"],
								["tree", "less_than", [
									["name", "x"],
									["number.decimal", "2"],
								]],
								["keyword.then", "THEN"],
							]],
							[statements.byType["if.end"], [
								["keyword.if_end", "ENDIF"]
							]]
						],
						nodeGroups: [[
							[OutputStatement, [
								["keyword.output", "OUTPUT"],
								["string", `"X is also less than 2"`],
							]],
						]],
					}
				]],
			}
		],
	]
}).map<[name:string, program:Token[], output:ProgramAST | "error"]>(([name, [program, output]]) =>
	[
		name,
		program.map(t => new Token(t[0], t[1])),
		output == "error" ? "error" : processProgramASTLike(output)
	]
);

describe("parseFunctionArguments", () => {
	function process(input:string | FunctionArguments){
		if(input instanceof Map) return Object.fromEntries([...input.entries()].map(([k, v]) => [k, [v.type, v.passMode]] as const));
		else return input;
	}
	//TODO datastructify
	it("should parse function arguments", () => {
		expect(process(parseFunctionArguments([

		]))).toEqual({
	
		});
		expect(process(parseFunctionArguments([
			token("name", "arg"),
			token("punctuation.colon", ":"),
			token("name", "INTEGER"),
		]))).toEqual({
			arg: ["INTEGER",jasmine.any(String)],
		});
		expect(process(parseFunctionArguments([
			token("name", "arg"),
			token("punctuation.colon", ":"),
			token("name", "INTEGER"),
			token("punctuation.comma", ","),
			token("name", "arg2"),
			token("punctuation.colon", ":"),
			token("name", "BOOLEAN"),
		]))).toEqual({
			arg: ["INTEGER", jasmine.any(String)],
			arg2: ["BOOLEAN", jasmine.any(String)],
		});
		expect(process(parseFunctionArguments([
			token("name", "arg"),
			token("punctuation.colon", ":"),
			token("name", "INTEGER"),
			token("punctuation.comma", ","),
			token("name", "arg2"),
			token("punctuation.colon", ":"),
			token("name", "BOOLEAN"),
			token("punctuation.comma", ","),
			token("name", "arg3"),
			token("punctuation.colon", ":"),
			token("name", "STRING"),
		]))).toEqual({
			arg: ["INTEGER", jasmine.any(String)],
			arg2: ["BOOLEAN", jasmine.any(String)],
			arg3: ["STRING", jasmine.any(String)],
		});
		expect(process(parseFunctionArguments([
			token("name", "arg"),
			token("punctuation.comma", ","),
			token("name", "arg2"),
			token("punctuation.comma", ","),
			token("name", "arg3"),
			token("punctuation.colon", ":"),
			token("name", "STRING"),
		]))).toEqual({
			arg: ["STRING", jasmine.any(String)],
			arg2: ["STRING", jasmine.any(String)],
			arg3: ["STRING", jasmine.any(String)],
		});
		expect(process(parseFunctionArguments([
			token("name", "arg1"),
			token("punctuation.comma", ","),
			token("name", "arg2"),
			token("punctuation.comma", ","),
			token("name", "arg3"),
			token("punctuation.colon", ":"),
			token("name", "BOOLEAN"),
		]))).toEqual({
			arg1: ["BOOLEAN", jasmine.any(String)],
			arg2: ["BOOLEAN", jasmine.any(String)],
			arg3: ["BOOLEAN", jasmine.any(String)],
		});
	});
	it("should correctly determine byref and byval for function arguments", () => {
		expect(process(parseFunctionArguments([
			token("name", "arg"),
			token("punctuation.colon", ":"),
			token("name", "INTEGER"),
		]))).toEqual({
			arg: ["INTEGER", "value"],
		});
		expect(process(parseFunctionArguments([
			token("keyword.by-reference", "BYREF"),
			token("name", "arg"),
			token("punctuation.colon", ":"),
			token("name", "INTEGER"),
		]))).toEqual({
			arg: ["INTEGER", "reference"],
		});
		expect(process(parseFunctionArguments([
			token("keyword.by-value", "BYVAL"),
			token("name", "arg"),
			token("punctuation.colon", ":"),
			token("name", "INTEGER"),
		]))).toEqual({
			arg: ["INTEGER", "value"],
		});
		expect(process(parseFunctionArguments([
			token("keyword.by-reference", "BYREF"),
			token("name", "arg"),
			token("punctuation.colon", ":"),
			token("name", "INTEGER"),
			token("punctuation.comma", ","),
			token("name", "arg2"),
			token("punctuation.colon", ":"),
			token("name", "BOOLEAN"),
		]))).toEqual({
			arg: ["INTEGER", "reference"],
			arg2: ["BOOLEAN", "reference"],
		});
		expect(process(parseFunctionArguments([
			token("keyword.by-value", "BYVAL"),
			token("name", "arg"),
			token("punctuation.colon", ":"),
			token("name", "INTEGER"),
			token("punctuation.comma", ","),
			token("name", "arg2"),
			token("punctuation.colon", ":"),
			token("name", "BOOLEAN"),
		]))).toEqual({
			arg: ["INTEGER", "value"],
			arg2: ["BOOLEAN", "value"],
		});
		expect(process(parseFunctionArguments([
			token("keyword.by-value", "BYVAL"),
			token("name", "arg"),
			token("punctuation.colon", ":"),
			token("name", "INTEGER"),
			token("punctuation.comma", ","),
			token("keyword.by-value", "BYVAL"),
			token("name", "arg2"),
			token("punctuation.colon", ":"),
			token("name", "BOOLEAN"),
		]))).toEqual({
			arg: ["INTEGER", "value"],
			arg2: ["BOOLEAN", "value"],
		});
		expect(process(parseFunctionArguments([
			token("keyword.by-reference", "BYREF"),
			token("name", "arg"),
			token("punctuation.colon", ":"),
			token("name", "INTEGER"),
			token("punctuation.comma", ","),
			token("keyword.by-value", "BYVAL"),
			token("name", "arg2"),
			token("punctuation.colon", ":"),
			token("name", "BOOLEAN"),
		]))).toEqual({
			arg: ["INTEGER", "reference"],
			arg2: ["BOOLEAN", "value"],
		});
		expect(process(parseFunctionArguments([
			token("keyword.by-reference", "BYREF"),
			token("name", "arg"),
			token("punctuation.colon", ":"),
			token("name", "INTEGER"),
			token("punctuation.comma", ","),
			token("keyword.by-value", "BYVAL"),
			token("name", "arg2"),
			token("punctuation.colon", ":"),
			token("name", "BOOLEAN"),
			token("punctuation.comma", ","),
			token("name", "arg3"),
			token("punctuation.colon", ":"),
			token("name", "STRING"),
		]))).toEqual({
			arg: ["INTEGER", "reference"],
			arg2: ["BOOLEAN", "value"],
			arg3: ["STRING", "value"],
		});
		expect(process(parseFunctionArguments([
			token("keyword.by-reference", "BYREF"),
			token("name", "arg"),
			token("punctuation.comma", ","),
			token("keyword.by-value", "BYVAL"),
			token("name", "arg2"),
			token("punctuation.colon", ":"),
			token("name", "BOOLEAN"),
			token("punctuation.comma", ","),
			token("name", "arg3"),
			token("punctuation.colon", ":"),
			token("name", "STRING"),
		]))).toEqual({
			arg: ["BOOLEAN", "reference"],
			arg2: ["BOOLEAN", "value"],
			arg3: ["STRING", "value"],
		});
	})

	it("should throw on invalid function arguments", () => {
		expect(() => parseFunctionArguments([
			token("name", "arg2"),
		])).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => parseFunctionArguments([
			token("name", "arg2"),
			token("punctuation.colon", ":"),
		])).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => parseFunctionArguments([
			token("name", "arg2"),
			token("punctuation.colon", ":"),
			token("name", "DATE"),
			token("name", "arg2"),
		])).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => parseFunctionArguments([
			token("name", "arg2"),
			token("punctuation.colon", ":"),
			token("name", "CHAR"),
			token("punctuation.comma", ","),
		])).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => parseFunctionArguments([
			token("keyword.by-reference", "BYREF"),
		])).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => parseFunctionArguments([
			token("name", "arg2"),
			token("punctuation.colon", ":"),
			token("name", "INTEGER"),
			token("punctuation.comma", ","),
			token("keyword.by-reference", "BYREF"),
		])).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => parseFunctionArguments([
			token("keyword.by-reference", "BYREF"),
			token("keyword.by-value", "BYVAL"),
			token("name", "arg2"),
			token("punctuation.colon", ":"),
			token("name", "BOOLEAN"),
		])).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => parseFunctionArguments([
			token("keyword.by-reference", "BYREF"),
			token("name", "arg1"),
			token("punctuation.comma", ","),
			token("name", "arg2"),
			token("punctuation.comma", ","),
			token("name", "arg3"),
		])).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => parseFunctionArguments([
			token("keyword.case", "CASE"),
			token("name", "arg2"),
			token("punctuation.colon", ":"),
			token("name", "STRING"),
		])).toThrowMatching(t => t instanceof SoodocodeError);
	});
});

describe("parseExpression", () => {
	for(const [name, program, output] of sampleExpressions){
		if(output === "error"){
			it(`should not parse ${name} into an expression`, () => {
				expect(() => parseExpression(program)).toThrowMatching(e => e instanceof SoodocodeError);
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
				expect(() => parseStatement(program)).toThrowMatching(e => e instanceof SoodocodeError);
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
				expect(() => parse(program)).toThrowMatching(e => e instanceof SoodocodeError);
			});
		} else {
			it(`should parse ${name} into a program`, () => {
				expect(parse(program)).toEqual(output);
			});
		}
	}
});

describe("ArrayTypeData", () => {
	it(`should generate correct data`, () => {
		const data1 = new ArrayTypeData([[0, 9]], "BOOLEAN");
		expect(data1.lengthInformation_).toEqual([10]);
		expect(data1.totalLength).toEqual(10);
		const data2 = new ArrayTypeData([[1, 15]], "STRING");
		expect(data2.lengthInformation_).toEqual([15]);
		expect(data2.totalLength).toEqual(15);
		const data3 = new ArrayTypeData([[0, 9], [0, 19]], "BOOLEAN");
		expect(data3.lengthInformation_).toEqual([10, 20]);
		expect(data3.totalLength).toEqual(200);
		const data4 = new ArrayTypeData([[1, 10], [1, 15]], "DATE");
		expect(data4.lengthInformation_).toEqual([10, 15]);
		expect(data4.totalLength).toEqual(150);
		const data5 = new ArrayTypeData([[0, 9], [1, 15], [0, 20]], "INTEGER");
		expect(data5.lengthInformation_).toEqual([10, 15, 21]);
		expect(data5.totalLength).toEqual(3150);
	});
	it(`should handle correct inputs`, () => {
		expect(() => new ArrayTypeData([[0, 0]], "CHAR")).not.toThrow();
		expect(() => new ArrayTypeData([[5, 5]], "CHAR")).not.toThrow();
	})
	it(`should handle incorrect inputs`, () => {
		expect(() => new ArrayTypeData([[0, -1]], "CHAR")).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => new ArrayTypeData([[2, 1]], "CHAR")).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => new ArrayTypeData([[0, 10.5]], "CHAR")).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => new ArrayTypeData([[0, 1], [0, 10.5]], "CHAR")).toThrowMatching(t => t instanceof SoodocodeError);
	});
});

describe("parseType", () => {
	it("should parse single tokens", () => {
		expect(parseType([
			token("name", "INTEGER")
		])).toEqual(
			token("name", "INTEGER")
		);
		expect(parseType([
			token("name", "BOOLEAN")
		])).toEqual(
			token("name", "BOOLEAN")
		);
	});
	it('should parse array types', () => {
		expect(parseType([
			token("keyword.array", "ARRAY"),
			token("bracket.open", "["),
			token("number.decimal", "1"),
			token("punctuation.colon", ":"),
			token("number.decimal", "10"),
			token("bracket.close", "]"),
			token("keyword.of", "OF"),
			token("name", "INTEGER"),
		])).toEqual({
			lengthInformation: [
				[token("number.decimal", "1"), token("number.decimal", "10")]
			],
			type: token("name", "INTEGER"),
		});
		expect(parseType([
			token("keyword.array", "ARRAY"),
			token("bracket.open", "["),
			token("number.decimal", "1"),
			token("punctuation.colon", ":"),
			token("number.decimal", "10"),
			token("punctuation.comma", ","),
			token("number.decimal", "1"),
			token("punctuation.colon", ":"),
			token("number.decimal", "20"),
			token("bracket.close", "]"),
			token("keyword.of", "OF"),
			token("name", "INTEGER"),
		])).toEqual({
			lengthInformation: [
				[token("number.decimal", "1"), token("number.decimal", "10")],
				[token("number.decimal", "1"), token("number.decimal", "20")],
			],
			type: token("name", "INTEGER"),
		});
	});
	it("should throw on invalid array types", () => {
		expect(() => parseType([
			token("keyword.array", "ARRAY"),
		])).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => parseType([
			token("keyword.array", "ARRAY"),
			token("brace.open", "{"),
			token("number.decimal", "1"),
			token("punctuation.colon", ":"),
			token("number.decimal", "10"),
			token("punctuation.comma", ","),
			token("number.decimal", "1"),
			token("punctuation.colon", ":"),
			token("number.decimal", "20"),
			token("brace.close", "}"),
			token("keyword.of", "OF"),
			token("name", "INTEGER"),
		])).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => parseType([
			token("keyword.array", "ARRAY"),
			token("bracket.open", "["),
			token("number.decimal", "10"),
			token("bracket.close", "]"),
			token("keyword.of", "OF"),
			token("name", "INTEGER"),
		])).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => parseType([
			token("keyword.array", "ARRAY"),
			token("bracket.open", "["),
			token("number.decimal", "1"),
			token("punctuation.colon", ":"),
			token("number.decimal", "10"),
			token("bracket.close", "]"),
			token("name", "INTEGER"),
		])).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => parseType([
			token("keyword.array", "ARRAY"),
			token("bracket.open", "["),
			token("number.decimal", "1"),
			token("punctuation.colon", ":"),
			token("number.decimal", "10"),
			token("punctuation.comma", ","),
			token("bracket.close", "]"),
			token("keyword.of", "OF"),
			token("name", "INTEGER"),
		])).toThrowMatching(t => t instanceof SoodocodeError);
	});
});
