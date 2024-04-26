/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains unit tests for the parser.
*/


import "jasmine";
import { Token, TokenizedProgram } from "../../build/lexer-types.js";
import { ExpressionAST, ExpressionASTArrayTypeNode, ProgramAST, ProgramASTBranchNode, ProgramASTBranchNodeType } from "../../build/parser-types.js";
import { parse, parseExpression, parseFunctionArguments, parseStatement, parseType } from "../../build/parser.js";
import { ArrayVariableType, PrimitiveVariableType, UnresolvedVariableType } from "../../build/runtime-types.js";
import { AssignmentStatement, CaseBranchRangeStatement, CaseBranchStatement, ClassStatement, DefineStatement, DoWhileStatement, ForStatement, ForStepStatement, IfStatement, InputStatement, OutputStatement, PassMode, Statement, SwitchStatement, TypeEnumStatement, TypePointerStatement, TypeRecordStatement, TypeSetStatement } from "../../build/statements.js";
import { SoodocodeError } from "../../build/utils.js";
import { _ExpressionAST, _ExpressionASTArrayTypeNode, _ProgramAST, _Statement, _Token, _UnresolvedVariableType, applyAnyRange, fakeStatement, process_ExpressionAST, process_ExpressionASTExt, process_ProgramAST, process_Statement, process_Token, process_UnresolvedVariableType, token } from "./spec_utils.js";

//copy(tokenize(symbolize(``)).map(t => `{text: "${t.text}", type: "${t.type}"},`).join("\n"))

//i miss rust macros
//TODO major dedupe: in progress

