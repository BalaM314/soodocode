
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
	["bracket", "open" | "close"] |
	["parentheses", "open" | "close"] |
	["punctuation", "colon" | "semicolon" | "comma"] |
	["word"] |
	["space"] |
	["newline"] |
	["operator",
		"add" | "subtract" | "multiply" | "divide" | "mod" | "integer_divide" | "and" | "or" | "not" |
		"equal_to" | "not_equal_to" | "less_than" | "greater_than" | "less_than_equal" | "greater_than_equal" |
		"assignment"
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

class TokenizerIO {
	lastMatched:string = "";
	output:Token[] = [];
	constructor(public string:string, public offset:number = 0){}
	inc(amount:number){
		this.offset += amount;
	}
	at(){
		return this.lastMatched = this.string[this.offset];
	}
	cons(input:string){
		if(input.split("").every((v, i) => this.string[this.offset + i] == v)){
			this.lastMatched = input;
			this.offset += input.length;
			return true;
		} else return false;
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
	writeText(type:TokenType, text:string){
		this.output.push({type, text});
	}
	write(type:TokenType){
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
			(code >= 97 && code <= 122);
	}
}


export const FirstTokenizer = {
	numbers: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
	parse(input:string){
		const str = new TokenizerIO(input);
		while(str.has()){
			if(false) 0;
			else if(str.cons("MOD")) str.write(["operator", "mod"]);
			else if(str.cons("AND")) str.write(["operator", "and"]);
			else if(str.cons("OR")) str.write(["operator", "or"]);
			else if(str.cons("NOT")) str.write(["operator", "not"]);
			else if(str.cons("DIV")) str.write(["operator", "integer_divide"]);
			else if(str.cons("<-")) str.write(["operator", "assignment"]);
			else if(str.cons(">=")) str.write(["operator", "greater_than_equal"]);
			else if(str.cons("<=")) str.write(["operator", "less_than_equal"]);
			else if(str.cons("<>")) str.write(["operator", "not_equal_to"]);
			else if(str.cons("=")) str.write(["operator", "equal_to"]);
			else if(str.cons(">")) str.write(["operator", "greater_than"]);
			else if(str.cons("<")) str.write(["operator", "less_than"]);
			else if(str.cons("-")) str.write(["operator", "subtract"]);
			else if(str.cons("+")) str.write(["operator", "add"]);
			else if(str.cons("-")) str.write(["operator", "subtract"]);
			else if(str.cons("*")) str.write(["operator", "multiply"]);
			else if(str.cons("/")) str.write(["operator", "divide"]);
			else if(str.cons("(")) str.write(["parentheses", "open"]);
			else if(str.cons(")")) str.write(["parentheses", "close"]);
			else if(str.cons("{")) str.write(["brace", "open"]);
			else if(str.cons("}")) str.write(["brace", "close"]);
			else if(str.cons(`'`)) str.write(["quote", "single"]);
			else if(str.cons(`"`)) str.write(["quote", "double"]);
			else if(str.cons(`:`)) str.write(["punctuation", "colon"]);
			else if(str.cons(`;`)) str.write(["punctuation", "semicolon"]);
			else if(str.cons(`,`)) str.write(["punctuation", "comma"]);
			else if(str.cons(" ")) str.write(["space"]);
			else if(str.cons("\n")) str.write(["newline"]);
			else if(str.isNumber()){
				let number = "";
				do {
					number += str.read();
				} while(str.isNumber())
				str.writeText(["number", "decimal"], number);
			}
			else if(str.isAlphanumeric()){
				let word = "";
				do {
					word += str.read();
				} while(str.isAlphanumeric())
				str.writeText(["word"], word);
			}
			else throw new Error(`Invalid character "${str.at()}"`);
		}
		return str.output;
	}
}

function debugParse(input:string){
	console.log(`Parsing input: ${input}`);
	try {
		console.log(FirstTokenizer.parse(input).map(t => `\t${`"${t.text}"`.padEnd(20, " ")}${t.type.join(".")}`).join("\n"));
	} catch(err){
		console.log(`Error: ${(err as any).message}`);
	}
}
const procedureCode = `\
PROCEDURE OutputRange()
DECLARE First, Last, Count, Index, ThisErr : INTEGER
DECLARE ThisMess : STRING
DECLARE PastLast: BOOLEAN
Count <- 0
Index <- 1
PastLast <- FALSE
OUTPUT "Please input first error number: "
INPUT First
OUTPUT "Please input last error number: "
INPUT Last
OUTPUT "List of error numbers from ", First, " to ",
Last
WHILE Index < 501 AND NOT PastLast
ThisErr <- ErrCode[Index]
IF ThisErr > Last THEN
PastLast <- TRUE
ELSE
IF ThisErr >= First THEN
ThisMess <- ErrText[Index]
IF ThisMess = "" THEN
ThisMess <- "Error Text Missing"
ENDIF
OUTPUT ThisErr, " : ", ThisMess
Count <- Count + 1
ENDIF
ENDIF
Index <- Index + 1
ENDWHILE
OUTPUT Count, " error numbers output"
ENDPROCEDURE`
;

if(process.argv.slice(2).includes("--debug"))
	procedureCode.split("\n").forEach(line => debugParse(line));
