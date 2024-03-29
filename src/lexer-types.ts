import { crash, getRange, getTotalRange } from "./utils.js";

export type TextRange = [start:number, end:number];
export type TextRanged = {
	range: TextRange | (() => TextRange);
}
export type TextRangeLike = TextRange | TextRanged | (TextRange | TextRanged)[];

export const symbolTypes = [
	"numeric_fragment",
	"quote.single", "quote.double",
	"brace.open", "brace.close",
	"bracket.open", "bracket.close",
	"parentheses.open", "parentheses.close",
	"punctuation.colon", "punctuation.semicolon", "punctuation.comma", "punctuation.period",
	"comment.singleline", "comment.multiline_open", "comment.multiline_close",
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
	tokens: Token[];
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
		if(tokenTypes.includes(this.type as TokenType)) //typescript being dumb
			return new Token(this.type as TokenType, this.text, this.range);
		else crash(`Cannot convert symbol ${this.toString()} to a token: type is not a valid token type`);
	}
	toString(){
		return `<${this.type} ${this.text}>`;
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
export function symbol(type:SymbolType, text:string):Symbol;
export function symbol(tokenLike:[type:SymbolType, text:string]):Symbol;
export function symbol(type:SymbolType | [type:SymbolType, text:string], text?:string):Symbol {
	if(Array.isArray(type)) return new Symbol(type[0], type[1], [-1, -1]);
	else return new Symbol(type, text!, [-1, -1]);
}


export const tokenTypes = [
	//TODO fix the casing in names, decide on _ or - or concat
	"number.decimal",
	"string", "char",
	"brace.open", "brace.close",
	"bracket.open", "bracket.close",
	"parentheses.open", "parentheses.close",
	"punctuation.colon", "punctuation.semicolon", "punctuation.comma",
	"comment",
	"name",
	"boolean.true", "boolean.false",
	"keyword.declare", "keyword.constant", "keyword.output", "keyword.input", "keyword.call",
	"keyword.if", "keyword.then", "keyword.else", "keyword.if_end",
	"keyword.for", "keyword.to", "keyword.for_end", "keyword.step",
	"keyword.while", "keyword.while_end", "keyword.dowhile", "keyword.dowhile_end",
	"keyword.function", "keyword.function_end", "keyword.procedure", "keyword.procedure_end", "keyword.return", "keyword.returns", "keyword.by-reference", "keyword.by-value", //TODO rename to .pass-mode.by-value
	"keyword.type", "keyword.type_end",
	"keyword.openfile", "keyword.readfile", "keyword.writefile", "keyword.closefile",
	"keyword.getrecord", "keyword.putrecord", "keyword.seek",
	"keyword.file-mode.read", "keyword.file-mode.write", "keyword.file-mode.append", "keyword.file-mode.random",
	"keyword.case", "keyword.of", "keyword.case_end", "keyword.otherwise",
	"keyword.class", "keyword.class_end", "keyword.new", "keyword.super", "keyword.inherits",
	"keyword.class-modifier.private", "keyword.class-modifier.public",
	"keyword.array",
	"newline",
	"operator.add", "operator.minus", "operator.multiply", "operator.divide", "operator.mod", "operator.integer_divide", "operator.and", "operator.or", "operator.not", "operator.equal_to", "operator.not_equal_to", "operator.less_than", "operator.greater_than", "operator.less_than_equal", "operator.greater_than_equal", "operator.assignment", "operator.pointer", "operator.string_concatenate"
] as const;
export type TokenType = typeof tokenTypes extends ReadonlyArray<infer T> ? T : never;

/** Represents a single token parsed from the list of symbols, such as such as "operator.add" (+), "number.decimal" (12.34), "keyword.readfile", or "string" ("amogus") */
export class Token implements TextRanged {
	constructor(
		public type: TokenType,
		public text: string,
		public range: TextRange,
	){}
	__token__(){};
	toString(){
		return `[${this.type} ${this.text}]`;
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
	rangeBefore():TextRange {
		return [this.range[0] - 1, this.range[0]];
	}
	rangeAfter():TextRange {
		return [this.range[1], this.range[1] + 1];
	}
}
export function token(type:TokenType, text:string):Token;
export function token(tokenLike:[type:TokenType, text:string]):Token;
export function token(type:TokenType | [type:TokenType, text:string], text?:string):Token {
	if(Array.isArray(type)) return new Token(type[0], type[1], [-1, -1]);
	else return new Token(type, text!, [-1, -1]);
}
