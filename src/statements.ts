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
		input.tokens = args as TokenMatcher[];
		return input;
	}
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
				if(i == this.tokens.length - 1) return true; //Last token is a wildcard
				else {
					let anyTokensSkipped = false;
					while(this.tokens[i + 1] != input[j].type){
						j ++;
						anyTokensSkipped = true;
						if(j == input.length) return [`Expected a ${this.tokens[i + 1]}, but none were found`, 4];
					}
					if(!anyTokensSkipped && !allowEmpty) return [`Expected one or more tokens, but found zero`, 6];
				}
			} else if(this.tokens[i] == "#") throw new Error(`absurd`);
			else if(this.tokens[i] == input[j].type) j++; //Token matches, move to next one
			else return [`Expected a ${this.tokens[i]}, got "${input[j].text}" (${input[j].type})`, 5];
		}
		return true;
	}
	constructor(public tokens:Token[]){
		this.type = this.constructor as typeof Statement;
		this.stype = this.type.type;
		this.category = this.type.category;
	}
	toString(){
		return this.tokens.map(t => t.text).join(" ");
	}
}

@statement("declaration", "keyword.declare")
export class DeclarationStatement extends Statement {}
@statement("assignment", "#", "name", "operator.assignment", ".+")
export class AssignmentStatement extends Statement {}
@statement("output", "keyword.output", ".+")
export class OutputStatement extends Statement {}
@statement("input", "keyword.input", "name")
export class InputStatement extends Statement {}
@statement("return", "keyword.return")
export class ReturnStatement extends Statement {}


@statement("if", "block", "auto", "keyword.if", ".+", "keyword.then")
export class IfStatement extends Statement {}
@statement("for", "block", "auto", "keyword.for", "name", "operator.assignment", "number.decimal", "keyword.to", "number.decimal")
export class ForStatement extends Statement {} //TODO fix endfor: should be `NEXT i`, not `NEXT`
@statement("while", "block", "auto", "keyword.while", ".+")
export class WhileStatement extends Statement {}
@statement("dowhile", "block", "auto", "keyword.dowhile")
export class DoWhileStatement extends Statement {}

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
export class ProcedueStatement extends Statement {
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

