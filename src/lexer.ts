
type lexemeTypes = Record<string, LexemeType>;
interface LexemeType {
	matcher: RegExp;
}
interface LexemeAST {
	nodes: ASTNode[];
	
}
type ASTNode = {
	
}

type SymbolType =
	"number.decimal" |
	"quote.single" | "quote.double" |
	"brace.open" | "brace.close" |
	"bracket.open" | "bracket.close" |
	"parentheses.open" | "parentheses.close" |
	"punctuation.colon" | "punctuation.semicolon" | "punctuation.comma" |
	"comment.singleline" | "comment.multiline_open" | "comment.multiline_close" |
	"word" |
	"space" |
	"newline" |
	"operator.add" | "operator.subtract" | "operator.multiply" | "operator.divide" | "operator.mod" | "operator.integer_divide" | "operator.and" | "operator.or" | "operator.not" | "operator.equal_to" | "operator.not_equal_to" | "operator.less_than" | "operator.greater_than" | "operator.less_than_equal" | "operator.greater_than_equal" | "operator.assignment";

type Symbol = {
	type: SymbolType;
	text: string;
}

type TokenType =
	"number.decimal" |
	"string" |
	"brace.open" | "brace.close" |
	"bracket.open" | "bracket.close" |
	"parentheses.open" | "parentheses.close" |
	"punctuation.colon" | "punctuation.semicolon" | "punctuation.comma" |
	"comment" |
	"name" |
	"keyword.declare" | "keyword.constant" | "keyword.if" | "keyword.if_end" | "keyword.for" | "keyword.for_end" | "keyword.while" | "keyword.while_end" | "keyword.dowhile" | "keyword.dowhile_end" | "keyword.function" | "keyword.function_end" | "keyword.procedure" | "keyword.procedure_end" | "keyword.return" | "keyword.returns" | "keyword.openfile" | "keyword.readfile" | "keyword.writefile" |
	"newline" |
	"operator.add" | "operator.subtract" | "operator.multiply" | "operator.divide" | "operator.mod" | "operator.integer_divide" | "operator.and" | "operator.or" | "operator.not" | "operator.equal_to" | "operator.not_equal_to" | "operator.less_than" | "operator.greater_than" | "operator.less_than_equal" | "operator.greater_than_equal" | "operator.assignment";
type Token = {
	type: TokenType;
	text: string;
}

interface Lexer {
	parse(input:string): LexemeAST;
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
			(code >= 97 && code <= 122);
	}
}


