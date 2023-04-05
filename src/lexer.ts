
type lexemeTypes = Record<string, LexemeType>;
interface LexemeType {
	matcher: RegExp;
}
interface LexemeAST {
	nodes: ASTNode[];
	
}
type ASTNode = {
	
}
type TokenType =
	["number", "decimal"] |
	["quote", "single" | "double"] |
	["brace", "open" | "close"] |
	["parentheses", "open" | "close"] |
	["word"] |
	["space"] |
	["newline"] |
	["operator",
		"add" | "subtract" | "multiply" | "divide" | "mod" | "integer_divide" | "and" | "or" | "not" |
		"equal_to" | "not_equal_to" | "less_than" | "greater_than" | "less_than_equal" | "greater_than_equal"
	];

type Token = {
	type: TokenType;
	text: string;
}

interface Lexer {
	parse(input:string): LexemeAST;
}

interface Tokenizer {
	parse(input:string): Token[];
}

class OffsetString {
	constructor(public string:string, public offset:number = 0){}
	inc(amount:number){
		this.offset += amount;
	}
	at(){
		return this.string[this.offset];
	}
	has(){
		return this.string[this.offset] != undefined;
	}
	read(){
		return this.string[this.offset ++];
	}
	length(){
		return this.string.length;
	}
}

function isNumber(char:string){
	if(char == undefined) return false;
	let code = char.charCodeAt(0);
	return (code >= 48 && code <= 57);
}

function isAlphanumeric(char:string){
	if(char == undefined) return false;
	let code = char.charCodeAt(0);
	return (code >= 48 && code <= 57) ||
		(code >= 65 && code <= 90) ||
		(code >= 97 && code <= 122);
}

const FirstTokenizer = {
	numbers: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
	parse(input:string){
		const output:Token[] = [];
		const str = new OffsetString(input);
		while(str.has()){
			switch(str.at()){
				case "+": writeChar(["operator", "add"]); break;
				case "-": writeChar(["operator", "subtract"]); break;
				case "*": writeChar(["operator", "multiply"]); break;
				case "/": writeChar(["operator", "divide"]); break;
				case "(": writeChar(["parentheses", "open"]); break;
				case ")": writeChar(["parentheses", "close"]); break;
				case "{": writeChar(["brace", "open"]); break;
				case "}": writeChar(["brace", "close"]); break;
				case `'`: writeChar(["quote", "single"]); break;
				case `"`: writeChar(["quote", "double"]); break;
				case " ": writeChar(["space"]); break;
				case "\n": writeChar(["newline"]); break;
				default:
					if(isNumber(str.at())) readNumber(str);
					else if(isAlphanumeric(str.at())){
						readWord(str);
					} else throw new Error(`Invalid character "${str.at()}"`);
			}
		}
		return output;
		
		function write(type:TokenType, text:string){
			output.push({type, text});
		}
		function writeChar(type:TokenType){
			output.push({type, text: str.read()});
		}
		function readNumber(input:OffsetString){
			let number = "";
			while(isNumber(input.at())){
				number += input.read();
			}
			if(number.length > 0) write(["number", "decimal"], number);
			return number.length > 0;
		}
		function readWord(input:OffsetString){
			let word = "";
			while(isAlphanumeric(input.at())){
				word += input.read();
			}
			if(word.length > 0) write(["word"], word);
			return word.length > 0;
		}
	}
}

function debugParse(input:string){
	console.log(`Parsing input "${input}"`);
	try {
		console.log(FirstTokenizer.parse(input));
	} catch(err){
		console.log(`Error: ${(err as any).message}`);
	}
}

debugParse("x <- 5");
