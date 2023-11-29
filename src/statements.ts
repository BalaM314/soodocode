import type { TokenType, Token } from "./lexer.js";
import { ExpressionAST, ProgramASTTreeNode, TokenMatcher, parseFunctionArguments } from "./parser.js";
import { displayExpression } from "./utils.js";


export type StatementType =
	"declaration" | "assignment" | "output" | "input" | "return" |
	"if" | "if.end" | "else" |
	"for" | "for.end" |
	"while" | "while.end" |
	"dowhile" | "dowhile.end" |
	"function" | "function.end" |
	"procedure" | "procedure.end";
export type StatementCategory = "normal" | "block" | "block_end" | "block_multi_split";

export const statements = {
	startKeyword: {} as Partial<Record<TokenType, typeof Statement>>,
	byType: {} as Record<StatementType, typeof Statement>,
	irregular: [] as (typeof Statement)[],
};

export class Statement {
	type:typeof Statement;
	stype:StatementType;
	static type:StatementType;
	category: StatementCategory;
	static category: StatementCategory;
	static example: string;
	static tokens:(TokenMatcher | "#")[] = null!;
	constructor(public tokens:(Token | ExpressionAST)[]){
		this.type = this.constructor as typeof Statement;
		this.stype = this.type.type;
		this.category = this.type.category;
	}
	toString(html = false){
		if(html){
			return this.tokens.map(t => "type" in t ? t.text : `<span class="expression-container">${displayExpression(t, false, true)}</span>`).join(" ");
		} else {
			return this.tokens.map(t => displayExpression(t, false)).join(" ");
		}
	}
	blockEndStatement(){
		if(this.category != "block") throw new Error(`Statement ${this.stype} has no block end statement because it is not a block statement`);
		return statements.byType[this.stype + ".end" as StatementType]; //REFACTOR CHECK
	}
	example(){
		return this.type.example;
	}
	/** Warning: block will not include the usual end statement. */
	static supportsSplit(block:ProgramASTTreeNode, statement:Statement):boolean {
		return false;
	}
}

function statement<TClass extends typeof Statement>(type:StatementType, example:string, ...tokens:TokenMatcher[]):
	(input:TClass, context?:ClassDecoratorContext<TClass>) => TClass;
function statement<TClass extends typeof Statement>(type:StatementType, example:string, irregular:"#", ...tokens:TokenMatcher[]):
	(input:TClass, context?:ClassDecoratorContext<TClass>) => TClass;
function statement<TClass extends typeof Statement>(type:StatementType, example:string, category:"block" | "block_end" | "block_multi_split", ...tokens:TokenMatcher[]):
	(input:TClass, context?:ClassDecoratorContext<TClass>) => TClass;
function statement<TClass extends typeof Statement>(type:StatementType, example:string, category:"block" | "block_end" | "block_multi_split", endType:"auto", ...tokens:TokenMatcher[]):
	(input:TClass, context?:ClassDecoratorContext<TClass>) => TClass;

function statement<TClass extends typeof Statement>(type:StatementType, example:string, ...args:string[]){
	return function (input:TClass):TClass {
		input.type = type;
		input.example = example;
		if(args[0] == "block" || args[0] == "block_end" || args[0] == "block_multi_split"){
			input.category = args[0];
			args.shift();
		} else {
			input.category = "normal";
		}
		if(args[0] == "auto" && input.category == "block"){
			args.shift();
			statement(type + ".end" as StatementType, "[unknown]", "block_end", args[0] + "_end" as TokenType)( //REFACTOR CHECK //TODO very bad, caused bugs
				class __endStatement extends Statement {}
			);
		}
		if(args.length < 1) throw new Error(`All statements must contain at least one token`);
		if(args[0] == "#"){
			statements.irregular.push(input);
		} else {
			const firstToken = args[0] as TokenType;
			if(statements.startKeyword[firstToken])
				throw new Error(`Statement starting with ${firstToken} already registered`); //TODO overloads, eg FOR STEP
			statements.startKeyword[firstToken] = input;
		}
		if(statements.byType[type]) throw new Error(`Statement for type ${type} already registered`);
		statements.byType[type] = input;
		input.tokens = args as TokenMatcher[];
		return input;
	}
}

function makeStatement(type:StatementType, example:string, ...tokens:TokenMatcher[]):typeof Statement;
function makeStatement(type:StatementType, example:string, irregular:"#", ...tokens:TokenMatcher[]):typeof Statement;
function makeStatement(type:StatementType, example:string, category:"block" | "block_end" | "block_multi_split", ...tokens:TokenMatcher[]):typeof Statement;
function makeStatement(type:StatementType, example:string, category:"block" | "block_end" | "block_multi_split", endType:"auto", ...tokens:TokenMatcher[]):typeof Statement;

function makeStatement(type:StatementType, example:string, ...args:any[]):typeof Statement {
	return statement(type, example, ...args)(class __temp extends Statement {});
}

makeStatement("declaration", "DECLARE variable: TYPE", "keyword.declare", "name", "punctuation.colon", "name");
makeStatement("assignment", "x <- 5", "#", "name", "operator.assignment", "expr+");
makeStatement("output", `OUTPUT "message"`, "keyword.output", ".+");
makeStatement("input", "INPUT y", "keyword.input", "name");
makeStatement("return", "RETURN z + 5", "keyword.return", "expr+");


@statement("if", "IF a < 5 THEN", "block", "auto", "keyword.if", "expr+", "keyword.then")
export class IfStatement extends Statement {
	/** Warning: block will not include the usual end statement. */
	static supportsSplit(block:ProgramASTTreeNode, statement:Statement):boolean {
		return block.type == "if" && statement.stype == "else" && block.nodeGroups[0].length > 0;
		//If the current block is an if statement, the splitting statement is "else", and there is at least one statement in the first block
	}
}
makeStatement("else", "ELSE", "block_multi_split", "keyword.else");
makeStatement("for", "FOR i <- 1 TO 10", "block", "keyword.for", "name", "operator.assignment", "number.decimal", "keyword.to", "number.decimal"); //TODO "number": accept names also
makeStatement("for.end", "NEXT i", "block_end", "keyword.for_end", "name");
makeStatement("while", "WHILE c < 20", "block", "auto", "keyword.while", "expr+");
makeStatement("dowhile", "REPEAT", "block", "keyword.dowhile");
makeStatement("dowhile.end", "UNTIL flag = false", "block_end", "keyword.dowhile_end", "expr+");

@statement("function", "FUNCTION name(arg1: TYPE) RETURNS INTEGER", "block", "auto", "keyword.function", "name", "parentheses.open", ".*", "parentheses.close", "keyword.returns", "name")
export class FunctionStatement extends Statement {
	/** Mapping between name and type */
	args: Map<string, string>;
	returnType: string;
	constructor(tokens:Token[]){
		super(tokens);
		const args = parseFunctionArguments(tokens, 3, tokens.length - 4);
		if(typeof args == "string") throw new Error(`Invalid function arguments: ${args}`);
		this.args = args;
		this.returnType = tokens.at(-1)!.text.toUpperCase();
	}
}

@statement("procedure", "PROCEDURE name(arg1: TYPE)", "block", "auto", "keyword.procedure", "name", "parentheses.open", ".*", "parentheses.close")
export class ProcedureStatement extends Statement {
	/** Mapping between name and type */
	args: Map<string, string>;
	constructor(tokens:Token[]){
		super(tokens);
		const args = parseFunctionArguments(tokens, 3, tokens.length - 2);
		if(typeof args == "string") throw new Error(`Invalid function arguments: ${args}`);
		this.args = args;
	}
}