export function symbolize(input:string){
	const str = new SymbolizerIO(input);
	while(str.has()){
		if(false) 0;
		else if(str.cons("MOD")) str.write("operator.mod");
		else if(str.cons("AND")) str.write("operator.and");
		else if(str.cons("OR")) str.write("operator.or");
		else if(str.cons("NOT")) str.write("operator.not");
		else if(str.cons("DIV")) str.write("operator.integer_divide");
		else if(str.cons("<-")) str.write("operator.assignment");
		else if(str.cons(">=")) str.write("operator.greater_than_equal");
		else if(str.cons("<=")) str.write("operator.less_than_equal");
		else if(str.cons("<>")) str.write("operator.not_equal_to");
		else if(str.cons("//")) str.write("comment.singleline");
		else if(str.cons("/*")) str.write("comment.multiline_open");
		else if(str.cons("*/")) str.write("comment.multiline_close");
		else if(str.cons("=")) str.write("operator.equal_to");
		else if(str.cons(">")) str.write("operator.greater_than");
		else if(str.cons("<")) str.write("operator.less_than");
		else if(str.cons("-")) str.write("operator.subtract");
		else if(str.cons("+")) str.write("operator.add");
		else if(str.cons("-")) str.write("operator.subtract");
		else if(str.cons("*")) str.write("operator.multiply");
		else if(str.cons("/")) str.write("operator.divide");
		else if(str.cons("(")) str.write("parentheses.open");
		else if(str.cons(")")) str.write("parentheses.close");
		else if(str.cons("{")) str.write("brace.open");
		else if(str.cons("}")) str.write("brace.close");
		else if(str.cons(`'`)) str.write("quote.single");
		else if(str.cons(`"`)) str.write("quote.double");
		else if(str.cons(`:`)) str.write("punctuation.colon");
		else if(str.cons(`;`)) str.write("punctuation.semicolon");
		else if(str.cons(`,`)) str.write("punctuation.comma");
		else if(str.cons(" ")) str.write("space");
		else if(str.cons("\n")) str.write("newline");
		else if(str.isNumber()){
			let number = "";
			do {
				number += str.read();
			} while(str.isNumber())
			str.writeText("number.decimal", number);
		}
		else if(str.isAlphanumeric()){
			let word = "";
			do {
				word += str.read();
			} while(str.isAlphanumeric())
			str.writeText("word", word);
		}
		else throw new Error(`Invalid character "${str.at()}"`);
	}
	return str.output;
}

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
			if(symbol.type === "quote.single"){
				state.sString = false;
				output.push({text: currentString, type: "string"});
				currentString = "";
			} else {
				currentString += symbol.text;
			}
		} else if(state.dString){
			if(symbol.type === "quote.double"){
				state.dString = false;
				output.push({text: currentString, type: "string"});
				currentString = "";
			} else {
				currentString += symbol.text;
			}
		} else if(symbol.type === "comment.singleline") state.sComment = true;
		else if(symbol.type === "comment.multiline_open") state.mComment = true;
		else if(symbol.type === "quote.single") state.sString = true;
		else if(symbol.type === "quote.double") state.dString = true;
		else if(symbol.type === "space") void 0;
		else if(symbol.type === "word"){
			switch(symbol.text){
				case "DECLARE": write("keyword.declare"); break;
				case "CONSTANT": write("keyword.constant"); break;
				case "IF": write("keyword.if"); break;
				case "ENDIF": write("keyword.if_end"); break;
				case "FOR": write("keyword.for"); break;
				case "ENDFOR": write("keyword.for_end"); break;
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
				default: output.push({type: "name", text: symbol.text}); break;
			}
		} else output.push(symbol as Token);
	}
	return output;

	function write(type:TokenType){
		output.push({type, text: symbol.text});
	}
}

function debugParse(input:string){
	console.log(`Parsing input: ${input}`);
	try {
		const symbols = symbolize(input);
		console.log(symbols.map(t => `\t${`"${t.text}"`.padEnd(20, " ")}${t.type}`).join("\n"));
		console.log("----");
		const tokens = tokenize(symbols);
		console.log(tokens.map(t => `\t${`"${t.text}"`.padEnd(20, " ")}${t.type}`).join("\n"));
	} catch(err){
		console.log(`Error: ${(err as any).message}`);
	}
}
// const procedureCode = `\
// PROCEDURE OutputRange()
// DECLARE First, Last, Count, Index, ThisErr : INTEGER
// DECLARE ThisMess : STRING
// DECLARE PastLast: BOOLEAN
// Count <- 0
// Index <- 1
// PastLast <- FALSE
// OUTPUT "Please input first error number: "
// INPUT First
// OUTPUT "Please input last error number: "
// INPUT Last
// OUTPUT "List of error numbers from ", First, " to ",
// Last
// WHILE Index < 501 AND NOT PastLast
// ThisErr <- ErrCode[Index]
// IF ThisErr > Last THEN
// PastLast <- TRUE
// ELSE
// IF ThisErr >= First THEN
// ThisMess <- ErrText[Index]
// IF ThisMess = "" THEN
// ThisMess <- "Error Text Missing"
// ENDIF
// OUTPUT ThisErr, " : ", ThisMess
// Count <- Count + 1
// ENDIF
// ENDIF
// Index <- Index + 1
// ENDWHILE
// OUTPUT Count, " error numbers output"
// ENDPROCEDURE`
// ;
const procedureCode = `\
WHILE Index < 501 AND "sussy PROCEDURE"
OUTPUT "sussy ", index
ENDWHILE`
;

if(process.argv.slice(2).includes("--debug"))
	procedureCode.split("\n").forEach(line => debugParse(line));
