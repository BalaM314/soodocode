/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the lexer, which takes the raw user input and processes it;
first into a list of symbols, such as "operator.add" (+), "numeric_fragment" (123), or "quote.double" ("),
second into a list of tokens, such as "operator.add" (+), "number.decimal" (12.34), "keyword.readfile", or "string" ("amogus").
*/


import {
	Symbol, SymbolType, SymbolizedProgram, TextRange, Token, TokenType, TokenizedProgram
} from "./lexer-types.js";
import { crash, fail, impossible } from "./utils.js";


const symbolTypeData: [
	identifier: string | [SymbolSpecifierFuncName] | RegExp, symbol:SymbolType
][] = [
	[/<-{1,2}/, "operator.assignment"],
	[">=", "operator.greater_than_equal"],
	["<=", "operator.less_than_equal"],
	["<>", "operator.not_equal_to"],
	["//", "comment.singleline"],
	["/*", "comment.multiline_open"],
	["*/", "comment.multiline_close"],
	["=", "operator.equal_to"],
	[">", "operator.greater_than"],
	["<", "operator.less_than"],
	["+", "operator.add"],
	["-", "operator.minus"],
	["*", "operator.multiply"],
	["/", "operator.divide"],
	["^", "operator.pointer"],
	["&", "operator.string_concatenate"],
	["(", "parentheses.open"],
	[")", "parentheses.close"],
	["[", "bracket.open"],
	["]", "bracket.close"],
	["{", "brace.open"],
	["}", "brace.close"],
	["'", "quote.single"],
	["\"", "quote.double"],
	[":", "punctuation.colon"],
	[";", "punctuation.semicolon"],
	[",", "punctuation.comma"],
	[".", "punctuation.period"],
	[" ", "space"],
	["\t", "space"],
	["\n", "newline"],
	[["isNumber"], "numeric_fragment"],
	[["isAlphanumeric"], "word"],
	[/^./u, "unknown"],
];

const tokenNameTypeData = (<T>(d:T) => d as T & {[index:string]: TokenType | undefined;})({
	"AND": "operator.and",
	"APPEND": "keyword.file-mode.append",
	"ARRAY": "keyword.array",
	"BYREF": "keyword.by-reference",
	"BYVAL": "keyword.by-value",
	"CALL": "keyword.call",
	"CASE": "keyword.case",
	"CLASS": "keyword.class",
	"CLOSEFILE": "keyword.closefile",
	"CONSTANT": "keyword.constant",
	"DECLARE": "keyword.declare",
	"DIV": "operator.integer_divide",
	"ELSE": "keyword.else",
	"ENDCASE": "keyword.case_end",
	"ENDCLASS": "keyword.class_end",
	"ENDFUNCTION": "keyword.function_end",
	"ENDIF": "keyword.if_end",
	"ENDPROCEDURE": "keyword.procedure_end",
	"ENDTYPE": "keyword.type_end",
	"ENDWHILE": "keyword.while_end",
	"FALSE": "boolean.false",
	"FOR": "keyword.for",
	"FUNCTION": "keyword.function",
	"GETRECORD": "keyword.getrecord",
	"IF": "keyword.if",
	"INHERITS": "keyword.inherits",
	"INPUT": "keyword.input",
	"MOD": "operator.mod",
	"NEW": "keyword.new",
	"NEXT": "keyword.for_end",
	"NOT": "operator.not",
	"OF": "keyword.of",
	"OPENFILE": "keyword.openfile",
	"OR": "operator.or",
	"OTHERWISE": "keyword.otherwise",
	"OUTPUT": "keyword.output",
	"PRIVATE": "keyword.class-modifier.private",
	"PROCEDURE": "keyword.procedure",
	"PUBLIC": "keyword.class-modifier.public",
	"PUTRECORD": "keyword.putrecord",
	"RANDOM": "keyword.file-mode.random",
	"READ": "keyword.file-mode.read",
	"READFILE": "keyword.readfile",
	"REPEAT": "keyword.dowhile",
	"RETURN": "keyword.return",
	"RETURNS": "keyword.returns",
	"SEEK": "keyword.seek",
	"STEP": "keyword.step",
	"SUPER": "keyword.super",
	"THEN": "keyword.then",
	"TO": "keyword.to",
	"TRUE": "boolean.true",
	"TYPE": "keyword.type",
	"UNTIL": "keyword.dowhile_end",
	"WHILE": "keyword.while",
	"WRITE": "keyword.file-mode.write",
	"WRITEFILE": "keyword.writefile",
});


/** A The name of a function on SymbolizerIO that can be used to parse a symbol. */
type SymbolSpecifierFuncName = "isAlphanumeric" | "isNumber";
/** Util class for the symbolizer. Makes it easier to process a string. */
class SymbolizerIO {
	lastMatched:string | null = null;
	lastMatchedRange:TextRange | null = null;
	output:Symbol[] = [];
	constructor(public string:string, public offset:number = 0){}
	inc(amount:number){
		this.offset += amount;
	}
	at(){
		return this.string[this.offset];
	}
	cons(input:string | RegExp):boolean {
		if(input instanceof RegExp){
			const matchData = input.exec(this.string.slice(this.offset));
			if(matchData == null || matchData.index != 0) return false;
			this.lastMatched = matchData[0];
			this.lastMatchedRange = [this.offset, this.offset + matchData[0].length];
			this.offset += matchData[0].length;
			return true;
		} else {
			if(this.string.slice(this.offset, this.offset + input.length) == input){
				this.lastMatched = input;
				this.lastMatchedRange = [this.offset, this.offset + input.length];
				this.offset += input.length;
				return true;
			} else return false;
		}
	}
	has(){
		return this.string[this.offset] != undefined;
	}
	read(){
		this.lastMatchedRange ??= [this.offset, this.offset];
		this.lastMatched ??= "";
		this.lastMatchedRange[1] ++;
		this.lastMatched += this.string[this.offset ++];
		return this.string[this.offset - 1];
	}
	length(){
		return this.string.length;
	}
	writeText(type:SymbolType, text:string, range:TextRange){
		this.output.push(new Symbol(type, text, range));
	}
	write(type:SymbolType){
		if(!this.lastMatched || !this.lastMatchedRange) crash(`Cannot write symbol, no stored match`);
		this.output.push(new Symbol(type, this.lastMatched, this.lastMatchedRange.slice()));
		this.lastMatched = this.lastMatchedRange = null;
	}
	isNumber(){
		if(!this.has()) return false;
		let code = this.at().charCodeAt(0);
		return (code >= 48 && code <= 57);
	}
	isAlphanumeric(){
		if(!this.has()) return false;
		let code = this.at().charCodeAt(0);
		//0-9, a-z, A-Z, _
		return (code >= 48 && code <= 57) ||
			(code >= 65 && code <= 90) ||
			(code >= 97 && code <= 122) || code === 95;
	}
}
SymbolizerIO.prototype satisfies Record<SymbolSpecifierFuncName, () => boolean>;

/** Converts an input string to a list of symbols. */
export function symbolize(input:string):SymbolizedProgram {
	const str = new SymbolizerIO(input);
	toNextCharacter:
	while(str.has()){
		//TODO optimize nested loop
		for(const [identifier, symbolType] of symbolTypeData){
			if(typeof identifier == "string" || identifier instanceof RegExp){
				if(str.cons(identifier)){
					str.write(symbolType);
					continue toNextCharacter;
				}
			} else {
				const func = SymbolizerIO.prototype[identifier[0]];
				if(func.call(str)){
					do {
						str.read();
					} while(func.call(str));
					str.write(symbolType);
					continue toNextCharacter;
				}
			}
		}
		impossible();
	}
	return {
		program: input,
		symbols: str.output
	};
}


/** Converts a list of symbols into a list of tokens. */
export function tokenize(input:SymbolizedProgram):TokenizedProgram {
	const tokens:Token[] = [];
	const state = {
		sComment: null as null | Symbol,
		mComment: null as null | Symbol,
		sString: null as null | Symbol,
		dString: null as null | Symbol,
		decimalNumber: "none" as "none" | "allowDecimal" | "requireNumber",
	}
	let currentString = "";
	let symbol:Symbol;
	for(symbol of input.symbols){
		if(state.decimalNumber == "allowDecimal" && symbol.type !== "punctuation.period")
			state.decimalNumber = "none"; //Cursed state reset

		//State checks and comments
		if(state.sComment){
			if(symbol.type === "newline"){
				state.sComment = null;
				symbol.type satisfies TokenType;
				tokens.push(symbol.toToken());
			}
		} else if(symbol.type === "comment.multiline_close"){
			if(state.mComment) state.mComment = null;
			else fail(`Cannot close multiline comment, no open multiline comment`, symbol);
		} else if(state.mComment){
			//discard the symbol
		} else if(state.sString){
			currentString += symbol.text;
			if(symbol.type === "quote.single"){
				state.sString = null;
				if(currentString.length != 3) fail(`Character ${currentString} has an invalid length: expected one character`, [symbol.range[1] - currentString.length, symbol.range[1]]);
				tokens.push(new Token("char", currentString, [symbol.range[1] - 3, symbol.range[1]]));
				currentString = "";
			}
		} else if(state.dString){
			currentString += symbol.text;
			if(symbol.type === "quote.double"){
				state.dString = null;
				tokens.push(new Token("string", currentString, [symbol.range[1] - currentString.length, symbol.range[1]]));
				currentString = "";
			}
		} else if(symbol.type === "comment.singleline") state.sComment = symbol;
		else if(symbol.type === "comment.multiline_open") state.mComment = symbol;
		//Decimals
		else if(state.decimalNumber == "requireNumber"){
			const num = tokens.at(-1) ?? crash(`impossible`);
			if(symbol.type == "numeric_fragment"){
				//very cursed modifying of the token
				num.text += "." + symbol.text;
				num.range[1] += (1 + symbol.text.length);
				if(isNaN(Number(num.text))) crash(`Invalid parsed number ${symbol.text}`);
				state.decimalNumber = "none";
			} else fail(`Expected a number to follow "${num.text}.", but found ${symbol.type}`, symbol);
		} else if(state.decimalNumber == "allowDecimal" && symbol.type == "punctuation.period"){
			state.decimalNumber = "requireNumber";
		} else if(symbol.type === "quote.single"){
			state.sString = symbol;
			currentString += symbol.text;
		} else if(symbol.type === "quote.double"){
			state.dString = symbol;
			currentString += symbol.text;
		} else if(symbol.type === "space") void 0;
		else if(symbol.type === "unknown") fail(`Invalid symbol ${symbol.text}`, symbol);
		else if(symbol.type === "punctuation.period") fail(`Invalid symbol ${symbol.text}, periods are only allowed within numbers`, symbol);
		else if(symbol.type === "numeric_fragment"){
			state.decimalNumber = "allowDecimal";
			if(isNaN(Number(symbol.text))) crash(`Invalid parsed number ${symbol.text}`);
			tokens.push(new Token("number.decimal", symbol.text, symbol.range.slice()));
		} else if(symbol.type === "word"){
			write(tokenNameTypeData[symbol.text] ?? "name");
		} else {
			symbol.type satisfies TokenType;
			tokens.push(symbol.toToken());
		}
	}
	//Ending state checks
	if(state.mComment) fail(`Unclosed multiline comment`, state.mComment);
	if(state.dString) fail(`Unclosed double-quoted string`, state.dString);
	if(state.sString) fail(`Unclosed single-quoted string`, state.sString);
	if(state.decimalNumber == "requireNumber") fail(`Expected a numeric fragment, but found end of input`, input.symbols.at(-1)!.rangeAfter());
	return {
		program: input.program,
		tokens
	};

	function write(type:TokenType){
		tokens.push(new Token(type, symbol.text, symbol.range.slice()));
	}
}