const parseExpressionTests = ((d:Record<string, [program:_Token[], output:_ExpressionAST | "error"]>) =>
	Object.entries(d).map<
		[name:string, expression:Token[], output:jasmine.Expected<ExpressionAST> | "error"]
	>(([name, [program, output]]) => [
		name,
		program.map(process_Token),
		output == "error" ? "error" : applyAnyRange(process_ExpressionAST(output))
	]
))({
	number: [
		[
			5,
		],
		5,
	],
	variable: [
		[
			"x",
		],
		"x",
	],
	parens: [
		[
			"parentheses.open",
			"x",
			"parentheses.close",
		],
		"x",
	],
	manyparens: [
		[
			"parentheses.open",
			"parentheses.open",
			"parentheses.open",
			"parentheses.open",
			"parentheses.open",
			"parentheses.open",
			"parentheses.open",
			"x",
			"parentheses.close",
			"parentheses.close",
			"parentheses.close",
			"parentheses.close",
			"parentheses.close",
			"parentheses.close",
			"parentheses.close",
		],
		"x",
	],
	addition: [
		[
			"x",
			"operator.add",
			"y",
		],
		["tree", "add", [
			"x",
			"y",
		]],
	],
	precedence1: [
		[
			"x",
			"operator.minus",
			"y",
			"operator.multiply",
			"z",
		],
		["tree", "subtract", [
			"x",
			["tree", "multiply", [
				"y",
				"z",
			]],
		]],
	],
	precedence2: [
		[
			"x",
			"operator.multiply",
			"y",
			"operator.minus",
			"z",
		],
		["tree", "subtract", [
			["tree", "multiply", [
				"x",
				"y",
			]],
			"z",
		]],
	],
	precedence3: [
		[
			"parentheses.open",
			"x",
			"operator.multiply",
			"y",
			"parentheses.close",
			"operator.minus",
			"z",
		],
		["tree", "subtract", [
			["tree", "multiply", [
				"x",
				"y",
			]],
			"z",
		]],
	],
	precedence4: [
		[
			"x",
			"operator.multiply",
			"parentheses.open",
			"y",
			"operator.minus",
			"z",
			"parentheses.close",
		],
		["tree", "multiply", [
			"x",
			["tree", "subtract", [
				"y",
				"z",
			]],
		]],
	],
	parenbug1: [
		[
			"parentheses.open",
			"x",
			"parentheses.close",
			"operator.multiply",
			"parentheses.open",
			"y",
			"parentheses.close",
		],
		["tree", "multiply", [
			"x",
			"y",
		]],
	],
	parenbad1: [
		[
			"parentheses.open",
		],
		"error"
	],
	parenbad2: [
		[
			"parentheses.close",
		],
		"error"
	],
	parenbad3: [
		[
			"parentheses.open",
			"parentheses.close",
		],
		"error"
	],
	parenbad4: [
		[
			"parentheses.close",
			"parentheses.open",
		],
		"error"
	],
	parenspam: [
		[
			"parentheses.open",
			"x",
			"operator.multiply",
			"parentheses.open",
			"y",
			"parentheses.close",
			"parentheses.open",
			"operator.minus",
			"z",
			"parentheses.close",
			"parentheses.close",
		],
		["tree", "multiply", [
			"x",
			["tree", ["function call",
				"y"
			], [
				["tree", "negate", [
					"z"
				]]
			]]
		]]
	],
	functioncall1: [
		[
			"amogus",
			"parentheses.open",
			"parentheses.close",
		],
		["tree", ["function call", "amogus"], [
		]]
	],
	functioncall2: [
		[
			"amogus",
			"parentheses.open",
			5,
			"parentheses.close",
		],
		["tree", ["function call", "amogus"], [
			5,
		]]
	],
	functioncall3: [
		[
			"parentheses.open",
			"amogus",
			"parentheses.close",
			"parentheses.open",
			5,
			"parentheses.close",
		],
		["tree", ["function call", "amogus"], [
			5,
		]]
	],
	functioncall4: [
		[
			"amogus",
			"parentheses.open",
			5,
			"punctuation.comma",
			6,
			"punctuation.comma",
			"boolean.true",
			"punctuation.comma",
			["string", `"sussy"`],
			"operator.string_concatenate",
			["string", `"amogus"`],
			"punctuation.comma",
			0,
			"parentheses.close",
		],
		["tree", ["function call", "amogus"], [
			5,
			6,
			"boolean.true",
			["tree", "string_concatenate", [
				["string", `"sussy"`],
				["string", `"amogus"`],
			]],
			0,
		]]
	],
	class_instantiation_no_args: [
		[
			"keyword.new",
			"amogus",
			"parentheses.open",
			"parentheses.close",
		],
		["tree", ["class instantiation", "amogus"], [

		]]
	],
	class_instantiation_one_arg: [
		[
			"keyword.new",
			"amogus",
			"parentheses.open",
			5,
			"parentheses.close",
		],
		["tree", ["class instantiation", "amogus"], [
			5,
		]]
	],
	class_instantiation_complex_args: [
		[
			"keyword.new",
			"amogus",
			"parentheses.open",
			5,
			"punctuation.comma",
			6,
			"punctuation.comma",
			"boolean.true",
			"punctuation.comma",
			["string", `"sussy"`],
			"operator.string_concatenate",
			["string", `"amogus"`],
			"punctuation.comma",
			0,
			"parentheses.close",
		],
		["tree", ["class instantiation", "amogus"], [
			5,
			6,
			"boolean.true",
			["tree", "string_concatenate", [
				["string", `"sussy"`],
				["string", `"amogus"`],
			]],
			0,
		]]
	],
	functioncallnested: [
		[
			"amogus",
			"parentheses.open",
			5,
			"punctuation.comma",
			6,
			"punctuation.comma",
			"sussy",
			"parentheses.open",
			"parentheses.close",
			"punctuation.comma",
			"baka",
			"parentheses.open",
			"sussy",
			"parentheses.open",
			"parentheses.close",
			"parentheses.close",
			"punctuation.comma",
			["string", `"sussy"`],
			"operator.string_concatenate",
			["string", `"amogus"`],
			"punctuation.comma",
			0,
			"parentheses.close",
		],
		["tree", ["function call", "amogus"], [
			5,
			6,
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
			0,
		]]
	],
	functioncallbad1: [
		[
			"amogus",
			"parentheses.open",
		],
		"error"
	],
	functioncallbad2: [
		[
			"amogus",
			"parentheses.open",
			"punctuation.comma",
			"parentheses.close",
		],
		"error"
	],
	functioncallbad3: [
		[
			"amogus",
			"parentheses.open",
			"punctuation.comma",
			"baka",
			"parentheses.close",
		],
		"error"
	],
	functioncallbad4: [
		[
			"amogus",
			"parentheses.open",
			"baka",
			"baka",
			"parentheses.close",
		],
		"error"
	],
	functioncallbad5: [
		[
			"amogus",
			"parentheses.open",
			"baka",
			"punctuation.comma",
			"baka",
			"punctuation.comma",
			"parentheses.close",
		],
		"error"
	],
	functioncallbad6: [
		[
			"amogus",
			"parentheses.open",
			5,
			"punctuation.comma",
			6,
			"punctuation.comma",
			"sussy",
			"parentheses.open",
			"parentheses.close",
			"baka",
			"parentheses.open",
			"sussy",
			"parentheses.open",
			"parentheses.close",
			"parentheses.close",
			"punctuation.comma",
			["string", `"sussy"`],
			"operator.string_concatenate",
			["string", `"amogus"`],
			"punctuation.comma",
			0,
			"parentheses.close",
		],
		"error"
	],
	array1: [
		[
			"amogus",
			"bracket.open",
			1,
			"bracket.close",
		],
		["tree", ["array access", "amogus"], [
			1,
		]]
	],
	array2: [
		[
			"amogus",
			"bracket.open",
			"a",
			"operator.add",
			"b",
			"bracket.close",
		],
		["tree", ["array access", "amogus"], [
			["tree", "add", [
				"a",
				"b",
			]],
		]]
	],
	arraynested1: [
		[
			"amogus",
			"bracket.open",
			"a",
			"operator.add",
			"sussy",
			"bracket.open",
			"b",
			"operator.add",
			"c",
			"bracket.close",
			"bracket.close",
		],
		["tree", ["array access", "amogus"], [
			["tree", "add", [
				"a",
				["tree", ["array access", "sussy"], [
					["tree", "add", [
						"b",
						"c",
					]],
				]]
			]],
		]]
	],
	arrayfunction1: [
		[
			"arr",
			"bracket.open",
			"a",
			"operator.add",
			"amogus",
			"parentheses.open",
			5,
			"punctuation.comma",
			6,
			"parentheses.close",
			"bracket.close",
		],
		["tree", ["array access", "arr"], [
			["tree", "add", [
				"a",
				["tree", ["function call", "amogus"], [
					5,
					6,
				]]
			]],
		]]
	],
	arrayfunction2: [
		[
			"amogus",
			"parentheses.open",
			"a",
			"punctuation.comma",
			"b",
			"operator.add",
			"amogus",
			"bracket.open",
			5,
			"punctuation.comma",
			6,
			"bracket.close",
			"parentheses.close",
		],
		["tree", ["function call", "amogus"], [
			"a",
			["tree", "add", [
				"b",
				["tree", ["array access", "amogus"], [
					5,
					6,
				]]
			]],
		]]
	],
	arraybad1: [
		[
			"amogus",
			"bracket.open",
			"bracket.close",
		],
		"error"
	],
	arraybad2: [
		[
			"amogus",
			"bracket.open",
			"bracket.open",
			"bracket.close",
			"bracket.close",
		],
		"error"
	],
	arrayfunctionbad1: [
		[
			"arr",
			"bracket.open",
			"a",
			"operator.add",
			"amogus",
			"parentheses.open",
			5,
			6,
			"parentheses.close",
			"bracket.close",
		],
		"error"
	],
	arrayfunctionbad2: [
		[
			"arr",
			"bracket.open",
			"a",
			"operator.add",
			"amogus",
			"parentheses.open",
			5,
			"punctuation.comma",
			6,
			"bracket.close",
			"parentheses.close",
		],
		"error"
	],
	negativenumber1: [
		[
			"operator.minus",
			5,
		],
		-5,
	],
	unary1: [
		[
			"operator.minus",
			"x",
		],
		["tree", "negate", [
			"x"
		]]
	],
	negativenumber2: [
		[
			5,
			"operator.multiply",
			"operator.minus",
			5,
		],
		["tree", "multiply", [
			5,
			-5,
		]]
	],
	unary2: [
		[
			5,
			"operator.multiply",
			"operator.minus",
			"x",
		],
		["tree", "multiply", [
			5,
			["tree", "negate", [
				"x",
			]]
		]]
	],
	negativenumber3: [
		[
			"operator.minus",
			"operator.minus",
			5,
		],
		["tree", "negate", [
			-5,
		]]
	],
	unary3: [
		[
			"operator.minus",
			"operator.minus",
			"x",
		],
		["tree", "negate", [
			["tree", "negate", [
				"x",
			]]
		]]
	],
	unary4: [
		[
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"x",
		],
		["tree", "negate", [
			["tree", "negate", [
				["tree", "negate", [
					["tree", "negate", [
						["tree", "negate", [
							["tree", "negate", [
								["tree", "negate", [
									["tree", "negate", [
										["tree", "negate", [
											["tree", "negate", [
												"x",
											]]
										]]
									]]
								]]
							]]
						]]
					]]
				]]
			]]
		]]
	],
	unary5: [
		[
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"parentheses.open",
			3,
			"operator.add",
			4,
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"x",
			"parentheses.close",
		],
		["tree", "negate", [
			["tree", "negate", [
				["tree", "negate", [
					["tree", "negate", [
						["tree", "subtract", [
							["tree", "add", [
								3,
								4
							]],
							["tree", "negate", [
								["tree", "negate", [
									["tree", "negate", [
										["tree", "negate", [
											["tree", "negate", [
												["tree", "negate", [
													"x",
												]]
											]]
										]]
									]]
								]]
							]]
						]]
					]]
				]]
			]]
		]]
	],
	unary6: [
		[
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"parentheses.open",
			3,
			"operator.add",
			4,
			"operator.multiply",
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"operator.minus",
			"operator.minus",
			5,
			"parentheses.close",
		],
		["tree", "negate", [
			["tree", "negate", [
				["tree", "negate", [
					["tree", "negate", [
						["tree", "add", [
							3,
							["tree", "multiply", [
								4,
								["tree", "negate", [
									["tree", "negate", [
										["tree", "negate", [
											["tree", "negate", [
												["tree", "negate", [
													-5,
												]]
											]]
										]]
									]]
								]]
							]]
						]]
					]]
				]]
			]]
		]]
	],
	nestedunary1: [
		[
			"amogus",
			"bracket.open",
			"operator.minus",
			"x",
			"bracket.close",
		],
		["tree", ["array access", "amogus"], [
			["tree", "negate", [
				"x",
			]]
		]]
	],
	unarybad1: [
		[
			5,
			"operator.minus",
			"operator.multiply",
			5,
		],
		"error"
	],
	unarybad2: [
		[
			5,
			"operator.minus",
		],
		"error"
	],
	access1: [
		[
			"amogus",
			"punctuation.period",
			"sussy",
		],
		["tree", "access", [
			"amogus",
			"sussy",
		]]
	],
	access2: [
		[
			"amogus",
			"punctuation.period",
			"sussy",
			"punctuation.period",
			"baka",
		],
		["tree", "access", [
			["tree", "access", [
				"amogus",
				"sussy",
			]],
			"baka",
		]]
	],
	access3: [
		[
			"amogus",
			"punctuation.period",
			"sussy",
			"bracket.open",
			"a",
			"operator.add",
			"b",
			"bracket.close",
			"punctuation.period",
			"baka",
		],
		["tree", "access", [
			["tree", ["array access",
				["tree", "access", [
					"amogus",
					"sussy",
				]]
			], [
				["tree", "add", [
					"a",
					"b",
				]]
			]],
			"baka",
		]]
	],
	access_function_call1: [
		[
			"amogus",
			"punctuation.period",
			"sussy",
			"parentheses.open",
			"parentheses.close",
		],
		["tree", ["function call",
			["tree", "access", [
				"amogus",
				"sussy",
			]]
		], []]
	],
	access_function_call2: [
		[
			"keyword.super",
			"punctuation.period",
			"keyword.new",
			"parentheses.open",
			"parentheses.close",
		],
		["tree", ["function call",
			["tree", "access", [
				"amogus",
				"sussy",
			]]
		], []]
	],
	access_function_call_args: [
		[
			"amogus",
			"punctuation.period",
			"sussy",
			"parentheses.open",
			5,
			"punctuation.comma",
			"parentheses.open",
			6,
			"parentheses.close",
			"punctuation.comma",
			"boolean.true",
			"punctuation.comma",
			["string", `"sussy"`],
			"operator.string_concatenate",
			"parentheses.open",
			["string", `"amogus"`],
			"parentheses.close",
			"punctuation.comma",
			0,
			"parentheses.close",
		],
		["tree", ["function call",
			["tree", "access", [
				"amogus",
				"sussy",
			]]
		], [
			5,
			6,
			"boolean.true",
			["tree", "string_concatenate", [
				["string", `"sussy"`],
				["string", `"amogus"`],
			]],
			0,
		]]
	],
	access_function_call_nested: [
		[
			"amogus",
			"punctuation.period",
			"sussy",
			"punctuation.period",
			"baka",
			"parentheses.open",
			5,
			"punctuation.comma",
			"amogus",
			"punctuation.period",
			"sussy",
			"punctuation.period",
			"baka",
			"parentheses.open",
			7,
			"punctuation.comma",
			6,
			"parentheses.close",
			"parentheses.close",
		],
		["tree", ["function call",
			["tree", "access", [
				["tree", "access", [
					"amogus",
					"sussy",
				]],
				"baka",
			]]
		], [
			5,
			["tree", ["function call",
				["tree", "access", [
					["tree", "access", [
						"amogus",
						"sussy",
					]],
					"baka",
				]]
			], [
				7,
				6,
			]]
		]]
	],
	access_array_nested: [
		[
			"amogus",
			"bracket.open",
			1,
			"bracket.close",
			"punctuation.period",
			"sussy",
			"bracket.open",
			1,
			"bracket.close",
		],
		["tree", ["array access", 
			["tree", "access", [
				["tree", ["array access", "amogus"], [
					1,
				]],
				"sussy",
			]]
		], [
			1,
		]]
	],
	access_invalid_property: [
		[
			"amogus",
			"punctuation.period",
			"parentheses.open",
			"sussy",
			"parentheses.close",
		],
		"error"
	],
	access_invalid_property2: [
		[
			"amogus",
			"punctuation.period",
			5,
		],
		"error"
	],
	access_invalid_property3: [
		[
			"amogus",
			"punctuation.period",
			5,
			"operator.minus",
			5,
		],
		"error"
	],
	pointerRef1: [
		[
			"operator.pointer",
			"amogus",
		],
		["tree", "pointer_reference", [
			"amogus"
		]]
	],
	pointerDeref1: [
		[
			"amogus",
			"operator.pointer",
		],
		["tree", "pointer_dereference", [
			"amogus"
		]]
	],
	pointerRef2: [
		[
			"operator.pointer",
			"operator.pointer",
			"amogus",
		],
		["tree", "pointer_reference", [
			["tree", "pointer_reference", [
				"amogus"
			]]
		]]
	],
	pointerDeref2: [
		[
			"amogus",
			"operator.pointer",
			"operator.pointer",
		],
		["tree", "pointer_dereference", [
			["tree", "pointer_dereference", [
				"amogus"
			]]
		]]
	],
	pointerRefDerefTriple: [
		[
			"operator.pointer",
			"operator.pointer",
			"operator.pointer",
			"amogus",
			"operator.pointer",
			"operator.pointer",
			"operator.pointer",
		],
		["tree", "pointer_reference", [
			["tree", "pointer_reference", [
				["tree", "pointer_reference", [
					["tree", "pointer_dereference", [
						["tree", "pointer_dereference", [
							["tree", "pointer_dereference", [
								"amogus"
							]],
						]],
					]],
				]],
			]],
		]],
	],
	SussyBaka: [
		[
			"parentheses.open",
			"a",
			"operator.greater_than_equal",
			"b",
			"operator.minus",
			"c",
			"operator.mod",
			"d",
			"operator.less_than",
			"e",
			"operator.add",
			"f",
			"operator.less_than_equal",
			"g",
			"operator.equal_to",
			"h",
			"operator.multiply",
			"i",
			"operator.divide",
			"j",
			"operator.greater_than",
			"k",
			"operator.integer_divide",
			"l",
			"operator.not_equal_to",
			"m",
			"operator.or",
			"n",
			"operator.and",
			"operator.not",
			"o",
			"parentheses.close",
			"operator.or",
			"parentheses.open",
			"a",
			"operator.greater_than_equal",
			"parentheses.open",
			"b",
			"operator.minus",
			"c",
			"parentheses.close",
			"operator.mod",
			"parentheses.open",
			"parentheses.open",
			"d",
			"operator.less_than",
			"parentheses.open",
			"e",
			"operator.add",
			"parentheses.open",
			"f",
			"operator.less_than_equal",
			"g",
			"parentheses.close",
			"operator.equal_to",
			"h",
			"operator.multiply",
			"i",
			"parentheses.close",
			"operator.divide",
			"j",
			"parentheses.close",
			"operator.greater_than",
			"k",
			"operator.integer_divide",
			"parentheses.open",
			"parentheses.open",
			"l",
			"parentheses.close",
			"parentheses.close",
			"operator.not_equal_to",
			"m",
			"operator.or",
			"n",
			"parentheses.close",
			"operator.and",
			"operator.not",
			"o",
			"parentheses.close",
		],
		//this tree is hugee
		//how to edit it?
		//dont
		["tree","or",[["tree","or",[["tree","not_equal_to",[["tree","equal_to",[["tree","less_than_equal",[["tree","less_than",[["tree","greater_than_equal",["a",["tree","subtract",["b",["tree","mod",["c","d"]]]]]],["tree","add",["e","f"]]]],"g"]],["tree","greater_than",[["tree","divide",[["tree","multiply",["h","i"]],"j"]],["tree","integer_divide",["k","l"]]]]]],"m"]],["tree","and",["n",["tree","not",["o"]]]]]],["tree","and",[["tree","greater_than_equal",["a",["tree","mod",[["tree","subtract",["b","c"]],["tree","or",[["tree","not_equal_to",[["tree","greater_than",[["tree","less_than",["d",["tree","divide",[["tree","equal_to",[["tree","add",["e",["tree","less_than_equal",["f","g"]]]],["tree","multiply",["h","i"]]]],"j"]]]],["tree","integer_divide",["k","l"]]]],"m"]],"n"]]]]]],["tree","not",["o"]]]]]]
	],
	SussyBaka2: [
		[
			"parentheses.open",
			"amogus",
			"parentheses.open",
			1,
			"operator.add",
			"parentheses.open",
			"parentheses.open",
			2,
			"parentheses.close",
			"parentheses.close",
			"operator.minus",
			3,
			"operator.multiply",
			4,
			"operator.divide",
			5,
			"operator.mod",
			6,
			"operator.integer_divide",
			7,
			"operator.greater_than",
			8,
			"operator.greater_than",
			"parentheses.open",
			9,
			"operator.equal_to",
			10,
			"parentheses.close",
			"operator.and",
			"operator.not",
			12,
			"punctuation.comma",
			["string", `"sus"`],
			"punctuation.comma",
			"x",
			"bracket.open",
			5,
			"bracket.close",
			"punctuation.comma",
			"amogus",
			"parentheses.open",
			"arr",
			"bracket.open",
			1,
			"punctuation.comma",
			5,
			"bracket.close",
			"punctuation.comma",
			"bigarr",
			"bracket.open",
			"sussy",
			"parentheses.open",
			"parentheses.close",
			"punctuation.comma",
			"sussier",
			"parentheses.open",
			37,
			"punctuation.comma",
			"y",
			"bracket.open",
			5,
			"operator.add",
			"z",
			"bracket.open",
			0,
			"punctuation.comma",
			"parentheses.open",
			"parentheses.open",
			0,
			"parentheses.close",
			"parentheses.close",
			"bracket.close",
			"bracket.close",
			"parentheses.close",
			"bracket.close",
			"punctuation.comma",
			5,
			"parentheses.close",
			"parentheses.close",
			"operator.add",
			0,
			"parentheses.close",
		],
		//yet another huge tree
		["tree","add",[["tree",["function call","amogus"],[["tree","and",[["tree","greater_than",[["tree","greater_than",[["tree","subtract",[["tree","add",[1,2]],["tree","integer_divide",[["tree","mod",[["tree","divide",[["tree","multiply",[3,4]],5]],6]],7]]]],8]],["tree","equal_to",[9,10]]]],["tree","not",[12]]]],["string","\"sus\""],["tree",["array access","x"],[5]],["tree",["function call","amogus"],[["tree",["array access","arr"],[1,5]],["tree",["array access","bigarr"],[["tree",["function call","sussy"],[]],["tree",["function call","sussier"],[37,["tree",["array access","y"],[["tree","add",[5,["tree",["array access","z"],[0,0]]]]]]]]]],5]]]],0]]
	]
});

