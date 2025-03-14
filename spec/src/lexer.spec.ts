/**
Copyright © <BalaM314>, 2025. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains unit tests for the lexer.
*/

import "jasmine";
import { Symbol, symbolize, SymbolizedProgram, Token, tokenize } from "../../core/build/lexer/index.js";
import { SoodocodeError } from "../../core/build/utils/funcs.js";
import { _Symbol, _Token, process_Token, symbol } from "./spec_utils.js";



const symbolTests:[name:string, input:string, output:Symbol[] | "error"][] = Object.entries<[input:string, output:_Symbol[] | "error"]>({
	number_single1: [
		"5",
		[
			["numeric_fragment", "5"]
		]
	],
	number_single2: [
		"12345",
		[
			["numeric_fragment", "12345"]
		]
	],
	number_multi1: [
		"12345 54321",
		[
			["numeric_fragment", "12345"],
			["space", " "],
			["numeric_fragment", "54321"]
		]
	],
	number_decimal1: [
		"12345.54321",
		[
			["numeric_fragment", "12345"],
			["punctuation.period", "."],
			["numeric_fragment", "54321"]
		]
	],
	number_decimal_half1: [
		"12345.",
		[
			["numeric_fragment", "12345"],
			["punctuation.period", "."],
		]
	],
	number_decimal1_half2: [
		".54321",
		[
			["punctuation.period", "."],
			["numeric_fragment", "54321"],
		]
	],
	word1: [
		"a",
		[
			["word", "a"]
		]
	],
	word2: [
		"amogus",
		[
			["word", "amogus"]
		]
	],
	word3: [
		"amogus sussy imposter",
		[
			["word", "amogus"],
			["space", " "],
			["word", "sussy"],
			["space", " "],
			["word", "imposter"]
		]
	],
	consolidateNewlines: [
		"\n\nx\n\n\n\n",
		[
			["newline", "\n\n"],
			["word", "x",],
			["newline", "\n\n\n\n"],
		]
	],
	symbols1: [
		"X <-<-<-- 5",
		[
			["word", "X"],
			["space", " "],
			["operator.assignment", "<-"],
			["operator.assignment", "<-"],
			["operator.assignment", "<--"],
			["space", " "],
			["numeric_fragment", "5"]
		]
	],
	symbols2: [
		"WHILE Index < 501 AND NOT PastLast",
		[
			["word", "WHILE"],
			["space", " "],
			["word", "Index"],
			["space", " "],
			["operator.less_than", "<"],
			["space", " "],
			["numeric_fragment", "501"],
			["space", " "],
			["word", "AND"],
			["space", " "],
			["word", "NOT"],
			["space", " "],
			["word", "PastLast"],
		]
	],
	otherStuff: [
		"1.. 10",
		[
			["numeric_fragment", "1"],
			["operator.range", ".."],
			["space", " "],
			["numeric_fragment", "10"],
		]
	],
	invalidChars: [
		`OUTPUT "!@#$%^&*()_+", amogus, 😀βγδ😀`,
		[
			["word", "OUTPUT"],
			["space", " "],
			["quote.double", `"`],
			["unknown", "!"],
			["unknown", "@"],
			["unknown", "#"],
			["unknown", "$"],
			["unknown", "%"],
			["operator.pointer", "^"],
			["operator.string_concatenate", "&"],
			["operator.multiply", "*"],
			["parentheses.open", "("],
			["parentheses.close", ")"],
			["word", "_"],
			["operator.add", "+"],
			["quote.double", `"`],
			["punctuation.comma", ","],
			["space", " "],
			["word", "amogus"],
			["punctuation.comma", ","],
			["space", " "],
			["unknown", "😀"],
			["unknown", "β"],
			["unknown", "γ"],
			["unknown", "δ"],
			["unknown", "😀"],
		]
	],
	keywords2: [
		`AND APPEND ARRAY BOOLEAN BYREF BYVAL CALL CASE OF CHAR CLASS CLOSEFILE CONSTANT DATE DECLARE DIV ELSE ENDCASE ENDCLASS ENDFUNCTION ENDIF ENDPROCEDURE ENDTYPE ENDWHILE EOF FALSE FOR TO FUNCTION GETRECORD IF INHERITS INPUT INT INTEGER LCASE LENGTH MID MOD NEXT NEW NOT OPENFILE OR OTHERWISE OUTPUT PROCEDURE PRIVATE PUBLIC PUTRECORD RAND RANDOM READ READFILE REAL REPEAT RETURN RETURNS RIGHT SEEK STEP STRING SUPER THEN TRUE TYPE UCASE UNTIL WHILE WRITE WRITEFILE `,
		([
			["word", "AND"],
			["word", "APPEND"],
			["word", "ARRAY"],
			["word", "BOOLEAN"],
			["word", "BYREF"],
			["word", "BYVAL"],
			["word", "CALL"],
			["word", "CASE"],
			["word", "OF"],
			["word", "CHAR"],
			["word", "CLASS"],
			["word", "CLOSEFILE"],
			["word", "CONSTANT"],
			["word", "DATE"],
			["word", "DECLARE"],
			["word", "DIV"],
			["word", "ELSE"],
			["word", "ENDCASE"],
			["word", "ENDCLASS"],
			["word", "ENDFUNCTION"],
			["word", "ENDIF"],
			["word", "ENDPROCEDURE"],
			["word", "ENDTYPE"],
			["word", "ENDWHILE"],
			["word", "EOF"],
			["word", "FALSE"],
			["word", "FOR"],
			["word", "TO"],
			["word", "FUNCTION"],
			["word", "GETRECORD"],
			["word", "IF"],
			["word", "INHERITS"],
			["word", "INPUT"],
			["word", "INT"],
			["word", "INTEGER"],
			["word", "LCASE"],
			["word", "LENGTH"],
			["word", "MID"],
			["word", "MOD"],
			["word", "NEXT"],
			["word", "NEW"],
			["word", "NOT"],
			["word", "OPENFILE"],
			["word", "OR"],
			["word", "OTHERWISE"],
			["word", "OUTPUT"],
			["word", "PROCEDURE"],
			["word", "PRIVATE"],
			["word", "PUBLIC"],
			["word", "PUTRECORD"],
			["word", "RAND"],
			["word", "RANDOM"],
			["word", "READ"],
			["word", "READFILE"],
			["word", "REAL"],
			["word", "REPEAT"],
			["word", "RETURN"],
			["word", "RETURNS"],
			["word", "RIGHT"],
			["word", "SEEK"],
			["word", "STEP"],
			["word", "STRING"],
			["word", "SUPER"],
			["word", "THEN"],
			["word", "TRUE"],
			["word", "TYPE"],
			["word", "UCASE"],
			["word", "UNTIL"],
			["word", "WHILE"],
			["word", "WRITE"],
			["word", "WRITEFILE"],
		] as _Symbol[]).map(w => [w, ["space", " "]] as _Symbol[]).flat(1)
	]
}).map(([name, [input, output]]) => [name, input, output == "error" ? output : output.map(symbol)]);

