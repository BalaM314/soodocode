import "jasmine";
import { symbolize, tokenize } from "../src/lexer.js";


describe("symbolizer", () => {
	it("should parse numbers", () => {
		expect(symbolize("5")).toEqual([{text: "5", type: "number.decimal"}]);
		expect(symbolize("12345")).toEqual([{text: "12345", type: "number.decimal"}]);
		expect(symbolize("12345 54321")[0]).toEqual({text: "12345", type: "number.decimal"});
	});
	it("should parse words", () => {
		expect(symbolize("a")).toEqual([{text: "a", type: "word"}]);
		expect(symbolize("amogus")).toEqual([{text: "amogus", type: "word"}]);
		expect(symbolize("amogus sussy imposter")[0]).toEqual({text: "amogus", type: "word"});
	});
	it("should parse text and build a symbol table", () => {
		expect(symbolize("X <- 5")).toEqual([
			{text: "X", type: "word"},
			{text: " ", type: "space"},
			{text: "<-", type: "operator.assignment"},
			{text: " ", type: "space"},
			{text: "5", type: "number.decimal"}
		]);
		expect(symbolize("WHILE Index < 501 AND NOT PastLast")).toEqual([
			{text: "WHILE", type: "word"},
			{text: " ", type: "space"},
			{text: "Index", type: "word"},
			{text: " ", type: "space"},
			{text: "<", type: "operator.less_than"},
			{text: " ", type: "space"},
			{text: "501", type: "number.decimal"},
			{text: " ", type: "space"},
			{text: "AND", type: "operator.and"},
			{text: " ", type: "space"},
			{text: "NOT", type: "operator.not"},
			{text: " ", type: "space"},
			{text: "PastLast", type: "word"},
		]);
	});
});