const parseStatementTests = ((data:Record<string, [program:_Token[], output:_Statement | "error", context?:[ProgramASTBranchNodeType, typeof Statement]]>) =>
	Object.entries(data).map<
		[name:string, program:Token[], output:jasmine.Expected<Statement> | "error", context:[ProgramASTBranchNodeType, Statement] | null]
	>(([name, [program, output, context]]) => [
		name,
		program.map(process_Token),
		output == "error" ? "error" : applyAnyRange(process_Statement(output)),
		context ? [context[0], fakeStatement(context[1])] : null
	]
))({
	output1: [
		[
			"keyword.output",
			["string", `"amogus"`],
		],
		["Output", ["string", `"amogus"`]]
	],
	output2: [
		[
			"keyword.output",
			["string", `"amogus"`],
			"punctuation.comma",
			["string", `"amogus"`],
		],
		["Output", ["string", `"amogus"`], ["string", `"amogus"`]]
	],
	output3: [
		[
			"keyword.output",
			["string", `"amogus"`],
			"punctuation.comma",
			5,
			"punctuation.comma",
			["string", `"amogus"`],
		],
		["Output", ["string", `"amogus"`], 5, ["string", `"amogus"`]]
	],
	outputBad1: [
		[
			"keyword.output",
			["string", `"amogus"`],
			5,
			"punctuation.comma",
			["string", `"amogus"`],
		],
		"error"
	],
	outputBad2: [
		[
			"keyword.output",
			["string", `"amogus"`],
			"punctuation.comma",
			5,
			"punctuation.comma",
			["string", `"amogus"`],
			"punctuation.comma",
		],
		"error"
	],
	input: [
		[
			"keyword.input",
			"amogus",
		],
		[InputStatement, [
			"keyword.input",
			"amogus",
		]]
	],
	inputBad1: [
		[
			"keyword.input",
			["string", `"amogus"`],
		],
		"error"
	],
	inputBad2: [
		[
			"keyword.input",
			5,
		],
		"error"
	],
	declare1: [
		[
			"keyword.declare",
			"amogus",
			"punctuation.colon",
			"INTEGER",
		],
		["Declare", "amogus", "INTEGER"]
	],
	declare2: [
		[
			"keyword.declare",
			"amogus",
			"punctuation.comma",
			"sussy",
			"punctuation.colon",
			"INTEGER",
		],
		["Declare", ["amogus", "sussy"], "INTEGER"]
	],
	declare3: [
		[
			"keyword.declare",
			"amogus",
			"punctuation.colon",
			"keyword.array",
			"bracket.open",
			0,
			"punctuation.colon",
			99,
			"bracket.close",
			"keyword.of",
			"INTEGER",
		],
		["Declare", "amogus", [[[0, 99]], "INTEGER"]],
	],
	declareBad1: [
		[
			"keyword.declare",
			"punctuation.colon",
			"INTEGER",
		],
		"error"
	],
	declareBad2: [
		[
			"keyword.declare",
			"amogus",
			"punctuation.comma",
			"punctuation.colon",
			"INTEGER",
		],
		"error"
	],
	declareBad3: [
		[
			"keyword.declare",
			"amogus",
			"sussy",
			"punctuation.colon",
			"INTEGER",
		],
		"error"
	],
	define: [
		[
			"keyword.define",
			"amogus",
			"parentheses.open",
			1,
			"punctuation.comma",
			2,
			"punctuation.comma",
			3,
			"parentheses.close",
			"punctuation.colon",
			"setofinteger",
		],
		[DefineStatement, [
			"keyword.define",
			"amogus",
			"parentheses.open",
			1,
			"punctuation.comma",
			2,
			"punctuation.comma",
			3,
			"parentheses.close",
			"punctuation.colon",
			"setofinteger",
		]]
	],
	typePointer: [
		[
			"keyword.type",
			"amogus",
			"operator.equal_to",
			"operator.pointer",
			"INTEGER",
		],
		[TypePointerStatement, [
			"keyword.type",
			"amogus",
			"operator.equal_to",
			"operator.pointer",
			"INTEGER",
		]]
	],
	typePointer2: [
		[
			"keyword.type",
			"sussy",
			"operator.equal_to",
			"operator.pointer",
			"RecordThing",
		],
		[TypePointerStatement, [
			"keyword.type",
			"sussy",
			"operator.equal_to",
			"operator.pointer",
			"RecordThing",
		]]
	],
	typePointer_array: [
		[
			"keyword.type",
			"sussy",
			"operator.equal_to",
			"operator.pointer",
			"keyword.array",
			"bracket.open",
			1,
			"punctuation.colon",
			10,
			"bracket.close",
			"keyword.of",
			"INTEGER",
		],
		[TypePointerStatement, [
			"keyword.type",
			"sussy",
			"operator.equal_to",
			"operator.pointer",
			[
				[
					[1, 10]
				],
				"INTEGER",
			],
		]]
	],
	typePointer_invalid: [
		[
			"keyword.type",
			"sussy",
			"operator.equal_to",
			"RecordThing",
		],
		"error"
	],
	typeEnum: [
		[
			"keyword.type",
			"amogus",
			"operator.equal_to",
			"parentheses.open",
			"amogus",
			"punctuation.comma",
			"sugoma",
			"parentheses.close",
		],
		[TypeEnumStatement, [
			"keyword.type",
			"amogus",
			"operator.equal_to",
			"parentheses.open",
			"amogus",
			"punctuation.comma",
			"sugoma",
			"parentheses.close",
		]]
	],
	typeEnum_invalid_extra_comma: [
		[
			"keyword.type",
			"amogus",
			"operator.equal_to",
			"parentheses.open",
			"amogus",
			"punctuation.comma",
			"parentheses.close",
		],
		"error"
	],
	typeEnum_invalid_missing_parens: [
		[
			"keyword.type",
			"amogus",
			"operator.equal_to",
			"amogus",
			"punctuation.comma",
			"sugoma",
		],
		"error"
	],
	typeEnum_invalid_duplicate: [
		[
			"keyword.type",
			"amogus",
			"operator.equal_to",
			"parentheses.open",
			"amogus",
			"punctuation.comma",
			"amogus",
			"parentheses.close",
		],
		"error"
	],
	typeSet: [
		[
			"keyword.type",
			"amogus",
			"operator.equal_to",
			"keyword.set",
			"keyword.of",
			"INTEGER",
		],
		[TypeSetStatement, [
			"keyword.type",
			"amogus",
			"operator.equal_to",
			"keyword.set",
			"keyword.of",
			"INTEGER",
		]]
	],
	typeSet_invalid_nonprimitive: [
		[
			"keyword.type",
			"amogus",
			"operator.equal_to",
			"keyword.set",
			"keyword.of",
			"amogusType",
		],
		"error"
	],
	typeRecord: [
		[
			"keyword.type",
			"amogus",
		],
		[TypeRecordStatement, [
			"keyword.type",
			"amogus",
		]]
	],
	assign: [
		[
			"amogus",
			"operator.assignment",
			31415,
		],
		[AssignmentStatement, [
			"amogus",
			"operator.assignment",
			31415,
		]]
	],
	assign2: [
		[
			"x",
			"operator.assignment",
			"y",
		],
		[AssignmentStatement, [
			"x",
			"operator.assignment",
			"y",
		]]
	],
	assignbad1: [
		[
			5,
			"operator.assignment",
			"y",
		],
		"error"
	],
	if: [
		[
			"keyword.if",
			5,
			"operator.less_than",
			"x",
			"keyword.then",
		],
		[IfStatement, [
			"keyword.if",
			["tree", "less_than", [
				5,
				"x",
			]],
			"keyword.then",
		]]
	],
	switch1: [
		[
			"keyword.case",
			"keyword.of",
			"x",
		],
		["Switch", "x"]
	],
	switch2: [
		[
			"keyword.case",
			"keyword.of",
			["string", `"hello"`],
		],
		["Switch", ["string", `"hello"`]]
	],
	casebranch1: [
		[
			5,
			"punctuation.colon",
		],
		[CaseBranchStatement, [
			5,
			"punctuation.colon",
		]],
		["switch", SwitchStatement]
	],
	casebranch2: [
		[
			["string", `"hello"`],
			"punctuation.colon",
		],
		[CaseBranchStatement, [
			["string", `"hello"`],
			"punctuation.colon",
		]],
		["switch", SwitchStatement]
	],
	casebranch3: [
		[
			"operator.minus",
			5,
			"punctuation.colon",
		],
		[CaseBranchStatement, [
			-5,
			"punctuation.colon",
		]],
		["switch", SwitchStatement]
	],
	casebranch4: [
		[
			"keyword.otherwise",
			"punctuation.colon",
		],
		[CaseBranchStatement, [
			"keyword.otherwise",
			"punctuation.colon",
		]],
		["switch", SwitchStatement]
	],
	casebranch_invalid_expr: [
		[
			"operator.minus",
			"operator.minus",
			5,
			"punctuation.colon",
		],
		"error",
		["switch", SwitchStatement]
	],
	casebranch_invalid_notstatic: [
		[
			"x",
			"punctuation.colon",
		],
		"error",
		["switch", SwitchStatement]
	],
	casebranch_invalid_context: [
		[
			5,
			"punctuation.colon",
		],
		"error",
		["if", IfStatement]
	],
	casebranch_invalid_context_null: [
		[
			5,
			"punctuation.colon",
		],
		"error"
	],
	casebranchrange_1: [
		[
			5,
			"keyword.to",
			5,
			"punctuation.colon",
		],
		[CaseBranchRangeStatement, [
			5,
			"keyword.to",
			5,
			"punctuation.colon",
		]],
		["switch", SwitchStatement]
	],
	casebranchrange_2: [
		[
			["char", 'c'],
			"keyword.to",
			["char", 'e'],
			"punctuation.colon",
		],
		[CaseBranchRangeStatement, [
			["char", 'c'],
			"keyword.to",
			["char", 'e'],
			"punctuation.colon",
		]],
		["switch", SwitchStatement]
	],
	casebranchrange_3: [
		[
			"operator.minus",
			5,
			"keyword.to",
			5,
			"punctuation.colon",
		],
		[CaseBranchRangeStatement, [
			-5,
			"keyword.to",
			5,
			"punctuation.colon",
		]],
		["switch", SwitchStatement]
	],
	casebranchrange_4: [
		[
			"operator.minus",
			5,
			"keyword.to",
			"operator.minus",
			1,
			"punctuation.colon",
		],
		[CaseBranchRangeStatement, [
			-5,
			"keyword.to",
			-1,
			"punctuation.colon",
		]],
		["switch", SwitchStatement]
	],
	casebranchrange_invalid_notstatic: [
		[
			"operator.minus",
			5,
			"keyword.to",
			"operator.minus",
			"x",
			"punctuation.colon",
		],
		"error",
		["switch", SwitchStatement]
	],
	casebranchrange_invalid_type_1: [
		[
			"operator.minus",
			5,
			"keyword.to",
			"boolean.true",
			"punctuation.colon",
		],
		"error",
		["switch", SwitchStatement]
	],
	casebranchrange_invalid_type_2: [
		[
			["string", `"amogus"`],
			"keyword.to",
			5,
			"punctuation.colon",
		],
		"error",
		["switch", SwitchStatement]
	],
	casebranchrange_invalid_type_3: [
		[
			["char", `'a'`],
			"keyword.to",
			5,
			"punctuation.colon",
		],
		"error",
		["switch", SwitchStatement]
	],
	for_simple: [
		[
			"keyword.for",
			"x",
			"operator.assignment",
			1,
			"keyword.to",
			10,
		],
		[ForStatement, [
			"keyword.for",
			"x",
			"operator.assignment",
			1,
			"keyword.to",
			10,
		]]
	],
	for_expr: [
		[
			"keyword.for",
			"x",
			"operator.assignment",
			"y",
			"keyword.to",
			"y",
			"operator.add",
			"14",
		],
		[ForStatement, [
			"keyword.for",
			"x",
			"operator.assignment",
			"y",
			"keyword.to",
			["tree", "add", [
				"y",
				"14",
			]]
		]]
	],
	for_step: [
		[
			"keyword.for",
			"x",
			"operator.assignment",
			"y",
			"keyword.to",
			"y",
			"operator.add",
			"14",
			"keyword.step",
			2,
		],
		[ForStepStatement, [
			"keyword.for",
			"x",
			"operator.assignment",
			"y",
			"keyword.to",
			["tree", "add", [
				"y",
				"14",
			]],
			"keyword.step",
			2,
		]],
	],
	until1: [
		[
			"keyword.dowhile_end",
			5,
			"operator.less_than",
			"x",
		],
		["DoWhileEnd", ["tree", "less_than", [
			5,
			"x",
		]]],
		["dowhile", DoWhileStatement]
	],
	until2: [
		[
			"keyword.dowhile_end",
			"operator.not",
			"x",
		],
		["DoWhileEnd", ["tree", "not", [
			"x",
		]]],
		["dowhile", DoWhileStatement]
	],
	procedure1: [
		[
			"keyword.procedure",
			"func",
			"parentheses.open",
			"parentheses.close",
		],
		["Procedure", "func", []]
	],
	procedure2: [
		[
			"keyword.procedure",
			"func",
			"parentheses.open",
			"x",
			"punctuation.colon",
			"INTEGER",
			"parentheses.close",
		],
		["Procedure", "func", [["x", "INTEGER"]]]
	],
	classproperty1: [
		[
			"keyword.class_modifier.public",
			"x",
			"punctuation.colon",
			"INTEGER",
		],
		["ClassProperty", "public", "x", "INTEGER"],
		["class", ClassStatement]
	],
	classproperty_multiple: [
		[
			"keyword.class_modifier.public",
			"x",
			"punctuation.comma",
			"y",
			"punctuation.comma",
			"z",
			"punctuation.colon",
			"INTEGER",
		],
		["ClassProperty", "public", ["x", "y", "z"], "INTEGER"],
		["class", ClassStatement]
	],
	classproperty_multiple_type: [
		[
			"keyword.class_modifier.public",
			"x",
			"punctuation.comma",
			"y",
			"punctuation.comma",
			"z",
			"punctuation.colon",
			"keyword.array",
			"bracket.open",
			1,
			"punctuation.colon",
			10,
			"bracket.close",
			"keyword.of",
			"INTEGER",
		],
		["ClassProperty", "public", ["x", "y", "z"], [[[1, 10]], "INTEGER"]],
		["class", ClassStatement]
	],
	classproperty_invalid_context: [
		[
			"keyword.class_modifier.public",
			"x",
			"punctuation.colon",
			"INTEGER",
		],
		"error"
	],
	classprocedure1: [
		[
			"keyword.class_modifier.public",
			"keyword.procedure",
			"x",
			"parentheses.open",
			"parentheses.close",
		],
		["ClassProcedure", "public", "x", []],
		["class", ClassStatement]
	],
	classprocedure_new: [
		[
			"keyword.class_modifier.public",
			"keyword.procedure",
			"NEW",
			"parentheses.open",
			"parentheses.close",
		],
		["ClassProcedure", "public", "NEW", []],
		["class", ClassStatement]
	],
	classprocedure_args: [
		[
			"keyword.class_modifier.public",
			"keyword.procedure",
			"x",
			"parentheses.open",
			"y",
			"punctuation.colon",
			"INTEGER",
			"punctuation.comma",
			"z",
			"punctuation.colon",
			"STRING",
			"parentheses.close",
		],
		["ClassProcedure", "public", "x", [["y", "INTEGER"], ["z", "STRING"]]],
		["class", ClassStatement]
	],
	classfunction_args: [
		[
			"keyword.class_modifier.public",
			"keyword.function",
			"x",
			"parentheses.open",
			"y",
			"punctuation.colon",
			"INTEGER",
			"punctuation.comma",
			"z",
			"punctuation.colon",
			"STRING",
			"parentheses.close",
			"keyword.returns",
			"STRING",
		],
		["ClassFunction", "public", "x", [["y", "INTEGER"], ["z", "STRING"]], "STRING"],
		["class", ClassStatement]
	],
	classprocedure_invalid_context: [
		[
			"keyword.class_modifier.public",
			"keyword.procedure",
			"x",
			"parentheses.open",
			"parentheses.close",
		],
		"error"
	],
	// empty: [
	// 	[
	// 	],
	// 	"error"
	// ],
	randomjunk1: [
		[
			31415,
			"amogus",
			"operator.assignment",
		],
		"error"
	],
	randomjunk2: [
		[
			"amogus",
			31415,
			"keyword.output",
		],
		"error"
	],
	incompleteDeclare1: [
		[
			"keyword.declare",
		],
		"error"
	],
	incompleteDeclare2: [
		[
			"keyword.declare",
			"amogus",
		],
		"error"
	],
	incompleteDeclare3: [
		[
			"keyword.declare",
			"amogus",
			"punctuation.colon",
		],
		"error"
	],
	incompleteDeclare4: [
		[
			"keyword.declare",
			"amogus",
			"INTEGER",
		],
		"error"
	],
	incompleteOutput: [
		[
			"keyword.output",
		],
		"error"
	],
	incompleteIf1: [
		[
			"keyword.if",
		],
		"error"
	],
	incompleteIf2: [
		[
			"keyword.if",
			"amogus",
		],
		"error"
	],
	incompleteIf3: [
		[
			"keyword.if",
			"amogus",
			"operator.less_than",
		],
		"error"
	],
	incompleteIf4: [
		[
			"keyword.if",
			"amogus",
			"operator.less_than",
			5,
		],
		"error"
	],
	incompleteIf5: [
		[
			"keyword.if",
			"keyword.then",
		],
		"error"
	],
	incompleteIf6: [
		[
			"keyword.if",
			"operator.less_than",
			"keyword.then",
		],
		"error"
	],
	incompleteIf7: [
		[
			"keyword.if",
			"amogus",
			"operator.less_than",
			"keyword.then",
		],
		"error"
	],
	incompleteProcedure1: [
		[
			"keyword.procedure",
			"amogus",
			"parentheses.open",
		],
		"error"
	],
});