const tokenizerTests = ((data:Record<string, [input:_Symbol[], output:_Token[] | "error"]>) =>
	Object.entries(data).map<[name:string, input:SymbolizedProgram, output:Token[] | "error"]>(([name, [input, output]]) =>
		[name, {program: "", symbols: input.map(symbol)}, output == "error" ? "error" : output.map(process_Token)]
	)
)({
	simple: [
		[
			["punctuation.semicolon", ";"],
			["newline", "\n"],
			["operator.less_than", "<"],
			["operator.and", "AND"],
			["numeric_fragment", "501"],
			["bracket.close", "]"],
			["parentheses.open", "("],
			["parentheses.close", ")"],
		], [
			["punctuation.semicolon", ";"],
			["newline", "\n"],
			["operator.less_than", "<"],
			["operator.and", "AND"],
			["number.decimal", "501"],
			["bracket.close", "]"],
			["parentheses.open", "("],
			["parentheses.close", ")"],
		]
	],

	removeWhitespace: [
		[
			["punctuation.semicolon", ";"],
			["newline", "\n"],
			["space", " "],
			["operator.and", "AND"],
			["numeric_fragment", "501"],
			["space", " "],
			["space", " "],
			["parentheses.open", "("],
			["parentheses.close", ")"],
		], [
			["punctuation.semicolon", ";"],
			["newline", "\n"],
			["operator.and", "AND"],
			["number.decimal", "501"],
			["parentheses.open", "("],
			["parentheses.close", ")"],
		]
	],

	removeSingleLineComments: [
		[
			["punctuation.semicolon", ";"],
			["newline", "\n"],
			["operator.less_than", "<"],
			["operator.and", "AND"],
			["numeric_fragment", "501"],
			["bracket.close", "]"],
			["parentheses.open", "("],
			["comment.singleline", "//"],
			["operator.and", "AND"],
			["numeric_fragment", "501"],
			["newline", "\n"],
			["parentheses.close", ")"],
		], [
			["punctuation.semicolon", ";"],
			["newline", "\n"],
			["operator.less_than", "<"],
			["operator.and", "AND"],
			["number.decimal", "501"],
			["bracket.close", "]"],
			["parentheses.open", "("],
			["newline", "\n"],
			["parentheses.close", ")"],
		]
	],

	removeMultilineComments: [
		[
			["punctuation.semicolon", ";"],
			["newline", "\n"],
			["operator.less_than", "<"],
			["operator.and", "AND"],
			["numeric_fragment", "501"],
			["bracket.close", "]"],
			["parentheses.open", "("],
			["comment.multiline.open", "/*"],
			["operator.and", "AND"],
			["numeric_fragment", "501"],
			["comment.multiline.close", "*/"],
			["parentheses.close", ")"],
		], [
			["punctuation.semicolon", ";"],
			["newline", "\n"],
			["operator.less_than", "<"],
			["operator.and", "AND"],
			["number.decimal", "501"],
			["bracket.close", "]"],
			["parentheses.open", "("],
			["parentheses.close", ")"],
		]
	],

	strings: [
		[
			["punctuation.semicolon", ";"],
			["newline", "\n"],
			["operator.less_than", "<"],
			["operator.and", "AND"],
			["numeric_fragment", "501"],
			["bracket.close", "]"],
			["parentheses.open", "("],
			["quote.single", "'"],
			["parentheses.open", "("],
			["quote.single", "'"],
			["operator.not_equal_to", "<>"],
			["quote.double", `"`],
			["operator.and", "AND"],
			["space", " "],
			["numeric_fragment", "501"],
			["quote.double", `"`],
			["parentheses.close", ")"],
		], [
			["punctuation.semicolon", ";"],
			["newline", "\n"],
			["operator.less_than", "<"],
			["operator.and", "AND"],
			["number.decimal", "501"],
			["bracket.close", "]"],
			["parentheses.open", "("],
			["char", "'('"],
			["operator.not_equal_to", "<>"],
			["string", `"AND 501"`],
			["parentheses.close", ")"],
		]
	],

	numbers1: [
		[
			["numeric_fragment", "12345"],
			["punctuation.period", "."],
			["numeric_fragment", "54321"],
		], [
			["number.decimal", "12345.54321"]
		]
	],
	numbers2: [
		[
			["numeric_fragment", "12345"],
		], [
			["number.decimal", "12345"]
		]
	],
	numbers3: [
		[
			["numeric_fragment", "12345"],
			["punctuation.period", "."],
		],
		"error"
	],
	numbers4: [
		[
			["numeric_fragment", "12345"],
			["numeric_fragment", "12345"],
			["punctuation.period", "."],
		],
		"error"
	],
	numbers5: [
		[
			["punctuation.period", "."],
			["numeric_fragment", "12345"],
			["numeric_fragment", "12345"],
		], [
			["punctuation.period", "."],
			["number.decimal", "12345"],
			["number.decimal", "12345"],
		]
	],

	keywords: [
		[
			["word", "DECLARE"],
			["word", "WHILE"],
			["space", " "],
			["word", "Index"],
			["space", " "],
			["operator.less_than", "<"],
			["space", " "],
			["numeric_fragment", "501"],
			["space", " "],
			["operator.and", "AND"],
			["space", " "],
			["quote.double", `"`],
			["word", "sussy"],
			["space", " "],
			["word", "PROCEDURE"],
			["quote.double", `"`],
			["operator.range", ".."],
		], [
			["keyword.declare", "DECLARE"],
			["keyword.while", "WHILE"],
			["name", "Index"],
			["operator.less_than", "<"],
			["number.decimal", "501"],
			["operator.and", "AND"],
			["string", `"sussy PROCEDURE"`],
			["operator.range", ".."],
		]
	],
	keywords2: [
		[
			["word", "AND"],
			["word", "APPEND"],
			["word", "ARRAY"],
			["word", "BOOLEAN"],
			["word", "BYREF"],
			["word", "BYVAL"],
			["word", "CALL"],
			["word", "CASE"],
			["word", "OF"],
			["word", "CHAR"],
			["word", "CLASS"],
			["word", "CLOSEFILE"],
			["word", "CONSTANT"],
			["word", "DATE"],
			["word", "DECLARE"],
			["word", "DEFINE"],
			["word", "DIV"],
			["word", "ELSE"],
			["word", "ENDCASE"],
			["word", "ENDCLASS"],
			["word", "ENDFUNCTION"],
			["word", "ENDIF"],
			["word", "ENDPROCEDURE"],
			["word", "ENDTYPE"],
			["word", "ENDWHILE"],
			["word", "EOF"],
			["word", "FALSE"],
			["word", "FOR"],
			["word", "TO"],
			["word", "FUNCTION"],
			["word", "GETRECORD"],
			["word", "IF"],
			["word", "INHERITS"],
			["word", "INPUT"],
			["word", "INT"],
			["word", "INTEGER"],
			["word", "LCASE"],
			["word", "LENGTH"],
			["word", "MID"],
			["word", "MOD"],
			["word", "NEXT"],
			["word", "NEW"],
			["word", "NOT"],
			["word", "OPENFILE"],
			["word", "OR"],
			["word", "OTHERWISE"],
			["word", "OUTPUT"],
			["word", "PROCEDURE"],
			["word", "PRIVATE"],
			["word", "PUBLIC"],
			["word", "PUTRECORD"],
			["word", "RAND"],
			["word", "RANDOM"],
			["word", "READ"],
			["word", "READFILE"],
			["word", "REAL"],
			["word", "REPEAT"],
			["word", "RETURN"],
			["word", "RETURNS"],
			["word", "RIGHT"],
			["word", "SEEK"],
			["word", "SET"],
			["word", "STEP"],
			["word", "STRING"],
			["word", "SUPER"],
			["word", "THEN"],
			["word", "TRUE"],
			["word", "TYPE"],
			["word", "UCASE"],
			["word", "UNTIL"],
			["word", "WHILE"],
			["word", "WRITE"],
			["word", "WRITEFILE"],
		], [
			["operator.and", "AND"],
			["keyword.file_mode.append", "APPEND"],
			["keyword.array", "ARRAY"],
			["name", "BOOLEAN"],
			["keyword.pass_mode.by_reference", "BYREF"],
			["keyword.pass_mode.by_value", "BYVAL"],
			["keyword.call", "CALL"],
			["keyword.case", "CASE"],
			["keyword.of", "OF"],
			["name", "CHAR"],
			["keyword.class", "CLASS"],
			["keyword.close_file", "CLOSEFILE"],
			["keyword.constant", "CONSTANT"],
			["name", "DATE"],
			["keyword.declare", "DECLARE"],
			["keyword.define", "DEFINE"],
			["operator.integer_divide", "DIV"],
			["keyword.else", "ELSE"],
			["keyword.case_end", "ENDCASE"],
			["keyword.class_end", "ENDCLASS"],
			["keyword.function_end", "ENDFUNCTION"],
			["keyword.if_end", "ENDIF"],
			["keyword.procedure_end", "ENDPROCEDURE"],
			["keyword.type_end", "ENDTYPE"],
			["keyword.while_end", "ENDWHILE"],
			["name", "EOF"],
			["boolean.false", "FALSE"],
			["keyword.for", "FOR"],
			["keyword.to", "TO"],
			["keyword.function", "FUNCTION"],
			["keyword.get_record", "GETRECORD"],
			["keyword.if", "IF"],
			["keyword.inherits", "INHERITS"],
			["keyword.input", "INPUT"],
			["name", "INT"],
			["name", "INTEGER"],
			["name", "LCASE"],
			["name", "LENGTH"],
			["name", "MID"],
			["operator.mod", "MOD"],
			["keyword.for_end", "NEXT"],
			["keyword.new", "NEW"],
			["operator.not", "NOT"],
			["keyword.open_file", "OPENFILE"],
			["operator.or", "OR"],
			["keyword.otherwise", "OTHERWISE"],
			["keyword.output", "OUTPUT"],
			["keyword.procedure", "PROCEDURE"],
			["keyword.class_modifier.private", "PRIVATE"],
			["keyword.class_modifier.public", "PUBLIC"],
			["keyword.put_record", "PUTRECORD"],
			["name", "RAND"],
			["keyword.file_mode.random", "RANDOM"],
			["keyword.file_mode.read", "READ"],
			["keyword.read_file", "READFILE"],
			["name", "REAL"],
			["keyword.do_while", "REPEAT"],
			["keyword.return", "RETURN"],
			["keyword.returns", "RETURNS"],
			["name", "RIGHT"],
			["keyword.seek", "SEEK"],
			["keyword.set", "SET"],
			["keyword.step", "STEP"],
			["name", "STRING"],
			["keyword.super", "SUPER"],
			["keyword.then", "THEN"],
			["boolean.true", "TRUE"],
			["keyword.type", "TYPE"],
			["name", "UCASE"],
			["keyword.dowhile_end", "UNTIL"],
			["keyword.while", "WHILE"],
			["keyword.file_mode.write", "WRITE"],
			["keyword.write_file", "WRITEFILE"],
		]
	],
});
describe("symbolizer", () => {
	for(const [name, input, output] of symbolTests){
		if(output == "error"){
			it(`should not parse ${name} into symbols`, () => {
				expect(() => symbolize(input)).toThrowMatching(e => e instanceof SoodocodeError);
			});
		} else {
			it(`should parse ${name} into symbols`, () => {
				const {program, symbols} = symbolize(input);
				expect(symbols.map(s => s.clearRange())).toEqual(output);
				expect(program).toBe(input);
			});
		}
	}
});

describe("tokenizer", () => {
	for(const [name, input, output] of tokenizerTests){
		if(output == "error"){
			it(`should not parse ${name} into tokens`, () => {
				expect(() => tokenize(input)).toThrowMatching(e => e instanceof SoodocodeError);
			});
		} else {
			it(`should parse ${name} into tokens`, () => {
				const { program, tokens } = tokenize(input);
				expect(tokens.map(t => t.clearRange())).toEqual(output);
			});
		}
	}
});
