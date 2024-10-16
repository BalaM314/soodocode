import type { IFormattable } from "../utils/funcs.js";
import { RangeArray } from "../utils/funcs.js";
import type { TextRange, TextRanged, TextRangeLike } from "../utils/types.js";
export declare const symbolTypes: readonly ["numeric_fragment", "quote.single", "quote.double", "brace.open", "brace.close", "bracket.open", "bracket.close", "parentheses.open", "parentheses.close", "punctuation.colon", "punctuation.semicolon", "punctuation.comma", "punctuation.period", "comment.singleline", "comment.multiline.open", "comment.multiline.close", "word", "unknown", "invalid.not_equal_to", "space", "newline", "operator.add", "operator.minus", "operator.multiply", "operator.divide", "operator.mod", "operator.integer_divide", "operator.and", "operator.or", "operator.not", "operator.equal_to", "operator.not_equal_to", "operator.less_than", "operator.greater_than", "operator.less_than_equal", "operator.greater_than_equal", "operator.assignment", "operator.pointer", "operator.string_concatenate", "operator.range", "escape.quote.double", "escape.quote.single", "escape.backslash", "escape.tab", "escape.newline", "escape_character"];
export type SymbolType = typeof symbolTypes extends ReadonlyArray<infer T> ? T : never;
export type SymbolizedProgram = {
    program: string;
    symbols: Symbol[];
};
export type TokenizedProgram = {
    program: string;
    tokens: RangeArray<Token>;
};
export declare class Symbol implements TextRanged {
    type: SymbolType;
    text: string;
    range: TextRange;
    constructor(type: SymbolType, text: string, range: TextRange);
    toToken(): Token;
    fmtDebug(): string;
    fmtText(): string;
    clearRange(): Symbol;
    rangeBefore(): TextRange;
    rangeAfter(): TextRange;
    getStringText(): string;
}
export declare const tokenTypes: readonly ["number.decimal", "string", "char", "brace.open", "brace.close", "bracket.open", "bracket.close", "parentheses.open", "parentheses.close", "punctuation.colon", "punctuation.semicolon", "punctuation.comma", "punctuation.period", "name", "boolean.true", "boolean.false", "keyword.declare", "keyword.define", "keyword.constant", "keyword.output", "keyword.input", "keyword.call", "keyword.if", "keyword.then", "keyword.else", "keyword.if_end", "keyword.for", "keyword.to", "keyword.for_end", "keyword.step", "keyword.while", "keyword.while_end", "keyword.do_while", "keyword.dowhile_end", "keyword.function", "keyword.function_end", "keyword.procedure", "keyword.procedure_end", "keyword.return", "keyword.returns", "keyword.pass_mode.by_reference", "keyword.pass_mode.by_value", "keyword.type", "keyword.type_end", "keyword.open_file", "keyword.read_file", "keyword.write_file", "keyword.close_file", "keyword.get_record", "keyword.put_record", "keyword.seek", "keyword.file_mode.read", "keyword.file_mode.write", "keyword.file_mode.append", "keyword.file_mode.random", "keyword.case", "keyword.of", "keyword.case_end", "keyword.otherwise", "keyword.class", "keyword.class_end", "keyword.new", "keyword.super", "keyword.inherits", "keyword.class_modifier.private", "keyword.class_modifier.public", "keyword.array", "keyword.set", "keyword.end", "newline", "operator.add", "operator.minus", "operator.multiply", "operator.divide", "operator.mod", "operator.integer_divide", "operator.and", "operator.or", "operator.not", "operator.equal_to", "operator.not_equal_to", "operator.less_than", "operator.greater_than", "operator.less_than_equal", "operator.greater_than_equal", "operator.assignment", "operator.pointer", "operator.string_concatenate", "operator.range"];
export type TokenType = typeof tokenTypes extends ReadonlyArray<infer T> ? T : never;
export declare function TokenType(input: string): TokenType;
export declare class Token implements TextRanged, IFormattable {
    type: TokenType;
    text: string;
    range: TextRange;
    constructor(type: TokenType, text: string, range: TextRange);
    fmtText(): string;
    fmtDebug(): string;
    clone(): Token;
    mergeFrom(tokenAfter: Token | Symbol): void;
    extendRange(other: TextRangeLike): Token;
    clearRange(): Token;
    rangeBefore(): TextRange;
    rangeAfter(): TextRange;
}
