import { crash, fail, impossible } from "./utils.js";


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
	"operator.add", "operator.subtract", "operator.multiply", "operator.divide", "operator.mod", "operator.integer_divide", "operator.and", "operator.or", "operator.not", "operator.equal_to", "operator.not_equal_to", "operator.less_than", "operator.greater_than", "operator.less_than_equal", "operator.greater_than_equal", "operator.assignment", "operator.pointer", "operator.string_concatenate"
] as const;
export type SymbolType = typeof symbolTypes extends ReadonlyArray<infer T> ? T : never;

export class Symbol {
	constructor(
		public type: SymbolType,
		public text: string,
	){}
	/** type must be a valid token type */
	toToken(){
		if(tokenTypes.includes(this.type as TokenType)) //typescript being dumb
			return new Token(this.type as TokenType, this.text);
		else crash(`Cannot convert symbol ${this.toString()} to a token: type is not a valid token type`);
	}
	toString(){
		return `<${this.type} ${this.text}>`;
	}
}
export function symbol(type:SymbolType, text:string){
	return new Symbol(type, text);
}

export const tokenTypes = [
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
	"keyword.for", "keyword.to", "keyword.for_end", "keyword.while", "keyword.while_end", "keyword.dowhile", "keyword.dowhile_end",
	"keyword.function", "keyword.function_end", "keyword.procedure", "keyword.procedure_end", "keyword.return", "keyword.returns", "keyword.by-reference", "keyword.by-value",
	"keyword.openfile", "keyword.readfile", "keyword.writefile",
	"keyword.case", "keyword.of", "keyword.case_end", "keyword.otherwise",
	"keyword.array",
	"newline",
	"operator.add", "operator.subtract", "operator.multiply", "operator.divide", "operator.mod", "operator.integer_divide", "operator.and", "operator.or", "operator.not", "operator.equal_to", "operator.not_equal_to", "operator.less_than", "operator.greater_than", "operator.less_than_equal", "operator.greater_than_equal", "operator.assignment", "operator.pointer", "operator.string_concatenate"
] as const;
export type TokenType = typeof tokenTypes extends ReadonlyArray<infer T> ? T : never;

export class Token {
	constructor(
		public type: TokenType,
		public text: string,
	){}
	__token__(){};
	toString(){
		return `[${this.type} ${this.text}]`;
	}
}
export function token(type:TokenType, text:string){
	return new Token(type, text);
}


