/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains types for the lexer, such as Symbol and Token.
*/
import { crash, getRange, getTotalRange } from "./utils.js";
export const symbolTypes = [
    "numeric_fragment",
    "quote.single", "quote.double",
    "brace.open", "brace.close",
    "bracket.open", "bracket.close",
    "parentheses.open", "parentheses.close",
    "punctuation.colon", "punctuation.semicolon", "punctuation.comma", "punctuation.period",
    "comment.singleline", "comment.multiline.open", "comment.multiline.close",
    "word",
    "unknown",
    "space",
    "newline",
    "operator.add", "operator.minus", "operator.multiply", "operator.divide", "operator.mod", "operator.integer_divide", "operator.and", "operator.or", "operator.not", "operator.equal_to", "operator.not_equal_to", "operator.less_than", "operator.greater_than", "operator.less_than_equal", "operator.greater_than_equal", "operator.assignment", "operator.pointer", "operator.string_concatenate"
];
/** Represents a single symbol parsed from the input text, such as "operator.add" (+), "numeric_fragment" (123), or "quote.double" (") */
export class Symbol {
    constructor(type, text, range) {
        this.type = type;
        this.text = text;
        this.range = range;
    }
    /** type must be a valid token type */
    toToken() {
        if (tokenTypes.includes(this.type)) //typescript being dumb
            return new Token(this.type, this.text, this.range);
        else
            crash(`Cannot convert symbol ${this.toString()} to a token: type is not a valid token type`);
    }
    toString() {
        return `<${this.type} ${this.text}>`;
    }
    clearRange() {
        this.range = [-1, -1];
        return this;
    }
    rangeBefore() {
        return [this.range[0] - 1, this.range[0]];
    }
    rangeAfter() {
        return [this.range[1], this.range[1] + 1];
    }
}
export function symbol(type, text) {
    if (Array.isArray(type))
        return new Symbol(type[0], type[1], [-1, -1]);
    else
        return new Symbol(type, text, [-1, -1]);
}
export const tokenTypes = [
    //use _ to join words
    "number.decimal",
    "string", "char",
    "brace.open", "brace.close",
    "bracket.open", "bracket.close",
    "parentheses.open", "parentheses.close",
    "punctuation.colon", "punctuation.semicolon", "punctuation.comma", "punctuation.period",
    "comment",
    "name",
    "boolean.true", "boolean.false",
    "keyword.declare", "keyword.define", "keyword.constant", "keyword.output", "keyword.input", "keyword.call",
    "keyword.if", "keyword.then", "keyword.else", "keyword.if_end",
    "keyword.for", "keyword.to", "keyword.for_end", "keyword.step",
    "keyword.while", "keyword.while_end", "keyword.dowhile", "keyword.dowhile_end",
    "keyword.function", "keyword.function_end", "keyword.procedure", "keyword.procedure_end", "keyword.return", "keyword.returns", "keyword.pass_mode.by_reference", "keyword.pass_mode.by_value",
    "keyword.type", "keyword.type_end",
    "keyword.open_file", "keyword.read_file", "keyword.write_file", "keyword.close_file",
    "keyword.get_record", "keyword.put_record", "keyword.seek",
    "keyword.file_mode.read", "keyword.file_mode.write", "keyword.file_mode.append", "keyword.file_mode.random",
    "keyword.case", "keyword.of", "keyword.case_end", "keyword.otherwise",
    "keyword.class", "keyword.class_end", "keyword.new", "keyword.super", "keyword.inherits",
    "keyword.class_modifier.private", "keyword.class_modifier.public",
    "keyword.array", "keyword.set",
    "newline",
    "operator.add", "operator.minus", "operator.multiply", "operator.divide", "operator.mod", "operator.integer_divide", "operator.and", "operator.or", "operator.not", "operator.equal_to", "operator.not_equal_to", "operator.less_than", "operator.greater_than", "operator.less_than_equal", "operator.greater_than_equal", "operator.assignment", "operator.pointer", "operator.string_concatenate"
];
/** Represents a single token parsed from the list of symbols, such as such as "operator.add" (+), "number.decimal" (12.34), "keyword.readfile", or "string" ("amogus") */
export class Token {
    constructor(type, text, range) {
        this.type = type;
        this.text = text;
        this.range = range;
    }
    __token__() { }
    ;
    toString() {
        return `[${this.type} ${this.text}]`;
    }
    getText() {
        return this.text;
    }
    clone() {
        return new Token(this.type, this.text, this.range);
    }
    extendRange(other) {
        this.range = getTotalRange([getRange(other), this]);
        return this;
    }
    clearRange() {
        this.range = [-1, -1];
        return this;
    }
    rangeBefore() {
        return [this.range[0] - 1, this.range[0]];
    }
    rangeAfter() {
        return [this.range[1], this.range[1] + 1];
    }
}
export function token(type, text) {
    if (Array.isArray(type))
        return new Token(type[0], type[1], [-1, -1]);
    else
        return new Token(type, text, [-1, -1]);
}
