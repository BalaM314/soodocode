import "jasmine";
import { symbol, symbolize, token, tokenize } from "../src/lexer.js";
import { SoodocodeError } from "../src/utils.js";
//TODO datastructify
describe("symbolizer", () => {
    it("should parse numbers", () => {
        expect(symbolize("5")).toEqual([symbol("numeric_fragment", "5")]);
        expect(symbolize("12345")).toEqual([symbol("numeric_fragment", "12345")]);
        expect(symbolize("12345 54321")).toEqual([
            symbol("numeric_fragment", "12345"),
            symbol("space", " "),
            symbol("numeric_fragment", "54321"),
        ]);
        expect(symbolize("12345.54321")).toEqual([
            symbol("numeric_fragment", "12345"),
            symbol("punctuation.period", "."),
            symbol("numeric_fragment", "54321"),
        ]);
        expect(symbolize("12345.")).toEqual([
            symbol("numeric_fragment", "12345"),
            symbol("punctuation.period", "."),
        ]);
        expect(symbolize(".54321")).toEqual([
            symbol("punctuation.period", "."),
            symbol("numeric_fragment", "54321"),
        ]);
    });
    it("should parse words", () => {
        expect(symbolize("a")).toEqual([symbol("word", "a")]);
        expect(symbolize("amogus")).toEqual([symbol("word", "amogus")]);
        expect(symbolize("amogus sussy imposter")[0]).toEqual(symbol("word", "amogus"));
    });
    it("should parse text and build a symbol table", () => {
        expect(symbolize("X <- 5")).toEqual([
            symbol("word", "X"),
            symbol("space", " "),
            symbol("operator.assignment", "<-"),
            symbol("space", " "),
            symbol("numeric_fragment", "5")
        ]);
        expect(symbolize("WHILE Index < 501 AND NOT PastLast")).toEqual([
            symbol("word", "WHILE"),
            symbol("space", " "),
            symbol("word", "Index"),
            symbol("space", " "),
            symbol("operator.less_than", "<"),
            symbol("space", " "),
            symbol("numeric_fragment", "501"),
            symbol("space", " "),
            symbol("operator.and", "AND"),
            symbol("space", " "),
            symbol("operator.not", "NOT"),
            symbol("space", " "),
            symbol("word", "PastLast"),
        ]);
    });
});
describe("tokenizer", () => {
    it("should leave most symbols untouched", () => {
        expect(tokenize([
            symbol("punctuation.semicolon", ";"),
            symbol("newline", "\n"),
            symbol("operator.less_than", "<"),
            symbol("operator.and", "AND"),
            symbol("numeric_fragment", "501"),
            symbol("bracket.close", "]"),
            symbol("parentheses.open", "("),
            symbol("parentheses.close", ")"),
        ])).toEqual([
            token("punctuation.semicolon", ";"),
            token("newline", "\n"),
            token("operator.less_than", "<"),
            token("operator.and", "AND"),
            token("number.decimal", "501"),
            token("bracket.close", "]"),
            token("parentheses.open", "("),
            token("parentheses.close", ")"),
        ]);
    });
    it("should remove whitespace", () => {
        expect(tokenize([
            symbol("punctuation.semicolon", ";"),
            symbol("newline", "\n"),
            symbol("space", " "),
            symbol("operator.and", "AND"),
            symbol("numeric_fragment", "501"),
            symbol("space", " "),
            symbol("space", " "),
            symbol("parentheses.open", "("),
            symbol("parentheses.close", ")"),
        ])).toEqual([
            token("punctuation.semicolon", ";"),
            token("newline", "\n"),
            token("operator.and", "AND"),
            token("number.decimal", "501"),
            token("parentheses.open", "("),
            token("parentheses.close", ")"),
        ]);
    });
    it("should remove single line comments", () => {
        expect(tokenize([
            symbol("punctuation.semicolon", ";"),
            symbol("newline", "\n"),
            symbol("operator.less_than", "<"),
            symbol("operator.and", "AND"),
            symbol("numeric_fragment", "501"),
            symbol("bracket.close", "]"),
            symbol("parentheses.open", "("),
            symbol("comment.singleline", "//"),
            symbol("operator.and", "AND"),
            symbol("numeric_fragment", "501"),
            symbol("newline", "\n"),
            symbol("parentheses.close", ")"),
        ])).toEqual([
            token("punctuation.semicolon", ";"),
            token("newline", "\n"),
            token("operator.less_than", "<"),
            token("operator.and", "AND"),
            token("number.decimal", "501"),
            token("bracket.close", "]"),
            token("parentheses.open", "("),
            token("newline", "\n"),
            token("parentheses.close", ")"),
        ]);
    });
    it("should remove multiline comments", () => {
        expect(tokenize([
            symbol("punctuation.semicolon", ";"),
            symbol("newline", "\n"),
            symbol("operator.less_than", "<"),
            symbol("operator.and", "AND"),
            symbol("numeric_fragment", "501"),
            symbol("bracket.close", "]"),
            symbol("parentheses.open", "("),
            symbol("comment.multiline_open", "/*"),
            symbol("operator.and", "AND"),
            symbol("numeric_fragment", "501"),
            symbol("comment.multiline_close", "*/"),
            symbol("parentheses.close", ")"),
        ])).toEqual([
            token("punctuation.semicolon", ";"),
            token("newline", "\n"),
            token("operator.less_than", "<"),
            token("operator.and", "AND"),
            token("number.decimal", "501"),
            token("bracket.close", "]"),
            token("parentheses.open", "("),
            token("parentheses.close", ")"),
        ]);
    });
    it("should form strings", () => {
        expect(tokenize([
            symbol("punctuation.semicolon", ";"),
            symbol("newline", "\n"),
            symbol("operator.less_than", "<"),
            symbol("operator.and", "AND"),
            symbol("numeric_fragment", "501"),
            symbol("bracket.close", "]"),
            symbol("parentheses.open", "("),
            symbol("quote.single", "'"),
            symbol("parentheses.open", "("),
            symbol("quote.single", "'"),
            symbol("operator.not_equal_to", "<>"),
            symbol("quote.double", `\"`),
            symbol("operator.and", "AND"),
            symbol("space", " "),
            symbol("numeric_fragment", "501"),
            symbol("quote.double", `\"`),
            symbol("parentheses.close", ")"),
        ])).toEqual([
            token("punctuation.semicolon", ";"),
            token("newline", "\n"),
            token("operator.less_than", "<"),
            token("operator.and", "AND"),
            token("number.decimal", "501"),
            token("bracket.close", "]"),
            token("parentheses.open", "("),
            token("char", "'('"),
            token("operator.not_equal_to", "<>"),
            token("string", `"AND 501"`),
            token("parentheses.close", ")"),
        ]);
    });
    it("should form numbers", () => {
        expect(tokenize([
            symbol("numeric_fragment", "12345"),
            symbol("punctuation.period", "."),
            symbol("numeric_fragment", "54321"),
        ])).toEqual([
            token("number.decimal", "12345.54321")
        ]);
        expect(tokenize([
            symbol("numeric_fragment", "12345"),
        ])).toEqual([
            token("number.decimal", "12345")
        ]);
        expect(() => tokenize([
            symbol("numeric_fragment", "12345"),
            symbol("punctuation.period", "."),
        ])).toThrowMatching(t => t instanceof SoodocodeError);
        expect(() => tokenize([
            symbol("numeric_fragment", "12345"),
            symbol("numeric_fragment", "12345"),
            symbol("punctuation.period", "."),
        ])).toThrowMatching(t => t instanceof SoodocodeError);
        expect(() => tokenize([
            symbol("punctuation.period", "."),
            symbol("numeric_fragment", "12345"),
            symbol("numeric_fragment", "12345"),
        ])).toThrowMatching(t => t instanceof SoodocodeError);
    });
    it("should parse keywords", () => {
        expect(tokenize([
            symbol("word", "WHILE"),
            symbol("space", " "),
            symbol("word", "Index"),
            symbol("space", " "),
            symbol("operator.less_than", "<"),
            symbol("space", " "),
            symbol("numeric_fragment", "501"),
            symbol("space", " "),
            symbol("operator.and", "AND"),
            symbol("space", " "),
            symbol("quote.double", `"`),
            symbol("word", "sussy"),
            symbol("space", " "),
            symbol("word", "PROCEDURE"),
            symbol("quote.double", `"`),
        ])).toEqual([
            token("keyword.while", "WHILE"),
            token("name", "Index"),
            token("operator.less_than", "<"),
            token("number.decimal", "501"),
            token("operator.and", "AND"),
            token("string", `"sussy PROCEDURE"`),
        ]);
    });
});
