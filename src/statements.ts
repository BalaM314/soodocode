import type { FunctionData, Runtime, VariableType, VariableValueType } from "./runtime.js";
import type { TokenType, Token } from "./lexer.js";
import { ExpressionAST, ExpressionASTTreeNode, ProgramASTTreeNode, TokenMatcher, parseExpression, parseFunctionArguments } from "./parser.js";
import { displayExpression, fail, crash, escapeHTML, splitArray } from "./utils.js";


export type StatementType =
	"declaration" | "constant" | "assignment" | "output" | "input" | "return" | "call" |
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
	run(runtime:Runtime):void | {
		type: "function_return";
		value: VariableValueType;
	} {
		crash(`Missing runtime implementation for statement ${this.stype}`);
	}
	runBlock(runtime:Runtime, node:ProgramASTTreeNode):void {
		if(this.category == "block")
			crash(`Missing runtime implementation for block statement ${this.stype}`);
		else
			crash(`Cannot run statement ${this.stype} as a block, because it is not a block statement`);
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
			if(runtime.getVariable(variable)) fail(`Variable ${variable} was already declared`);
			runtime.getCurrentScope().variables[variable] = {
				type: this.varType as VariableType, //todo user defined types
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
		if(runtime.getVariable(this.name)) fail(`Constant ${this.name} was already declared`);
		runtime.getCurrentScope().variables[this.name] = {
			type: "INTEGER", //TODO guess type required
			value: runtime.evaluateExpr(this.expr, "INTEGER")[1], //TODO static context? forbid use of variables or function calls? is CONSTANT actually a macro???
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
		const variable = runtime.getVariable(this.name);
		if(!variable) fail(`Undeclared variable ${this.name}`);
		if(!variable.mutable) fail(`Cannot assign to constant ${this.name}`);
		variable.value = runtime.evaluateExpr(this.expr, variable.type)[1];
	}
}
@statement("output", `OUTPUT "message"`, "keyword.output", ".+")
export class OutputStatement extends Statement {
	outMessage: (Token | ExpressionAST)[];
	constructor(tokens:Token[]){
		super(tokens);
		//TODO remove duplicated code, this is copied in parseExpression()
		let parenNestLevel = 0, bracketNestLevel = 0;
		this.outMessage = (
			//Split the tokens between the parens on commas
			splitArray(tokens.slice(1), t => {
				if(t.type == "parentheses.open") parenNestLevel ++;
				else if(t.type == "parentheses.close") parenNestLevel --;
				else if(t.type == "bracket.open") bracketNestLevel ++;
				else if(t.type == "bracket.close") bracketNestLevel --;
				return parenNestLevel == 0 && bracketNestLevel == 0 && t.type == "punctuation.comma";
			})
		).map(parseExpression);
	}
	run(runtime:Runtime){
		let outStr = "";
		for(const token of this.outMessage){
			const expr = runtime.evaluateExpr(token, "STRING")[1];
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
		const variable = runtime.getVariable(this.name);
		if(!variable) fail(`Undeclared variable ${this.name}`);
		if(!variable.mutable) fail(`Cannot INPUT ${this.name} because it is a constant`);
		const input = runtime._input(); //TODO allow specifying the type, and make the _input() function handle coercion and invalid input
		switch(variable.type){
			case "BOOLEAN":
				variable.value = input.toLowerCase() != "false"; break;
			case "INTEGER": {
				const value = Number(input);
				if(isNaN(value)) fail(`input was an invalid number`)
				if(!Number.isSafeInteger(value)) fail(`input was an invalid integer`)
				variable.value = value;
				break; }
			case "REAL": {
				const value = Number(input);
				if(isNaN(value)) fail(`input was an invalid number`)
				if(!Number.isSafeInteger(value)) fail(`input was an invalid integer`)
				variable.value = value;
				break; }
			case "STRING":
				variable.value = input;
				break;
			case "CHAR":
				if(input.length == 1) variable.value = input;
				else fail(`input was not a valid character: contained more than one character`);
			default:
				fail(`Cannot INPUT variable of type ${variable.type}`);
		}
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
		const fn = runtime.getCurrentFunction();
		if(!fn) fail(`RETURN is only valid within a function.`);
		const statement = fn.controlStatements[0];
		if(statement instanceof ProcedureStatement) fail(`Procedures cannot return a value.`);
		return {
			type: "function_return" as const,
			value: runtime.evaluateExpr(this.expr, statement.returnType as VariableType)[1]
		};
	}
}
@statement("call", "CALL Func(5)", "keyword.call", "expr+")
export class CallStatement extends Statement {
	func:ExpressionASTTreeNode;
	constructor(tokens:(Token | ExpressionAST)[]){
		super(tokens);
		if("operator" in tokens[1] && tokens[1].operator == "function call"){
			this.func = tokens[1];
		} else crash(`CALL can only be used to call functions or procedures`);
	}
	run(runtime:Runtime){
		const name = this.func.operatorToken.text;
		const func = runtime.functions[name];
		if(!func) fail(`Function ${name} is not defined.`);
		runtime.callFunction(func, this.func.nodes);
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
	runBlock(runtime:Runtime, node:ProgramASTTreeNode){
		if(runtime.evaluateExpr(this.condition, "BOOLEAN")[1]){
			runtime.runBlock(node.nodeGroups[0]);
		} else if(node.controlStatements[1] instanceof ElseStatement && node.nodeGroups[1]){
			runtime.runBlock(node.nodeGroups[1]);
		}
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
	runBlock(runtime:Runtime, node:ProgramASTTreeNode){
		const lower = runtime.evaluateExpr(this.lowerBound, "INTEGER")[1];
		const upper = runtime.evaluateExpr(this.upperBound, "INTEGER")[1];
		if(upper < lower) return;
		const end = (node.controlStatements[1] as ForEndStatement);
		if(end.name !== this.name) fail(`Incorrect NEXT statement: expected variable "${this.name}" from for loop, got variable "${end.name}"`);
		for(let i = lower; i <= upper; i++){
			runtime.runBlock(node.nodeGroups[0], {
				statement: this,
				variables: {
					//Set the loop variable in the loop scope
					[this.name]: {
						declaration: this,
						mutable: false,
						type: "INTEGER",
						value: i
					}
				}
			});
		}
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
	runBlock(runtime:Runtime, node:ProgramASTTreeNode){
		while(runtime.evaluateExpr(this.condition, "BOOLEAN")[1]){
			runtime.runBlock(node.nodeGroups[0], {
				statement: this,
				variables: {}
			});
		}
	}
}
@statement("dowhile", "REPEAT", "block", "keyword.dowhile")
export class DoWhileStatement extends Statement {
	//TODO! impl runBlock here
}
@statement("dowhile.end", "UNTIL flag = false", "block_end", "keyword.dowhile_end", "expr+")
export class DoWhileEndStatement extends Statement {
	condition:ExpressionAST;
	constructor(tokens:(Token | ExpressionAST)[]){
		super(tokens);
		this.condition = tokens[1];
	}
	runBlock(runtime:Runtime, node:ProgramASTTreeNode){
		do {
			runtime.runBlock(node.nodeGroups[0], {
				statement: this,
				variables: {}
			});
			//TODO prevent infinite loops
		} while(!runtime.evaluateExpr(this.condition, "BOOLEAN")[1]); //Inverted, the statement is "until"
	}
}

@statement("function", "FUNCTION name(arg1: TYPE) RETURNS INTEGER", "block", "auto", "keyword.function", "name", "parentheses.open", ".*", "parentheses.close", "keyword.returns", "name")
export class FunctionStatement extends Statement {
	/** Mapping between name and type */
	args:FunctionArguments;
	returnType:string;
	name:string;
	constructor(tokens:Token[]){
		super(tokens);
		const args = parseFunctionArguments(tokens.slice(3, -3));
		if(typeof args == "string") fail(`Invalid function arguments: ${args}`);
		this.args = args;
		this.returnType = tokens.at(-1)!.text.toUpperCase();
		this.name = tokens[1].text;
	}
	runBlock(runtime:Runtime, node:FunctionData){
		//Don't actually run the block
		runtime.functions[this.name] = node;
	}
}

@statement("procedure", "PROCEDURE name(arg1: TYPE)", "block", "auto", "keyword.procedure", "name", "parentheses.open", ".*", "parentheses.close")
export class ProcedureStatement extends Statement {
	/** Mapping between name and type */
	args:FunctionArguments;
	name:string;
	constructor(tokens:Token[]){
		super(tokens);
		const args = parseFunctionArguments(tokens.slice(3, -1));
		if(typeof args == "string") fail(`Invalid function arguments: ${args}`);
		this.args = args;
		this.name = tokens[1].text;
	}
	runBlock(runtime:Runtime, node:FunctionData){
		//Don't actually run the block
		runtime.functions[this.name] = node;
	}
}