const parseProgramTests = ((data:Record<string, [program:_Token[], output:_ProgramAST | "error"]>) =>
	Object.entries(data).map<
		[name:string, program:TokenizedProgram, output:jasmine.Expected<ProgramAST> | "error"]
	>(([name, [program, output]]) => [
		name,
		{
			program: "", //SPECNULL
			tokens: program.map(process_Token)
		},
		output == "error" ? "error" : applyAnyRange(process_ProgramAST(output))
	]
))({
	output: [
		[
			"keyword.output",
			["string", `"amogus"`],
			"newline",
		],[
			["Output", ["string", `"amogus"`]],
		]
	],
	outputInputDeclareAssign: [
		[
			"keyword.output",
			["string", `"amogus"`],
			"newline",
			"keyword.input",
			"amogus",
			"newline",
			"keyword.declare",
			"amogus",
			"punctuation.colon",
			"INTEGER",
			"newline",
			"amogus",
			"operator.assignment",
			31415,
		],[
			["Output", ["string", `"amogus"`]],
			[InputStatement, [
				"keyword.input",
				"amogus",
			]],
			["Declare", "amogus", "INTEGER"],
			[AssignmentStatement, [
				"amogus",
				"operator.assignment",
				31415,
			]],
		]
	],
	if: [
		[
			"keyword.input",
			"x",
			"newline",
			"keyword.if",
			"x",
			"operator.less_than",
			5,
			"keyword.then",
			"newline",
			"keyword.output",
			["string", `"amogus"`],
			"newline",
			"keyword.if_end",
		],
		[
			[InputStatement, [
				"keyword.input",
				"x"
			]],
			{
				type: "if",
				controlStatements: [
					[IfStatement, [
						"keyword.if",
						["tree", "less_than", [
							"x",
							5,
						]],
						"keyword.then",
					]],
					["IfEnd"]
				],
				nodeGroups: [[
					["Output", ["string", `"amogus"`]],
				]],
			}
		],
	],
	nested_if: [
		[
			"keyword.input",
			"x",
			"newline",
			"keyword.if",
			"x",
			"operator.less_than",
			5,
			"keyword.then",
			"newline",
			"keyword.output",
			["string", `"X is less than 5"`],
			"newline",
			"keyword.if",
			"x",
			"operator.less_than",
			2,
			"keyword.then",
			"newline",
			"keyword.output",
			["string", `"X is also less than 2"`],
			"newline",
			"keyword.if_end",
			"newline",
			"keyword.if_end",
		],
		[
			[InputStatement, [
				"keyword.input",
				"x",
			]],
			{
				type: "if",
				controlStatements: [
					[IfStatement, [
						"keyword.if",
						["tree", "less_than", [
							"x",
							5,
						]],
						"keyword.then",
					]],
					["IfEnd"],
				],
				nodeGroups: [[
					["Output", ["string", `"X is less than 5"`]],
					{
						type: "if",
						controlStatements: [
							[IfStatement, [
								"keyword.if",
								["tree", "less_than", [
									"x",
									2,
								]],
								"keyword.then",
							]],
							["IfEnd"]
						],
						nodeGroups: [[
							["Output", ["string", `"X is also less than 2"`]],
						]],
					}
				]],
			}
		],
	],
	typeRecord1: [
		[
			"keyword.type",
			"amogus",
			"newline",
			"keyword.declare",
			"prop1",
			"punctuation.colon",
			"INTEGER",
			"newline",
			"keyword.declare",
			"prop2",
			"punctuation.colon",
			"udt",
			"newline",
			"keyword.type_end",
		],
		[
			{
				type: "type",
				controlStatements: [
					[TypeRecordStatement, [
						"keyword.type",
						"amogus",
					]],
					["TypeEnd"],
				],
				nodeGroups: [[
					["Declare", "prop1", "INTEGER"],
					["Declare", "prop2", "udt"],
				]]
			}
		]
	],
	typeRecord_invalid_extraneous: [
		[
			"keyword.type",
			"amogus",
			"newline",
			"keyword.declare",
			"prop1",
			"punctuation.colon",
			"INTEGER",
			"newline",
			"keyword.declare",
			"prop2",
			"punctuation.colon",
			"udt",
			"newline",
			"sussybaka",
			"operator.assignment",
			9,
			"keyword.type_end",
		],
		"error"
	],
	case_simple: [
		[
			"keyword.case",
			"keyword.of",
			"x",
			"newline",
			1,
			"punctuation.colon",
			"keyword.output",
			"x",
			"newline",
			"keyword.output",
			["string", `"amogus"`],
			"newline",
			2,
			"punctuation.colon",
			"newline",
			"keyword.output",
			["string", `"sussy"`],
			"newline",
			"keyword.case_end",
		],
		[{
			type: "switch",
			controlStatements: [
				["Switch", "x"],
				[CaseBranchStatement, [
					1,
					"punctuation.colon",
				]],
				[CaseBranchStatement, [
					2,
					"punctuation.colon",
				]],
				["SwitchEnd"],
			],
			nodeGroups: [
				[],
				[
					["Output", "x"],
					["Output", ["string", `"amogus"`]],
				],
				[
					["Output", ["string", `"sussy"`]],
				],
			]
		}]
	],
	case_complex: [
		[
			"keyword.case",
			"keyword.of",
			"x",
			"newline",
			1,
			"punctuation.colon",
			"keyword.dowhile",
			"newline",
			"keyword.output",
			"x",
			"newline",
			"keyword.dowhile_end",
			"boolean.true",
			"newline",
			"operator.minus",
			1,
			"punctuation.colon",
			"keyword.output",
			"x",
			"newline",
			1,
			"keyword.to",
			2,
			"punctuation.colon",
			"keyword.output",
			"x",
			"newline",
			"operator.minus",
			1,
			"keyword.to",
			2,
			"punctuation.colon",
			"keyword.output",
			"x",
			"newline",
			"operator.minus",
			2,
			"keyword.to",
			"operator.minus",
			1,
			"punctuation.colon",
			"keyword.output",
			"x",
			"newline",
			"keyword.otherwise",
			"punctuation.colon",
			"keyword.output",
			["string", `"nope"`],
			"newline",
			"keyword.case_end",
		],
		[{
			type: "switch",
			controlStatements: [
				["Switch", "x"],
				[CaseBranchStatement, [
					1,
					"punctuation.colon",
				]],
				[CaseBranchStatement, [
					-1,
					"punctuation.colon",
				]],
				[CaseBranchRangeStatement, [
					1,
					"keyword.to",
					2,
					"punctuation.colon",
				]],
				[CaseBranchRangeStatement, [
					-1,
					"keyword.to",
					2,
					"punctuation.colon",
				]],
				[CaseBranchRangeStatement, [
					-2,
					"keyword.to",
					-1,
					"punctuation.colon",
				]],
				[CaseBranchStatement, [
					"keyword.otherwise",
					"punctuation.colon",
				]],
				["SwitchEnd"],
			],
			nodeGroups: [
				[],
				[
					{
						type: "dowhile",
						controlStatements: [
							["DoWhile"],
							["DoWhileEnd", "boolean.true"],
						],
						nodeGroups: [[
							["Output", "x"],
						]]
					},
				],
				[
					["Output", "x"],
				],
				[
					["Output", "x"],
				],
				[
					["Output", "x"],
				],
				[
					["Output", "x"],
				],
				[
					["Output", ["string", `"nope"`]],
				]
			]
		}]
	],
	case_invalid_statements_before_first_branch: [
		[
			"keyword.case",
			"keyword.of",
			"x",
			"newline",
			"keyword.output",
			"amogus",
			"newline",
			1,
			"punctuation.colon",
			"keyword.output",
			"x",
			"newline",
			"keyword.output",
			["string", `"amogus"`],
			"newline",
			2,
			"punctuation.colon",
			"newline",
			"keyword.output",
			["string", `"sussy"`],
			"newline",
			"keyword.case_end",
		],
		"error"
	],
	for_simple: [
		[
			"keyword.for",
			"x",
			"operator.assignment",
			1,
			"keyword.to",
			10,
			"newline",
			"keyword.output",
			"x",
			"newline",
			"keyword.for_end",
			"x",
		],
		[{
			type: "for",
			controlStatements: [
				[ForStatement, [
					"keyword.for",
					"x",
					"operator.assignment",
					1,
					"keyword.to",
					10,
				]],
				["ForEnd", "x"]
			],
			nodeGroups: [[
				["Output", "x"],
			]],
		}]
	],
	for_expr: [
		[
			"keyword.for",
			"x",
			"operator.assignment",
			"y",
			"keyword.to",
			"y",
			"operator.add",
			"14",
			"newline",
			"keyword.output",
			"x",
			"newline",
			"keyword.for_end",
			"x",
		],
		[{
			type: "for",
			controlStatements: [
				[ForStatement, [
					"keyword.for",
					"x",
					"operator.assignment",
					"y",
					"keyword.to",
					["tree", "add", [
						"y",
						"14",
					]]
				]],
				["ForEnd", "x"]
			],
			nodeGroups: [[
				["Output", "x"],
			]],
		}]
	],
	for_step: [
		[
			"keyword.for",
			"x",
			"operator.assignment",
			"y",
			"keyword.to",
			"y",
			"operator.add",
			"14",
			"keyword.step",
			2,
			"newline",
			"keyword.output",
			"x",
			"newline",
			"keyword.for_end",
			"x",
		],
		[{
			type: "for.step",
			controlStatements: [
				[ForStepStatement, [
					"keyword.for",
					"x",
					"operator.assignment",
					"y",
					"keyword.to",
					["tree", "add", [
						"y",
						"14",
					]],
					"keyword.step",
					2,
				]],
				["ForEnd", "x"]
			],
			nodeGroups: [[
				["Output", "x"],
			]],
		}]
	],
	class: [
		[
			"keyword.class",
			"amogus",
			"newline",
			"keyword.class_modifier.public",
			"name",
			"punctuation.colon",
			"STRING",
			"newline",
			"keyword.class_modifier.public",
			"susLevel",
			"punctuation.colon",
			"INTEGER",
			"newline",
			"keyword.class_modifier.public",
			"keyword.procedure",
			"NEW",
			"parentheses.open",
			"Name",
			"punctuation.colon",
			"STRING",
			"punctuation.comma",
			"SusLevel",
			"punctuation.colon",
			"INTEGER",
			"parentheses.close",
			"newline",
			"name",
			"operator.assignment",
			"Name",
			"newline",
			"susLevel",
			"operator.assignment",
			"SusLevel",
			"newline",
			"keyword.procedure_end",
			"newline",
			"keyword.class_end",
		],
		[{
			type: "class",
			controlStatements: [
				["Class", "amogus"],
				["ClassEnd"]
			],
			nodeGroups: [[
				["ClassProperty", "public", "name", "STRING"],
				["ClassProperty", "public", "susLevel", "INTEGER"],
				{
					type: "class_procedure",
					controlStatements: [
						["ClassProcedure", "public", "NEW", [["Name", "STRING"], ["SusLevel", "INTEGER"]]],
						["ClassProcedureEnd"],
					],
					nodeGroups: [[
						[AssignmentStatement, [
							"name",
							"operator.assignment",
							"Name",
						]],
						[AssignmentStatement, [
							"susLevel",
							"operator.assignment",
							"SusLevel",
						]],
					]]
				}
			]]
		}]
	]
});