describe("tokenizer", () => {
	it("should leave most symbols untouched", () => {
		expect(tokenize([
			{text: ";", type: "punctuation.semicolon"},
			{text: "\n", type: "newline"},
			{text: "<", type: "operator.less_than"},
			{text: "AND", type: "operator.and"},
			{text: "501", type: "number.decimal"},
			{text: "]", type: "bracket.close"},
			{text: "(", type: "parentheses.open"},
			{text: ")", type: "parentheses.close"},
		])).toEqual([
			{text: ";", type: "punctuation.semicolon"},
			{text: "\n", type: "newline"},
			{text: "<", type: "operator.less_than"},
			{text: "AND", type: "operator.and"},
			{text: "501", type: "number.decimal"},
			{text: "]", type: "bracket.close"},
			{text: "(", type: "parentheses.open"},
			{text: ")", type: "parentheses.close"},
		])
	});

	it("should remove whitespace", () => {
		expect(tokenize([
			{text: ";", type: "punctuation.semicolon"},
			{text: "\n", type: "newline"},
			{text: " ", type: "space"},
			{text: "AND", type: "operator.and"},
			{text: "501", type: "number.decimal"},
			{text: " ", type: "space"},
			{text: " ", type: "space"},
			{text: "(", type: "parentheses.open"},
			{text: ")", type: "parentheses.close"},
		])).toEqual([
			{text: ";", type: "punctuation.semicolon"},
			{text: "\n", type: "newline"},
			{text: "AND", type: "operator.and"},
			{text: "501", type: "number.decimal"},
			{text: "(", type: "parentheses.open"},
			{text: ")", type: "parentheses.close"},
		])
	});

	it("should remove single line comments", () => {
		expect(tokenize([
			{text: ";", type: "punctuation.semicolon"},
			{text: "\n", type: "newline"},
			{text: "<", type: "operator.less_than"},
			{text: "AND", type: "operator.and"},
			{text: "501", type: "number.decimal"},
			{text: "]", type: "bracket.close"},
			{text: "(", type: "parentheses.open"},
			{text: "//", type: "comment.singleline"},
			{text: "AND", type: "operator.and"},
			{text: "501", type: "number.decimal"},
			{text: "\n", type: "newline"},
			{text: ")", type: "parentheses.close"},
		])).toEqual([
			{text: ";", type: "punctuation.semicolon"},
			{text: "\n", type: "newline"},
			{text: "<", type: "operator.less_than"},
			{text: "AND", type: "operator.and"},
			{text: "501", type: "number.decimal"},
			{text: "]", type: "bracket.close"},
			{text: "(", type: "parentheses.open"},
			{text: "\n", type: "newline"},
			{text: ")", type: "parentheses.close"},
		])
	});

	it("should remove multiline comments", () => {
		expect(tokenize([
			{text: ";", type: "punctuation.semicolon"},
			{text: "\n", type: "newline"},
			{text: "<", type: "operator.less_than"},
			{text: "AND", type: "operator.and"},
			{text: "501", type: "number.decimal"},
			{text: "]", type: "bracket.close"},
			{text: "(", type: "parentheses.open"},
			{text: "/*", type: "comment.multiline_open"},
			{text: "AND", type: "operator.and"},
			{text: "501", type: "number.decimal"},
			{text: "*/", type: "comment.multiline_close"},
			{text: ")", type: "parentheses.close"},
		])).toEqual([
			{text: ";", type: "punctuation.semicolon"},
			{text: "\n", type: "newline"},
			{text: "<", type: "operator.less_than"},
			{text: "AND", type: "operator.and"},
			{text: "501", type: "number.decimal"},
			{text: "]", type: "bracket.close"},
			{text: "(", type: "parentheses.open"},
			{text: ")", type: "parentheses.close"},
		])
	});

	it("should form strings", () => {
		expect(tokenize([
			{text: ";", type: "punctuation.semicolon"},
			{text: "\n", type: "newline"},
			{text: "<", type: "operator.less_than"},
			{text: "AND", type: "operator.and"},
			{text: "501", type: "number.decimal"},
			{text: "]", type: "bracket.close"},
			{text: "(", type: "parentheses.open"},
			{text: "'", type: "quote.single"},
			{text: "AND", type: "operator.and"},
			{text: " ", type: "space"},
			{text: "501", type: "number.decimal"},
			{text: "'", type: "quote.single"},
			{text: "<>", type: "operator.not_equal_to"},
			{text: `\"`, type: "quote.double"},
			{text: "AND", type: "operator.and"},
			{text: " ", type: "space"},
			{text: "501", type: "number.decimal"},
			{text: `\"`, type: "quote.double"},
			{text: ")", type: "parentheses.close"},
		])).toEqual([
			{text: ";", type: "punctuation.semicolon"},
			{text: "\n", type: "newline"},
			{text: "<", type: "operator.less_than"},
			{text: "AND", type: "operator.and"},
			{text: "501", type: "number.decimal"},
			{text: "]", type: "bracket.close"},
			{text: "(", type: "parentheses.open"},
			{text: "AND 501", type: "string"},
			{text: "<>", type: "operator.not_equal_to"},
			{text: "AND 501", type: "string"},
			{text: ")", type: "parentheses.close"},
		])
	});

	it("should parse keywords", () => {
		expect(tokenize([
			{text: "WHILE", type: "word"},
			{text: " ", type: "space"},
			{text: "Index", type: "word"},
			{text: " ", type: "space"},
			{text: "<", type: "operator.less_than"},
			{text: " ", type: "space"},
			{text: "501", type: "number.decimal"},
			{text: " ", type: "space"},
			{text: "AND", type: "operator.and"},
			{text: " ", type: "space"},
			{text: `"`, type: "quote.double"},
			{text: "sussy", type: "word"},
			{text: " ", type: "space"},
			{text: "PROCEDURE", type: "word"},
			{text: `"`, type: "quote.double"},
		])).toEqual([
			{text: "WHILE", type: "keyword.while"},
			{text: "Index", type: "name"},
			{text: "<", type: "operator.less_than"},
			{text: "501", type: "number.decimal"},
			{text: "AND", type: "operator.and"},
			{text: `sussy PROCEDURE`, type: "string"},
		])
	});
	
});