class SymbolizerIO {
	lastMatched:string = "";
	output:Symbol[] = [];
	constructor(public string:string, public offset:number = 0){}
	inc(amount:number){
		this.offset += amount;
	}
	at(){
		return this.lastMatched = this.string[this.offset];
	}
	cons(input:string | RegExp):boolean {
		if(input instanceof RegExp){
			const matchData = input.exec(this.string.slice(this.offset));
			if(matchData == null || matchData.index != 0) return false;
			this.lastMatched = matchData[0];
			this.offset += matchData[0].length;
			return true;
		} else {
			if(input.split("").every((v, i) => this.string[this.offset + i] == v)){
				this.lastMatched = input;
				this.offset += input.length;
				return true;
			} else return false;
		}
	}
	has(){
		return this.string[this.offset] != undefined;
	}
	read(){
		return this.lastMatched = this.string[this.offset ++];
	}
	length(){
		return this.string.length;
	}
	writeText(type:SymbolType, text:string){
		this.output.push(symbol(type, text));
	}
	write(type:SymbolType){
		this.output.push(symbol(type, this.lastMatched));
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


export function symbolize(input:string){
	const str = new SymbolizerIO(input);
	toNextCharacter:
	while(str.has()){
		for(const [identifier, symbolType] of symbolTypeData){
			if(typeof identifier == "string" || identifier instanceof RegExp){
				if(str.cons(identifier)){
					str.write(symbolType);
					continue toNextCharacter;
				}
			} else if(identifier.call(str)){
				let buffer = "";
				do {
					buffer += str.read();
				} while(identifier.call(str));
				str.writeText(symbolType, buffer);
				continue toNextCharacter;
			}
		}
		impossible();
	}
	return str.output;
}

//TS magic: _ is a default type argument to create a variable inside a generic, which is necessary to trigger DCT
type Funcs<
	Proto = (typeof SymbolizerIO)["prototype"],
	_ = Proto[keyof Proto]
> = _ extends () => boolean ? _ : never;

const symbolTypeData: [
	identifier: string | Funcs | RegExp, symbol:SymbolType
][] = [
	["MOD", "operator.mod"],
	["AND", "operator.and"],
	["OR", "operator.or"],
	["NOT", "operator.not"],
	["DIV", "operator.integer_divide"],
	["<-", "operator.assignment"],
	[">=", "operator.greater_than_equal"],
	["<=", "operator.less_than_equal"],
	["<>", "operator.not_equal_to"],
	["//", "comment.singleline"],
	["/*", "comment.multiline_open"],
	["*/", "comment.multiline_close"],
	["=", "operator.equal_to"],
	[">", "operator.greater_than"],
	["<", "operator.less_than"],
	["-", "operator.subtract"],
	["+", "operator.add"],
	["-", "operator.subtract"],
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
	[SymbolizerIO.prototype.isNumber, "numeric_fragment"],
	[SymbolizerIO.prototype.isAlphanumeric, "word"],
	[/^./, "unknown"],
];

export function tokenize(input:Symbol[]):Token[] {
	const output:Token[] = [];
	const state = {
		sComment: false,
		mComment: false,
		sString: false,
		dString: false,
		decimalNumber: "none" as "none" | "allowDecimal" | "requireNumber",
	}
	let currentString = "";
	let symbol:Symbol;
	for(symbol of input){
		if(state.decimalNumber == "allowDecimal" && symbol.type !== "punctuation.period")
			state.decimalNumber = "none"; //Cursed state reset

		//State checks and comments
		if(state.sComment){
			if(symbol.type === "newline"){
				state.sComment = false;
				symbol.type satisfies TokenType;
				output.push(symbol.toToken());
			}
		} else if(symbol.type === "comment.multiline_close"){
			if(state.mComment) state.mComment = false;
			else fail(`Cannot close multiline comment, no open multiline comment`);
		} else if(state.mComment){
			//discard the symbol
		} else if(state.sString){
			currentString += symbol.text;
			if(symbol.type === "quote.single"){
				state.sString = false;
				if(currentString.length != 3) fail(`Character ${currentString} has an invalid length: expected one character`);
				output.push(token("char", currentString));
				currentString = "";
			}
		} else if(state.dString){
			currentString += symbol.text;
			if(symbol.type === "quote.double"){
				state.dString = false;
				output.push(token("string", currentString));
				currentString = "";
			}
		} else if(symbol.type === "comment.singleline") state.sComment = true;
		else if(symbol.type === "comment.multiline_open") state.mComment = true;
		//Decimals
		else if(state.decimalNumber == "requireNumber"){
			const num = output.at(-1) ?? crash(`impossible`);
			if(symbol.type == "numeric_fragment"){
				num.text += "." + symbol.text;
				if(isNaN(Number(num.text))) crash(`Invalid parsed number ${symbol.text}`);
				state.decimalNumber = "none";
			} else fail(`Expected a number to follow "${num.text}.", but found ${symbol.type}`);
		} else if(state.decimalNumber == "allowDecimal" && symbol.type == "punctuation.period"){
			state.decimalNumber = "requireNumber";
		} else if(symbol.type === "quote.single"){
			state.sString = true;
			currentString += symbol.text;
		} else if(symbol.type === "quote.double"){
			state.dString = true;
			currentString += symbol.text;
		} else if(symbol.type === "space") void 0;
		else if(symbol.type === "unknown") fail(`Invalid symbol ${symbol.text}`);
		else if(symbol.type === "punctuation.period") fail(`Invalid symbol ${symbol.text}, periods are only allowed within numbers`);
		else if(symbol.type === "numeric_fragment"){
			state.decimalNumber = "allowDecimal";
			if(isNaN(Number(symbol.text))) crash(`Invalid parsed number ${symbol.text}`);
			output.push(token("number.decimal", symbol.text));
		} else if(symbol.type === "word"){
			switch(symbol.text){ //TODO datastructify
				case "TRUE": write("boolean.true"); break;
				case "FALSE": write("boolean.false"); break;
				case "DECLARE": write("keyword.declare"); break;
				case "CONSTANT": write("keyword.constant"); break;
				case "OUTPUT": write("keyword.output"); break;
				case "INPUT": write("keyword.input"); break;
				case "CALL": write("keyword.call"); break;
				case "IF": write("keyword.if"); break;
				case "THEN": write("keyword.then"); break;
				case "ELSE": write("keyword.else"); break;
				case "ENDIF": write("keyword.if_end"); break;
				case "FOR": write("keyword.for"); break;
				case "TO": write("keyword.to"); break;
				case "NEXT": write("keyword.for_end"); break;
				case "WHILE": write("keyword.while"); break;
				case "ENDWHILE": write("keyword.while_end"); break;
				case "REPEAT": write("keyword.dowhile"); break;
				case "UNTIL": write("keyword.dowhile_end"); break;
				case "FUNCTION": write("keyword.function"); break;
				case "BYREF": write("keyword.by-reference"); break;
				case "BYVAL": write("keyword.by-value"); break;
				case "ENDFUNCTION": write("keyword.function_end"); break;
				case "PROCEDURE": write("keyword.procedure"); break;
				case "ENDPROCEDURE": write("keyword.procedure_end"); break;
				case "RETURN": write("keyword.return"); break;
				case "RETURNS": write("keyword.returns"); break;
				case "OPENFILE": write("keyword.openfile"); break;
				case "READFILE": write("keyword.readfile"); break;
				case "WRITEFILE": write("keyword.writefile"); break;
				case "CASE": write("keyword.case"); break;
				case "OF": write("keyword.of"); break;
				case "ENDCASE": write("keyword.case_end"); break;
				case "OTHERWISE": write("keyword.otherwise"); break;
				case "ARRAY": write("keyword.array"); break;
				default: output.push(token("name", symbol.text)); break;
			}
		} else {
			symbol.type satisfies TokenType;
			output.push(symbol.toToken());
		}
	}
	if(state.mComment) fail(`Unclosed multiline comment`);
	if(state.dString) fail(`Unclosed double-quoted string`);
	if(state.sString) fail(`Unclosed single-quoted string`);
	if(state.decimalNumber == "requireNumber") fail(`Expected a number to follow "${(output.at(-1) ?? crash(`impossible`)).text}.", but found end of input`);
	return output;

	function write(type:TokenType){
		output.push(token(type, symbol.text));
	}
}


export function getText(tokens:Token[]){
	return tokens.map(t => t.text).join(" ");
}