const functionArgumentTests = ((data:Record<string,
	[input:_Token[], output:[string, type:_UnresolvedVariableType, passMode?:PassMode][]
| "error"]>) => Object.entries(data).map<
	{name:string; input:Token[]; output:[string,
		{type:UnresolvedVariableType; passMode:jasmine.ExpectedRecursive<PassMode>}
	][] | "error"}
>(([name, [input, output]]) => ({
	name,
	input: input.map(process_Token),
	output: output == "error" ? "error" :
		output.map(
			([name, type, passMode]) => [name, {type: process_UnresolvedVariableType(type), passMode: passMode ?? jasmine.any(String)}]
		)
})))({
	blank: [[

	],[

	]],
	oneArg: [[
		"arg",
		"punctuation.colon",
		"INTEGER",
	],[
		["arg", "INTEGER"]
	]],
	twoArgs: [[
		"arg",
		"punctuation.colon",
		"INTEGER",
		"punctuation.comma",
		"arg2",
		"punctuation.colon",
		"BOOLEAN",
	],[
		["arg", "INTEGER"],
		["arg2", "BOOLEAN"],
	]],
	threeArgs: [[
		"arg",
		"punctuation.colon",
		"INTEGER",
		"punctuation.comma",
		"arg2",
		"punctuation.colon",
		"BOOLEAN",
		"punctuation.comma",
		"arg3",
		"punctuation.colon",
		"STRING",
	],[
		["arg", "INTEGER"],
		["arg2", "BOOLEAN"],
		["arg3", "STRING"],
	]],
	typeRepetition: [[
		"arg",
		"punctuation.comma",
		"arg2",
		"punctuation.comma",
		"arg3",
		"punctuation.colon",
		"STRING",
	],[
		["arg", "STRING"],
		["arg2", "STRING"],
		["arg3", "STRING"],
	]],
	typeRepetition2: [[
		"arg1",
		"punctuation.comma",
		"arg2",
		"punctuation.comma",
		"arg3",
		"punctuation.colon",
		"BOOLEAN",
	],[
		["arg1", "BOOLEAN"],
		["arg2", "BOOLEAN"],
		["arg3", "BOOLEAN"],
	]],
	passModeDefault: [[
		"arg",
		"punctuation.colon",
		"INTEGER",
	],[
		["arg", "INTEGER", "value"],
	]],
	passModeSpecified1: [[
		"keyword.pass_mode.by_reference",
		"arg",
		"punctuation.colon",
		"INTEGER",
	],[
		["arg", "INTEGER", "reference"],
	]],
	passModeSpecified2: [[
		"keyword.pass_mode.by_value",
		"arg",
		"punctuation.colon",
		"INTEGER",
	],[
		["arg", "INTEGER", "value"],
	]],
	passModeSpecified3: [[
		"keyword.pass_mode.by_reference",
		"arg",
		"punctuation.colon",
		"INTEGER",
		"punctuation.comma",
		"arg2",
		"punctuation.colon",
		"BOOLEAN",
	],[
		["arg", "INTEGER", "reference"],
		["arg2", "BOOLEAN", "reference"],
	]],
	passModeSpecified4: [[
		"keyword.pass_mode.by_value",
		"arg",
		"punctuation.colon",
		"INTEGER",
		"punctuation.comma",
		"arg2",
		"punctuation.colon",
		"BOOLEAN",
	],[
		["arg", "INTEGER", "value"],
		["arg2", "BOOLEAN", "value"],
	]],
	passModeSpecifiedTwice: [[
		"keyword.pass_mode.by_value",
		"arg",
		"punctuation.colon",
		"INTEGER",
		"punctuation.comma",
		"keyword.pass_mode.by_value",
		"arg2",
		"punctuation.colon",
		"BOOLEAN",
	],[
		["arg", "INTEGER", "value"],
		["arg2", "BOOLEAN", "value"],
	]],
	passModeSpecifiedTwiceDifferently: [[
		"keyword.pass_mode.by_reference",
		"arg",
		"punctuation.colon",
		"INTEGER",
		"punctuation.comma",
		"keyword.pass_mode.by_value",
		"arg2",
		"punctuation.colon",
		"BOOLEAN",
	],[
		["arg", "INTEGER", "reference"],
		["arg2", "BOOLEAN", "value"],
	]],
	passModeSpecifiedTwiceDifferently2: [[
		"keyword.pass_mode.by_reference",
		"arg",
		"punctuation.colon",
		"INTEGER",
		"punctuation.comma",
		"keyword.pass_mode.by_value",
		"arg2",
		"punctuation.colon",
		"BOOLEAN",
		"punctuation.comma",
		"arg3",
		"punctuation.colon",
		"STRING",
	],[
		["arg", "INTEGER", "reference"],
		["arg2", "BOOLEAN", "value"],
		["arg3", "STRING", "value"],
	]],
	weirdCombination1: [[
		"keyword.pass_mode.by_reference",
		"arg",
		"punctuation.comma",
		"keyword.pass_mode.by_value",
		"arg2",
		"punctuation.colon",
		"BOOLEAN",
		"punctuation.comma",
		"arg3",
		"punctuation.colon",
		"STRING",
	],[
		["arg", "BOOLEAN", "reference"],
		["arg2", "BOOLEAN", "value"],
		["arg3", "STRING", "value"],
	]],
	nameOnly: [[
		"arg2",
	], "error"],
	missingType: [[
		"arg2",
		"punctuation.colon",
	], "error"],
	missingComma: [[
		"arg2",
		"punctuation.colon",
		"DATE",
		"arg2",
	], "error"],
	extraComma: [[
		"arg2",
		"punctuation.colon",
		"CHAR",
		"punctuation.comma",
	], "error"],
	onlyPassMode: [[
		"keyword.pass_mode.by_reference",
	], "error"],
	onlyPassMode2: [[
		"arg2",
		"punctuation.colon",
		"INTEGER",
		"punctuation.comma",
		"keyword.pass_mode.by_reference",
	], "error"],
	doublePassMode: [[
		"keyword.pass_mode.by_reference",
		"keyword.pass_mode.by_value",
		"arg2",
		"punctuation.colon",
		"BOOLEAN",
	], "error"],
	doubleArg1: [[
		"arg",
		"punctuation.colon",
		"INTEGER",
		"punctuation.comma",
		"arg2",
		"punctuation.colon",
		"BOOLEAN",
		"punctuation.comma",
		"arg",
		"punctuation.colon",
		"STRING",
	], "error"],
	doubleArg2: [[
		"arg",
		"punctuation.comma",
		"arg4",
		"punctuation.comma",
		"arg4",
		"punctuation.colon",
		"STRING",
	], "error"],
	missingType2: [[
		"keyword.pass_mode.by_reference",
		"arg1",
		"punctuation.comma",
		"arg2",
		"punctuation.comma",
		"arg3",
	], "error"],
	randomJunk: [[
		"keyword.case",
		"arg2",
		"punctuation.colon",
		"STRING",
	], "error"],
});


