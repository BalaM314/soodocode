import type { TokenType, Token } from "./lexer.js";
import { TokenMatcher, parseFunctionArguments } from "./parser.js";


export type StatementType =
	"declaration" | "assignment" | "output" | "input" | "return" |
	"if" | "if.end" |
	"for" | "for.end" |
	"while" | "while.end" |
	"dowhile" | "dowhile.end" |
	"function" | "function.end" |
	"procedure" | "procedure.end";
export type StatementCategory = "normal" | "block" | "block_end";

export const statements = {
	startKeyword: {} as Partial<Record<TokenType, typeof Statement>>,
	byType: {} as Record<StatementType, typeof Statement>,
	irregular: [] as (typeof Statement)[],
};

function statement<TClass extends typeof Statement>(type:StatementType, ...tokens:TokenMatcher[]):
	(input:TClass, context?:ClassDecoratorContext<TClass>) => TClass;
function statement<TClass extends typeof Statement>(type:StatementType, irregular:"#", ...tokens:TokenMatcher[]):
	(input:TClass, context?:ClassDecoratorContext<TClass>) => TClass;
function statement<TClass extends typeof Statement>(type:StatementType, category:"block" | "block_end", ...tokens:TokenMatcher[]):
	(input:TClass, context?:ClassDecoratorContext<TClass>) => TClass;
function statement<TClass extends typeof Statement>(type:StatementType, category:"block" | "block_end", endType:"auto", ...tokens:TokenMatcher[]):
	(input:TClass, context?:ClassDecoratorContext<TClass>) => TClass;

function statement<TClass extends typeof Statement>(type:StatementType, ...args:string[]){
	return function (input:TClass):TClass {
		input.type = type;
		if(args[0] == "block" || args[0] == "block_end"){
			input.category = args[0];
			args.shift();
		} else {
			input.category = "normal";
		}
		if(args[0] == "auto" && input.category == "block"){
			args.shift();
			statement(type + ".end" as StatementType, "block_end", args[0] + "_end" as TokenType)( //REFACTOR CHECK
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

function makeStatement(type:StatementType, ...tokens:TokenMatcher[]):typeof Statement;
function makeStatement(type:StatementType, irregular:"#", ...tokens:TokenMatcher[]):typeof Statement;
function makeStatement(type:StatementType, category:"block" | "block_end", ...tokens:TokenMatcher[]):typeof Statement;
function makeStatement(type:StatementType, category:"block" | "block_end", endType:"auto", ...tokens:TokenMatcher[]):typeof Statement;

function makeStatement(type:StatementType, ...args:any[]):typeof Statement {
	return statement(type, ...args)(class __temp extends Statement {});
}

export class Statement {
	type:typeof Statement;
	stype:StatementType;
	static type:StatementType;
	category: StatementCategory;
	static category: StatementCategory;
	static tokens:(TokenMatcher | "#")[] = null!;
	static check(input:Token[]):[message:string, priority:number] | true {
		for(let i = this.tokens[0] == "#" ? 1 : 0, j = 0; i < this.tokens.length; i ++){
			if(this.tokens[i] == ".+" || this.tokens[i] == ".*"){
				const allowEmpty = this.tokens[i] == ".*";
				if(j >= input.length && !allowEmpty) return [`Unexpected end of line`, 4];
				let anyTokensSkipped = false;
				while(this.tokens[i + 1] != input[j].type){
					j ++;
					if(j >= input.length) return [`Expected a ${this.tokens[i + 1]}, but none were found`, 4];
					anyTokensSkipped = true;
				}
				if(!anyTokensSkipped && !allowEmpty) return [`Expected one or more tokens, but found zero`, 6];
			} else {
				if(j >= input.length) return [`Unexpected end of line`, 4];
				if(this.tokens[i] == "#") throw new Error(`absurd`);
				else if(this.tokens[i] == input[j].type) j++; //Token matches, move to next one
				else return [`Expected a ${this.tokens[i]}, got "${input[j].text}" (${input[j].type})`, 5];
			}
		}
		return true;
	}
	constructor(public tokens:Token[]){
		//TODO allow holding expressionASTs
		this.type = this.constructor as typeof Statement;
		this.stype = this.type.type;
		this.category = this.type.category;
	}
	toString(){
		return this.tokens.map(t => t.text).join(" ");
	}
	blockEndStatement(){
		if(this.category != "block") throw new Error(`Statement ${this.stype} has no block end statement because it is not a block statement`);
		return statements.byType[this.stype + ".end" as StatementType]; //REFACTOR CHECK
	}
	example(){
		return `WIP example for statement ${this.stype}`;
		//TODO
	}
}

makeStatement("declaration", "keyword.declare", "name", "punctuation.colon", "name");
makeStatement("assignment", "#", "name", "operator.assignment", ".+");
makeStatement("output", "keyword.output", ".+");
makeStatement("input", "keyword.input", "name");
makeStatement("return", "keyword.return");


makeStatement("if", "block", "auto", "keyword.if", ".+", "keyword.then");
makeStatement("for", "block", "auto", "keyword.for", "name", "operator.assignment", "number.decimal", "keyword.to", "number.decimal"); //TODO fix endfor: should be `NEXT i`, not `NEXT` //TODO "number": accept names also
makeStatement("while", "block", "auto", "keyword.while", ".+");
makeStatement("dowhile", "block", "auto", "keyword.dowhile");

@statement("function", "block", "auto", "keyword.function", "name", "parentheses.open", ".*", "parentheses.close", "keyword.returns", "name")
export class FunctionStatement extends Statement {
	//FUNCTION Amogus ( amogus : type , sussy : type ) RETURNS BOOLEAN
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

@statement("procedure", "block", "auto", "keyword.procedure", "name", "parentheses.open", ".*", "parentheses.close")
export class ProcedureStatement extends Statement {
	//PROCEDURE Amogus ( amogus : type , sussy : type )
	/** Mapping between name and type */
	args: Map<string, string>;
	constructor(tokens:Token[]){
		super(tokens);
		const args = parseFunctionArguments(tokens, 3, tokens.length - 2);
		if(typeof args == "string") throw new Error(`Invalid function arguments: ${args}`);
		this.args = args;
	}
}

