/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains types for the lexer, such as Symbol and Token.
*/

import type { IFormattable, TextRange, TextRangeLike, TextRanged, TextRanged2 } from "./types.js";
import { crash, getRange, getTotalRange, impossible } from "./utils.js";

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
] as const;
export type SymbolType = typeof symbolTypes extends ReadonlyArray<infer T> ? T : never;

export type SymbolizedProgram = {
	program: string;
	symbols: Symbol[];
}

export type TokenizedProgram = {
	program: string;
	tokens: RangeArray<Token>;
}

/** Represents a single symbol parsed from the input text, such as "operator.add" (+), "numeric_fragment" (123), or "quote.double" (") */
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
}

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
	"keyword.while", "keyword.while_end", "keyword.dowhile", "keyword.dowhile_end",
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
	"newline",
	"operator.add", "operator.minus", "operator.multiply", "operator.divide", "operator.mod", "operator.integer_divide", "operator.and", "operator.or", "operator.not", "operator.equal_to", "operator.not_equal_to", "operator.less_than", "operator.greater_than", "operator.less_than_equal", "operator.greater_than_equal", "operator.assignment", "operator.pointer", "operator.string_concatenate"
] as const;
export type TokenType = typeof tokenTypes extends ReadonlyArray<infer T> ? T : never;
export function TokenType(input:string):TokenType {
	if(tokenTypes.includes(input)) return input;
	crash(`"${input}" is not a valid token type`);
}

/** Represents a single token parsed from the list of symbols, such as such as "operator.add" (+), "number.decimal" (12.34), "keyword.readfile", or "string" ("amogus") */
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
		return new Token(this.type, this.text, this.range);
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
export class RangeArray<T extends TextRanged2> extends Array<T> implements TextRanged {
	range:TextRange;
	// constructor(length:number);
	constructor(tokens:T[], range?:TextRange);
	/** range must be specified if the array is empty */
	constructor(arg0:number | T[], range?:TextRange){
		if(typeof arg0 == "number"){
			super(arg0);
			this.range = null!;
		} else {
			super(...arg0);
			this.range = range ?? getTotalRange(arg0);
		}
	}
	slice(start:number = 0, end:number = this.length):RangeArray<T> {
		const arr = super.slice(start, end);
		if(arr.length == 0){
			//Determine the range
			let range:TextRange;
			if(this.length == 0) range = this.range; //slicing an empty array, no other information is available so just use the same range
			else {
				//If the element before the start of the slice exists
				//Pick the end of that element's range
				//Otherwise, pick the start of the array's range
				const rangeStart = this[start - 1]?.range[1] ?? this.range[0];
				//If the element after the end of the slice exists
				//Pick the beginning of that element's range
				//Otherwise, pick the end of the array's range
				const rangeEnd = this.at(end)?.range[0] ?? this.range[1];
				range = [rangeStart, rangeEnd];
			}
			return new RangeArray<T>(arr, range);
		} else {
			return new RangeArray<T>(arr);
		}
	}
	map<U>(fn:(v:T, i:number, a:T[]) => U):U[] {
		return [...this].map(fn);
	}
}