const parseTypeTests = Object.entries<[input:_Token[], output:_Token | _ExpressionASTArrayTypeNode | "error"]>({
	simpleType1: [[
		"INTEGER",
	],
		"INTEGER"
	],
	simpleType2: [[
		"BOOLEAN",
	],
		"BOOLEAN",
	],
	simpleType3: [[
		"STRING",
	],
		"STRING",
	],
	simpleType4: [[
		"CHAR",
	],
		"CHAR",
	],
	"1dArray": [[
		"keyword.array",
		"bracket.open",
		1,
		"punctuation.colon",
		10,
		"bracket.close",
		"keyword.of",
		"INTEGER",
	],[
		[
			[1, 10]
		],
		"INTEGER",
	]],
	"1dArray2": [[
		"keyword.array",
		"bracket.open",
		0,
		"punctuation.colon",
		102,
		"bracket.close",
		"keyword.of",
		"DATE",
	],[
		[
			[0, 102]
		],
		"DATE",
	]],
	"2dArray": [[
		"keyword.array",
		"bracket.open",
		1,
		"punctuation.colon",
		10,
		"punctuation.comma",
		1,
		"punctuation.colon",
		20,
		"bracket.close",
		"keyword.of",
		"INTEGER",
	],[
		[
			[1, 10],
			[1, 20],
		],
		"INTEGER"
	]],
	"2dArray2": [[
		"keyword.array",
		"bracket.open",
		0,
		"punctuation.colon",
		103,
		"punctuation.comma",
		1,
		"punctuation.colon",
		22,
		"bracket.close",
		"keyword.of",
		"BOOLEAN",
	],[
		[
			[0, 103],
			[1, 22],
		],
		"BOOLEAN"
	]],
	"Cursed2dArray": [[
		"keyword.array",
		"bracket.open",
		1,
		"punctuation.colon",
		10,
		"bracket.close",
		"keyword.of",
		"keyword.array",
		"bracket.open",
		1,
		"punctuation.colon",
		20,
		"bracket.close",
		"keyword.of",
		"INTEGER",
	], "error"],
	"4dArray": [[
		"keyword.array",
		"bracket.open",
		1,
		"punctuation.colon",
		10,
		"punctuation.comma",
		1,
		"punctuation.colon",
		20,
		"punctuation.comma",
		1,
		"punctuation.colon",
		30,
		"punctuation.comma",
		1,
		"punctuation.colon",
		40,
		"bracket.close",
		"keyword.of",
		"INTEGER",
	],[
		[
			[1, 10],
			[1, 20],
			[1, 30],
			[1, 40],
		],
		"INTEGER"
	]],
	invalid1: [[
		"keyword.array",
	], "error"],
	arrayButWithBraces: [[
		"keyword.array",
		"brace.open",
		1,
		"punctuation.colon",
		10,
		"punctuation.comma",
		1,
		"punctuation.colon",
		20,
		"brace.close",
		"keyword.of",
		"INTEGER",
	], "error"],
	unspecifiedLowerBound: [[
		"keyword.array",
		"bracket.open",
		10,
		"bracket.close",
		"keyword.of",
		"INTEGER",
	], "error"],
	missingOf: [[
		"keyword.array",
		"bracket.open",
		1,
		"punctuation.colon",
		10,
		"bracket.close",
		"INTEGER",
	], "error"],
	extraComma: [[
		"keyword.array",
		"bracket.open",
		1,
		"punctuation.colon",
		10,
		"punctuation.comma",
		"bracket.close",
		"keyword.of",
		"INTEGER",
	], "error"],
}).map<{name:string; input:Token[]; output:jasmine.Expected<Token | ExpressionASTArrayTypeNode> | "error";}>(([name, [input, output]]) => ({
	name,
	input: input.map(process_Token),
	output: output == "error" ? output : applyAnyRange(process_ExpressionASTExt(output))
}));



