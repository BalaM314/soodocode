/* @license
Copyright © <BalaM314>, 2025. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains types for the lexer, such as Symbol, Token, SymbolType, and TokenType.
*/

import type { IFormattable } from "../utils/funcs.js";
import { crash, getRange, getTotalRange, RangeArray } from "../utils/funcs.js";
import type { TextRange, TextRanged, TextRangeLike } from "../utils/types.js";

/** List of all valid types of a {@link Symbol}. */
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
	"invalid.not_equal_to",
	"space",
	"newline",
	"operator.add", "operator.minus", "operator.multiply", "operator.divide", "operator.mod", "operator.integer_divide", "operator.and", "operator.or", "operator.not", "operator.equal_to", "operator.not_equal_to", "operator.less_than", "operator.greater_than", "operator.less_than_equal", "operator.greater_than_equal", "operator.assignment", "operator.pointer", "operator.string_concatenate", "operator.range",
	"escape.quote.double", "escape.quote.single", "escape.backslash", "escape.tab", "escape.newline", "escape_character",
] as const;
/** The type of a {@link Symbol}. */
export type SymbolType = typeof symbolTypes extends ReadonlyArray<infer T> ? T : never;

/** A program after it has passed through the first stage of processing. Contains the full text, and a list of {@link Symbol Symbols}. */
export type SymbolizedProgram = {
	program: string;
	symbols: Symbol[];
}

/** A program after it has passed through the second stage of processing. Contains the full text, and a list of {@link Token Tokens}. Has whitespace and comments removed. */
export type TokenizedProgram = {
	program: string;
	tokens: RangeArray<Token>;
}

/**
 * Represents a single symbol parsed from the input text, such as "operator.add" (+), "numeric_fragment" (123), or "quote.double" (")
 * Determination of Symbols is not context-specific.
 */
export class Symbol implements TextRanged {
	constructor(
		public type: SymbolType,
		public text: string,
		public range: TextRange,
	){}
	/** type must be a valid token type */
	toToken(){
		return new Token(TokenType(this.type), this.text, this.range);
	}
	fmtDebug(){
		return `Symbol [${this.type} ${this.text}]`;
	}
	fmtText(){
		return this.text;
	}
	clearRange():Symbol {
		this.range = [-1, -1];
		return this;
	}
	rangeBefore():TextRange {
		return [this.range[0] - 1, this.range[0]];
	}
	rangeAfter():TextRange {
		return [this.range[1], this.range[1] + 1];
	}
	/** Gets the text that should be appended to a string that this symbol is a part of. */
	getStringText(){
		switch(this.type){
			case "escape.backslash": return `\\`;
			case "escape.newline": return `\n`;
			case "escape.quote.double": return `"`;
			case "escape.quote.single": return `'`;
			case "escape.tab": return `\t`;
			default: return this.text;
		}
	}
}

/** List of all valid types of a {@link Token}. */
export const tokenTypes = [
	//use _ to join words
	"number.decimal",
	"string", "char",
	"brace.open", "brace.close",
	"bracket.open", "bracket.close",
	"parentheses.open", "parentheses.close",
	"punctuation.colon", "punctuation.semicolon", "punctuation.comma", "punctuation.period",
	"name",
	"boolean.true", "boolean.false",
	"keyword.declare", "keyword.define", "keyword.constant", "keyword.output", "keyword.input", "keyword.call",
	"keyword.if", "keyword.then", "keyword.else", "keyword.if_end",
	"keyword.for", "keyword.to", "keyword.for_end", "keyword.step",
	"keyword.while", "keyword.while_end", "keyword.do_while", "keyword.dowhile_end", "keyword.do",
	"keyword.function", "keyword.function_end", "keyword.procedure", "keyword.procedure_end", "keyword.return", "keyword.returns",
	"keyword.pass_mode.by_reference", "keyword.pass_mode.by_value",
	"keyword.type", "keyword.type_end",
	"keyword.open_file", "keyword.read_file", "keyword.write_file", "keyword.close_file",
	"keyword.get_record", "keyword.put_record", "keyword.seek",
	"keyword.file_mode.read", "keyword.file_mode.write", "keyword.file_mode.append", "keyword.file_mode.random",
	"keyword.case", "keyword.of", "keyword.case_end", "keyword.otherwise",
	"keyword.class", "keyword.class_end", "keyword.new", "keyword.super", "keyword.inherits",
	"keyword.class_modifier.private", "keyword.class_modifier.public",
	"keyword.array", "keyword.set",
	"keyword.end",
	"newline",
	"operator.add", "operator.minus", "operator.multiply", "operator.divide", "operator.mod", "operator.integer_divide", "operator.and", "operator.or", "operator.not", "operator.equal_to", "operator.not_equal_to", "operator.less_than", "operator.greater_than", "operator.less_than_equal", "operator.greater_than_equal", "operator.assignment", "operator.pointer", "operator.string_concatenate", "operator.range"
] as const;
/** The type of a {@link Token}. */
export type TokenType = typeof tokenTypes extends ReadonlyArray<infer T> ? T : never;
/** Asserts that the input is a valid token type, and returns it. */
export function TokenType(input:string):TokenType {
	if(tokenTypes.includes(input)) return input;
	crash(`Assertion failed: "${input}" is not a valid token type`);
}

/**
 * Represents a single token parsed from the list of symbols, such as such as "operator.add" (`+`), "number.decimal" (`12.34`), "keyword.read_file" (`READFILE`), or "string" (`"amogus"`)
 * Determination of Tokens is context-specific.
 */
export class Token implements TextRanged, IFormattable {
	constructor(
		public type: TokenType,
		public text: string,
		public range: TextRange,
	){}
	fmtText(){
		return this.text;
	}
	fmtDebug(){
		return `Token [${this.type} ${this.text}]`;
	}
	clone():Token {
		return new Token(this.type, this.text, this.range.slice());
	}
	/** Mutates this Token to include the text and range of the next token. */
	mergeFrom(tokenAfter:Token | Symbol){
		this.text += tokenAfter.text;
		this.extendRange(tokenAfter);
	}
	extendRange(other:TextRangeLike):Token {
		this.range = getTotalRange([getRange(other), this]);
		return this;
	}
	clearRange():Token {
		this.range = [-1, -1];
		return this;
	}
	rangeBefore():TextRange { //TODO fix these to handle the thing after being a newline
		return [this.range[0] - 1, this.range[0]];
	}
	rangeAfter():TextRange {
		return [this.range[1], this.range[1] + 1];
	}
}
