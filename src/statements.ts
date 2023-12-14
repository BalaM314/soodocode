import type { Runtime, VariableType } from "./runtime.js";
import type { TokenType, Token } from "./lexer.js";
import { ExpressionAST, ProgramASTTreeNode, TokenMatcher, parseFunctionArguments } from "./parser.js";
import { displayExpression, fail, crash, escapeHTML } from "./utils.js";


export type StatementType =
	"declaration" | "constant" | "assignment" | "output" | "input" | "return" |
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

export type FunctionArguments = Map<string, {type:string, passMode:"value" | "reference"}>

export class Statement {
	type:typeof Statement;
	stype:StatementType;
	static type:StatementType;
	category:StatementCategory;
	static category:StatementCategory;
	static example:string;
	static tokens:(TokenMatcher | "#")[] = null!;
	constructor(public tokens:(Token | ExpressionAST)[]){
		this.type = this.constructor as typeof Statement;
		this.stype = this.type.type;
		this.category = this.type.category;
	}
	toString(html = false){
		if(html){
			return this.tokens.map(t => "type" in t ? escapeHTML(t.text) : `<span class="expression-container">${displayExpression(t, false, true)}</span>`).join(" ");
		} else {
			return this.tokens.map(t => displayExpression(t, false)).join(" ");
		}
	}
	blockEndStatement(){
		if(this.category != "block") crash(`Statement ${this.stype} has no block end statement because it is not a block statement`);
		return statements.byType[this.stype + ".end" as StatementType]; //REFACTOR CHECK
	}
	example(){
		return this.type.example;
	}
	/** Warning: block will not include the usual end statement. */
	static supportsSplit(block:ProgramASTTreeNode, statement:Statement):boolean {
		return false;
	}
	run(runtime:Runtime):void {}
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
		//validate args
		if(args.length < 1) crash(`Invalid statement definitions! All statements must contain at least one token`);
		if(args.find((v, i, args) =>
			(v == "expr+" || v == ".+" || v == ".*") &&
			(args[i+1] == "expr+" || args[i+1] == ".+" || args[i+1] == ".*")
		)) crash(`Invalid statement definitions! Variadic fragment specifiers cannot be adjacent.`);
		if(args[0] == "#"){
			statements.irregular.push(input);
		} else {
			const firstToken = args[0] as TokenType;
			if(statements.startKeyword[firstToken])
				crash(`Invalid statement definitions! Statement starting with ${firstToken} already registered`); //TODO overloads, eg FOR STEP
			statements.startKeyword[firstToken] = input;
		}
		if(statements.byType[type]) crash(`Invalid statement definitions! Statement for type ${type} already registered`);
		statements.byType[type] = input;
		input.tokens = args as TokenMatcher[];
		return input;
	}
}

@statement("declaration", "DECLARE variable: TYPE", "keyword.declare", ".+", "punctuation.colon", "name")
export class DeclarationStatement extends Statement {
	variables:string[] = [];
	varType:string;
	constructor(tokens:Token[]){
		super(tokens);
		let expected = "name" as "name" | "comma";
		for(const token of tokens.slice(1, -2)){
			if(expected == "name"){
				if(token.type == "name"){
					this.variables.push(token.text);
					expected = "comma"
				} else fail(`Expected name, got "${token.text}" (${token.type})`);
			} else {
				if(token.type == "punctuation.comma") expected = "name";
				else fail(`Expected name, got "${token.text}" (${token.type})`);
			}
		}
		if(expected == "name") fail(`Expected name, found ":" (punctuation.colon)`);
		this.varType = tokens.at(-1)!.text;
	}
	run(runtime:Runtime){
		for(const variable of this.variables){
			if(variable in runtime.variables) fail(`Variable ${variable} was already declared`);
			runtime.variables[variable] = {
				type: this.varType as VariableType,
				value: null,
				declaration: this,
				mutable: true,
			};
		}
	}
}
@statement("constant", "CONSTANT x = 1.5", "keyword.constant", "name", "operator.equal_to", "expr+") //the equal_to operator is used in this statement, idk why
export class ConstantStatement extends Statement {
	name: string;
	expr: ExpressionAST;
	constructor(tokens:(Token | ExpressionAST)[]){
		super(tokens);
		let [constant, name, equals, expr] = tokens as [Token, Token, Token, ExpressionAST];
		this.name = name.text;
		this.expr = expr;
	}
	run(runtime:Runtime){
		if(this.name in runtime.variables) fail(`Constant ${this.name} was already declared`);
		runtime.variables[this.name] = {
			type: "INTEGER",
			value: runtime.evaluateExpr(this.expr),
			declaration: this,
			mutable: false,
		};
	}
}
@statement("assignment", "x <- 5", "#", "name", "operator.assignment", "expr+")
export class AssignmentStatement extends Statement {
	name: string;
	expr: ExpressionAST;
	constructor(tokens:(Token | ExpressionAST)[]){
		super(tokens);
		let [name, assign, expr] = tokens as [Token, Token, ExpressionAST];
		this.name = name.text;
		this.expr = expr;
	}
	run(runtime:Runtime){
		if(!(this.name in runtime.variables)) fail(`Undeclared variable ${this.name}`);
		runtime.variables[this.name].value = runtime.evaluateExpr(this.expr); //TODO typecheck
	}
}
@statement("output", `OUTPUT "message"`, "keyword.output", ".+")
export class OutputStatement extends Statement {
	outMessage: (Token | ExpressionAST)[];
	constructor(tokens:(Token | ExpressionAST)[]){
		super(tokens);
		this.outMessage = tokens.slice(1);
		//TODO:
		//validate, must be (string | name | number)s separated by ,
		//should not include the commas
	}
	run(runtime:Runtime){
		let outStr = "";
		for(const token of this.outMessage){
			const expr = runtime.evaluateExpr(token);
			outStr += expr;
		}
		runtime._output(outStr);
	}
}
@statement("input", "INPUT y", "keyword.input", "name")
export class InputStatement extends Statement {
	name:string;
	constructor(tokens:(Token | ExpressionAST)[]){
		super(tokens);
		this.name = (tokens[1] as Token).text;
	}
	run(runtime:Runtime){
		if(!(this.name in runtime.variables)) fail(`Undeclared variable ${this.name}`);
		runtime.variables[this.name].value = runtime._input(); //TODO type coerce
	}
}
@statement("return", "RETURN z + 5", "keyword.return", "expr+")
export class ReturnStatement extends Statement {
	expr:ExpressionAST;
	constructor(tokens:(Token | ExpressionAST)[]){
		super(tokens);
		this.expr = tokens[1];
	}
	run(runtime:Runtime){
		crash(`TODO Not yet implemented`);
	}
}