describe("parseExpression", () => {
	for(const [name, program, output] of parseExpressionTests){
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
	it("should pass the fuzzer with n=5 l=4", () => {
		const tokens = [
			token("number.decimal", "5"),
			token("operator.add", "+"),
			token("operator.minus", "-"),
			// token("operator.multiply", "*"),
			token("operator.not", "NOT"),
			// 	token("parentheses.open", "("),
			// 	token("parentheses.close", ")"),
		];
		const length = 5;
		for(let i = 0; i < tokens.length ** length; i ++){
			const expr = Array.from({length}, (_, j) => tokens[Math.floor(i / (tokens.length ** j)) % tokens.length]);
			try {
				parseExpression(expr);
			} catch(err){
				if(!(err instanceof SoodocodeError)) throw err;
			}
		}
	});
});

describe("parseStatement", () => {
	for(const [name, program, output, context] of parseStatementTests){
		const fakeNode = context ? new ProgramASTBranchNode(context[0], [context[1]], []) : null;
		if(output === "error"){
			it(`should not parse ${name} into a statement`, () => {
				expect(() => parseStatement(program, fakeNode)).toThrowMatching(e => e instanceof SoodocodeError);
			});
		} else {
			it(`should parse ${name} into a statement`, () => {
				expect(parseStatement(program, fakeNode)).toEqual(output);
			});
		}
	}
});

describe("parse", () => {
	for(const [name, program, output] of parseProgramTests){
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

describe("parseFunctionArguments", () => {
	for(const {name, input, output} of functionArgumentTests){
		if(output == "error"){
			it(`should not parse ${name} as function arguments`, () => {
				expect(() => parseFunctionArguments(input))
					.toThrowMatching(t => t instanceof SoodocodeError);
			});
		} else {
			it(`should parse ${name} as function arguments`, () => {
				expect([...parseFunctionArguments(input).entries()]).toEqual(output);
			});
		}
	}
});

describe("ArrayTypeData", () => {
	it(`should generate correct data`, () => {
		const data1 = new ArrayVariableType([[0, 9]], PrimitiveVariableType.BOOLEAN);
		expect(data1.arraySizes).toEqual([10]);
		expect(data1.totalLength).toEqual(10);
		const data2 = new ArrayVariableType([[1, 15]], PrimitiveVariableType.STRING);
		expect(data2.arraySizes).toEqual([15]);
		expect(data2.totalLength).toEqual(15);
		const data3 = new ArrayVariableType([[0, 9], [0, 19]], PrimitiveVariableType.BOOLEAN);
		expect(data3.arraySizes).toEqual([10, 20]);
		expect(data3.totalLength).toEqual(200);
		const data4 = new ArrayVariableType([[1, 10], [1, 15]], PrimitiveVariableType.DATE);
		expect(data4.arraySizes).toEqual([10, 15]);
		expect(data4.totalLength).toEqual(150);
		const data5 = new ArrayVariableType([[0, 9], [1, 15], [0, 20]], PrimitiveVariableType.INTEGER);
		expect(data5.arraySizes).toEqual([10, 15, 21]);
		expect(data5.totalLength).toEqual(3150);
	});
	it(`should handle correct inputs`, () => {
		expect(() => new ArrayVariableType([[0, 0]], PrimitiveVariableType.CHAR)).not.toThrow();
		expect(() => new ArrayVariableType([[5, 5]], PrimitiveVariableType.CHAR)).not.toThrow();
	})
	it(`should handle incorrect inputs`, () => {
		expect(() => new ArrayVariableType([[0, -1]], PrimitiveVariableType.CHAR)).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => new ArrayVariableType([[2, 1]], PrimitiveVariableType.CHAR)).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => new ArrayVariableType([[0, 10.5]], PrimitiveVariableType.CHAR)).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => new ArrayVariableType([[0, 1], [0, 10.5]], PrimitiveVariableType.CHAR)).toThrowMatching(t => t instanceof SoodocodeError);
	});
});

describe("parseType", () => {
	for(const {name, input, output} of parseTypeTests){
		if(output == "error"){
			it(`should not parse ${name} into a valid type`, () => {
				expect(() => parseType(input))
					.toThrowMatching(t => t instanceof SoodocodeError);
			});
		} else {
			it(`should parse ${name} as a valid type`, () => {
				expect(parseType(input)).toEqual(output);
			});
		}
	}
});
