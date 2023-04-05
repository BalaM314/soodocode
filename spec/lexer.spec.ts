import "jasmine";
import { symbolize } from "../src/lexer.js";


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