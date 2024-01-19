/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains unit tests for the lexer.
*/

import "jasmine";
import { Symbol, Token, symbolize, tokenize } from "../src/lexer.js";
import { SoodocodeError } from "../src/utils.js";
import { _Symbol, symbol, token } from "./spec_utils.js";


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
			["word", "sussy"],
			["word", "imposter"]
		]
	],
	symbols1: [
		"X <- 5",
		[
			["word", "X"],
			["space", " "],
			["operator.assignment", "<-"],
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
			["operator.and", "AND"],
			["space", " "],
			["operator.not", "NOT"],
			["space", " "],
			["word", "PastLast"],
		]
	],
}).map(([name, [input, output]]) => [name, input, output == "error" ? output : output.map(symbol)]);

//TODO datastructify
describe("symbolizer", () => {
	for(const [name, input, output] of symbolTests){
		if(output == "error"){
			it(`should not parse ${name} into symbols`, () => {
				expect(() => symbolize(input)).toThrowMatching(e => e instanceof SoodocodeError);
			});
		} else {
			it(`should parse ${name} into symbols`, () => {
				expect(symbolize(input)).toEqual(output);
			});
		}
	}
});

describe("tokenizer", () => {
	it("should leave most symbols untouched", () => {
		expect(tokenize([
			["punctuation.semicolon", ";"],
			["newline", "\n"],
			["operator.less_than", "<"],
			["operator.and", "AND"],
			["numeric_fragment", "501"],
			["bracket.close", "]"],
			["parentheses.open", "("],
			["parentheses.close", ")"],
		])).toEqual([
			["punctuation.semicolon", ";"],
			["newline", "\n"],
			["operator.less_than", "<"],
			["operator.and", "AND"],
			["number.decimal", "501"],
			["bracket.close", "]"],
			["parentheses.open", "("],
			["parentheses.close", ")"],
		])
	});

	it("should remove whitespace", () => {
		expect(tokenize([
			["punctuation.semicolon", ";"],
			["newline", "\n"],
			["space", " "],
			["operator.and", "AND"],
			["numeric_fragment", "501"],
			["space", " "],
			["space", " "],
			["parentheses.open", "("],
			["parentheses.close", ")"],
		])).toEqual([
			["punctuation.semicolon", ";"],
			["newline", "\n"],
			["operator.and", "AND"],
			["number.decimal", "501"],
			["parentheses.open", "("],
			["parentheses.close", ")"],
		])
	});

	it("should remove single line comments", () => {
		expect(tokenize([
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
		])).toEqual([
			["punctuation.semicolon", ";"],
			["newline", "\n"],
			["operator.less_than", "<"],
			["operator.and", "AND"],
			["number.decimal", "501"],
			["bracket.close", "]"],
			["parentheses.open", "("],
			["newline", "\n"],
			["parentheses.close", ")"],
		])
	});

	it("should remove multiline comments", () => {
		expect(tokenize([
			["punctuation.semicolon", ";"],
			["newline", "\n"],
			["operator.less_than", "<"],
			["operator.and", "AND"],
			["numeric_fragment", "501"],
			["bracket.close", "]"],
			["parentheses.open", "("],
			["comment.multiline_open", "/*"],
			["operator.and", "AND"],
			["numeric_fragment", "501"],
			["comment.multiline_close", "*/"],
			["parentheses.close", ")"],
		])).toEqual([
			["punctuation.semicolon", ";"],
			["newline", "\n"],
			["operator.less_than", "<"],
			["operator.and", "AND"],
			["number.decimal", "501"],
			["bracket.close", "]"],
			["parentheses.open", "("],
			["parentheses.close", ")"],
		])
	});

	it("should form strings", () => {
		expect(tokenize([
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
			["quote.double", `\"`],
			["operator.and", "AND"],
			["space", " "],
			["numeric_fragment", "501"],
			["quote.double", `\"`],
			["parentheses.close", ")"],
		])).toEqual([
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
		]);
	});

	it("should form numbers", () => {
		expect(tokenize([
			["numeric_fragment", "12345"],
			["punctuation.period", "."],
			["numeric_fragment", "54321"],
		])).toEqual([
			["number.decimal", "12345.54321"]
		]);
		expect(tokenize([
			["numeric_fragment", "12345"],
		])).toEqual([
			["number.decimal", "12345"]
		]);
		expect(() => tokenize([
			["numeric_fragment", "12345"],
			["punctuation.period", "."],
		])).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => tokenize([
			["numeric_fragment", "12345"],
			["numeric_fragment", "12345"],
			["punctuation.period", "."],
		])).toThrowMatching(t => t instanceof SoodocodeError);
		expect(() => tokenize([
			["punctuation.period", "."],
			["numeric_fragment", "12345"],
			["numeric_fragment", "12345"],
		])).toThrowMatching(t => t instanceof SoodocodeError);
	});

	it("should parse keywords", () => {
		expect(tokenize([
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
		])).toEqual([
			["keyword.while", "WHILE"],
			["name", "Index"],
			["operator.less_than", "<"],
			["number.decimal", "501"],
			["operator.and", "AND"],
			["string", `"sussy PROCEDURE"`],
		])
	});
	
});
