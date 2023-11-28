
export type SymbolType =
	"number.decimal" |
	"quote.single" | "quote.double" |
	"brace.open" | "brace.close" |
	"bracket.open" | "bracket.close" |
	"parentheses.open" | "parentheses.close" |
	"punctuation.colon" | "punctuation.semicolon" | "punctuation.comma" |
	"comment.singleline" | "comment.multiline_open" | "comment.multiline_close" |
	"word" |
	"unknown" |
	"space" |
	"newline" |
	"operator.add" | "operator.subtract" | "operator.multiply" | "operator.divide" | "operator.mod" | "operator.integer_divide" | "operator.and" | "operator.or" | "operator.not" | "operator.equal_to" | "operator.not_equal_to" | "operator.less_than" | "operator.greater_than" | "operator.less_than_equal" | "operator.greater_than_equal" | "operator.assignment" | "operator.pointer";

export type Symbol = {
	type: SymbolType;
	text: string;
}

export type TokenType =
	"number.decimal" |
	"string" |
	"brace.open" | "brace.close" |
	"bracket.open" | "bracket.close" |
	"parentheses.open" | "parentheses.close" |
	"punctuation.colon" | "punctuation.semicolon" | "punctuation.comma" |
	"comment" |
	"name" |
	"keyword.declare" | "keyword.constant" | "keyword.output" | "keyword.input" |
	"keyword.if" | "keyword.then" | "keyword.else" | "keyword.if_end" | "keyword.for" | "keyword.to" | "keyword.for_end" | "keyword.while" | "keyword.while_end" | "keyword.dowhile" | "keyword.dowhile_end" | "keyword.function" | "keyword.function_end" | "keyword.procedure" | "keyword.procedure_end" | "keyword.return" | "keyword.returns" | "keyword.openfile" | "keyword.readfile" | "keyword.writefile" | "keyword.case" | "keyword.of" | "keyword.case_end" | "keyword.otherwise" | "keyword.call" |
	"newline" |
	"operator.add" | "operator.subtract" | "operator.multiply" | "operator.divide" | "operator.mod" | "operator.integer_divide" | "operator.and" | "operator.or" | "operator.not" | "operator.equal_to" | "operator.not_equal_to" | "operator.less_than" | "operator.greater_than" | "operator.less_than_equal" | "operator.greater_than_equal" | "operator.assignment";
export type Token = {
	type: TokenType;
	text: string;
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
		this.output.push({type, text});
	}
	write(type:SymbolType){
		this.output.push({type, text: this.lastMatched});
	}
	isNumber(){
		if(!this.has()) return false;
		let code = this.at().charCodeAt(0);
		return (code >= 48 && code <= 57);
	}
	isAlphanumeric(){
		if(!this.has()) return false;
		let code = this.at().charCodeAt(0);
		return (code >= 48 && code <= 57) ||
			(code >= 65 && code <= 90) ||
			(code >= 97 && code <= 122) || code === 95;
	}
}


export function symbolize(input:string){
	const str = new SymbolizerIO(input);
	toNextCharacter:
	while(str.has()){
		for(const [identifier, symbolType] of symbolTypes){
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
		throw new Error(`Invalid character "${str.at()}"`);
	}
	return str.output;
}

//TS magic: _ is a default type argument to create a variable inside a generic, which is necessary to trigger DCT
type Funcs<
	Proto = (typeof SymbolizerIO)["prototype"],
	_ = Proto[keyof Proto]
> = _ extends () => boolean ? _ : never;

const symbolTypes: [
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
	[" ", "space"],
	["\t", "space"],
	["\n", "newline"],
	[SymbolizerIO.prototype.isNumber, "number.decimal"],
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
	}
	let currentString = "";
	for(var symbol of input){
		if(state.sComment){
			if(symbol.type === "newline"){
				state.sComment = false;
				output.push(symbol as Token);
			}
		} else if(state.mComment){
			if(symbol.type === "comment.multiline_close") state.mComment = false;
		} else if(state.sString){
			currentString += symbol.text;
			if(symbol.type === "quote.single"){
				state.sString = false;
				output.push({text: currentString, type: "string"});
				currentString = "";
			}
		} else if(state.dString){
			currentString += symbol.text;
			if(symbol.type === "quote.double"){
				state.dString = false;
				output.push({text: currentString, type: "string"});
				currentString = "";
			}
		} else if(symbol.type === "comment.singleline") state.sComment = true;
		else if(symbol.type === "comment.multiline_open") state.mComment = true;
		else if(symbol.type === "quote.single"){
			state.sString = true;
			currentString += symbol.text;
		} else if(symbol.type === "quote.double"){
			state.dString = true;
			currentString += symbol.text;
		} else if(symbol.type === "space") void 0;
		else if(symbol.type === "unknown") throw new Error(`Invalid symbol ${symbol.text}`);
		else if(symbol.type === "word"){
			switch(symbol.text){
				case "DECLARE": write("keyword.declare"); break;
				case "CONSTANT": write("keyword.constant"); break;
				case "OUTPUT": write("keyword.output"); break;
				case "INPUT": write("keyword.input"); break;
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
				case "CALL": write("keyword.call"); break;
				default: output.push({type: "name", text: symbol.text}); break;
			}
		} else output.push(symbol as Token);
	}
	return output;

	function write(type:TokenType){
		output.push({type, text: symbol.text});
	}
}


export function getText(tokens:Token[]){
	return tokens.map(t => t.text).join(" ");
}