@statement("if", "IF a < 5 THEN", "block", "auto", "keyword.if", "expr+", "keyword.then")
export class IfStatement extends Statement {
	condition:ExpressionAST;
	constructor(tokens:(Token | ExpressionAST)[]){
		super(tokens);
		this.condition = tokens[1];
	}
	/** Warning: block will not include the usual end statement. */
	static supportsSplit(block:ProgramASTTreeNode, statement:Statement):boolean {
		return block.type == "if" && statement.stype == "else" && block.nodeGroups[0].length > 0;
		//If the current block is an if statement, the splitting statement is "else", and there is at least one statement in the first block
	}
}
@statement("else", "ELSE", "block_multi_split", "keyword.else")
export class ElseStatement extends Statement {}
@statement("for", "FOR i <- 1 TO 10", "block", "keyword.for", "name", "operator.assignment", "number.decimal", "keyword.to", "number.decimal") //TODO "number": accept names also
export class ForStatement extends Statement {
	name:string;
	lowerBound:ExpressionAST;
	upperBound:ExpressionAST;
	constructor(tokens:(Token | ExpressionAST)[]){
		super(tokens);
		this.name = (tokens[1] as Token).text;
		this.lowerBound = tokens[3];
		this.upperBound = tokens[5];
	}
}
@statement("for.end", "NEXT i", "block_end", "keyword.for_end", "name")
export class ForEndStatement extends Statement {
	name:string;
	constructor(tokens:(Token | ExpressionAST)[]){
		super(tokens);
		this.name = (tokens[1] as Token).text;
	}
}
@statement("while", "WHILE c < 20", "block", "auto", "keyword.while", "expr+")
export class WhileStatement extends Statement {
	condition:ExpressionAST;
	constructor(tokens:(Token | ExpressionAST)[]){
		super(tokens);
		this.condition = tokens[1];
	}	
}
@statement("dowhile", "REPEAT", "block", "keyword.dowhile")
export class DoWhileStatement extends Statement {}
@statement("dowhile.end", "UNTIL flag = false", "block_end", "keyword.dowhile_end", "expr+")
export class DoWhileEndStatement extends Statement {
	condition:ExpressionAST;
	constructor(tokens:(Token | ExpressionAST)[]){
		super(tokens);
		this.condition = tokens[1];
	}
}

@statement("function", "FUNCTION name(arg1: TYPE) RETURNS INTEGER", "block", "auto", "keyword.function", "name", "parentheses.open", ".*", "parentheses.close", "keyword.returns", "name")
export class FunctionStatement extends Statement {
	/** Mapping between name and type */
	args:FunctionArguments;
	returnType: string;
	constructor(tokens:Token[]){
		super(tokens);
		const args = parseFunctionArguments(tokens.slice(3, -3));
		if(typeof args == "string") fail(`Invalid function arguments: ${args}`);
		this.args = args;
		this.returnType = tokens.at(-1)!.text.toUpperCase();
	}
}

@statement("procedure", "PROCEDURE name(arg1: TYPE)", "block", "auto", "keyword.procedure", "name", "parentheses.open", ".*", "parentheses.close")
export class ProcedureStatement extends Statement {
	/** Mapping between name and type */
	args:FunctionArguments;
	constructor(tokens:Token[]){
		super(tokens);
		const args = parseFunctionArguments(tokens.slice(3, -1));
		if(typeof args == "string") fail(`Invalid function arguments: ${args}`);
		this.args = args;
	}
}

