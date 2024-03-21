/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the definitions for every statement type supported by Soodocode.
*/


import { FunctionData, Runtime, VariableType, VariableValueType } from "./runtime.js";
import { TokenType, Token, TextRange, TextRanged } from "./lexer-types.js";
import {
	ArrayTypeData, ExpressionAST, ExpressionASTArrayTypeNode, ExpressionASTBranchNode,
	ExpressionASTTypeNode, ProgramASTBranchNode, TokenMatcher
} from "./parser-types.js";
import { parseExpression, parseFunctionArguments, processTypeData } from "./parser.js";
import {
	displayExpression, fail, crash, escapeHTML, isVarType, splitTokensOnComma, getTotalRange,
	SoodocodeError
} from "./utils.js";
import { builtinFunctions } from "./builtin_functions.js";


export type StatementType =
	| "declaration" | "constant" | "assignment" | "output" | "input" | "return" | "call"
	| "if" | "if.end" | "else"
	| "switch" | "switch.end" | "case"
	| "for" | "for.end"
	| "while" | "while.end"
	| "dowhile" | "dowhile.end"
	| "function" | "function.end"
	| "procedure" | "procedure.end";
export type StatementCategory = "normal" | "block" | "block_end" | "block_multi_split";

export const statements = {
	byStartKeyword: {} as Partial<Record<TokenType, (typeof Statement)[]>>,
	byType: {} as Record<StatementType, typeof Statement>,
	irregular: [] as (typeof Statement)[],
};

export type PassMode = "value" | "reference";
export type FunctionArguments = Map<string, {type:VariableType, passMode:PassMode}>
export type FunctionArgumentData = [name:string, {type:VariableType, passMode:PassMode}];
export type FunctionArgumentDataPartial = [nameToken:Token, {type:VariableType | null, passMode:PassMode | null}];

export type StatementExecutionResult = {
	type: "function_return";
	value: VariableValueType;
};

export class Statement implements TextRanged {
	type:typeof Statement;
	stype:StatementType;
	static type:StatementType;
	category:StatementCategory;
	static category:StatementCategory;
	static example:string;
	static tokens:(TokenMatcher | "#")[] = null!; //Assigned in the decorator
	range: TextRange;
	constructor(public tokens:(Token | ExpressionAST | ExpressionASTArrayTypeNode)[]){
		this.type = this.constructor as typeof Statement;
		this.stype = this.type.type;
		this.category = this.type.category;
		this.range = getTotalRange(tokens.map(t =>
			t instanceof Token ? t :
			[0, 0] //TODO all the expression ast nodes need to store a range
		));
	}
	toString(html = false){
		if(html){
			return this.tokens.map(t => t instanceof Token ? escapeHTML(t.text) : `<span class="expression-container">${displayExpression(t, false, true)}</span>`).join(" ");
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
	static supportsSplit(block:ProgramASTBranchNode, statement:Statement):boolean {
		return false;
	}
	run(runtime:Runtime):void | StatementExecutionResult {
		crash(`Missing runtime implementation for statement ${this.stype}`);
	}
	runBlock(runtime:Runtime, node:ProgramASTBranchNode):void | StatementExecutionResult {
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
function statement<TClass extends typeof Statement>(type:StatementType, example:string, category:"block" | "block_end" | "block_multi_split", irregular:"#", ...tokens:TokenMatcher[]):
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
			(args[i+1] == "expr+" || args[i+1] == ".+" || args[i+1] == ".*" || args[i+1] == "type+")
		)) crash(`Invalid statement definitions! Variadic fragment specifiers cannot be adjacent.`);
		if(args[0] == "#"){
			statements.irregular.push(input);
		} else {
			const firstToken = args[0] as TokenType;
			(statements.byStartKeyword[firstToken] ??= []).push(input);
		}
		if(statements.byType[type]) crash(`Invalid statement definitions! Statement for type ${type} already registered`);
		statements.byType[type] = input;
		input.tokens = args as TokenMatcher[];
		return input;
	}
}

@statement("declaration", "DECLARE variable: TYPE", "keyword.declare", ".+", "punctuation.colon", "type+")
export class DeclarationStatement extends Statement {
	variables:string[] = [];
	varType:VariableType;
	constructor(tokens:[Token, ...names:Token[], Token, ExpressionASTTypeNode]){
		super(tokens);

		//parse the variable list
		let expected:"name" | "commaOrColon" = "name";
		for(const token of tokens.slice(1, -2)){
			if(expected == "name"){
				if(token.type == "name"){
					this.variables.push(token.text);
					expected = "commaOrColon";
				} else fail(`Expected name, got ${token}`);
			} else {
				if(token.type == "punctuation.comma") expected = "name";
				else fail(`Expected comma, got ${token}`);
			}
		}
		if(expected == "name") fail(`Expected name, found ${tokens.at(-2)}`);

		this.varType = processTypeData(tokens.at(-1)!);
	}
	run(runtime:Runtime){
		for(const variable of this.variables){
			if(runtime.getVariable(variable)) fail(`Variable ${variable} was already declared`);
			runtime.getCurrentScope().variables[variable] = {
				type: this.varType, //todo user defined types
				value: this.varType instanceof ArrayTypeData ? Array(this.varType.totalLength).fill(null) : null,
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
	constructor(tokens:[Token, Token, Token, ExpressionAST]){
		super(tokens);
		let [constant, name, equals, expr] = tokens;
		this.name = name.text;
		this.expr = expr;
	}
	run(runtime:Runtime){
		if(runtime.getVariable(this.name)) fail(`Constant ${this.name} was already declared`);
		const [type, value] = runtime.evaluateExpr(this.expr); //TODO static context? forbid use of variables or function calls? is CONSTANT actually a macro???
		runtime.getCurrentScope().variables[this.name] = {
			type,
			value,
			declaration: this,
			mutable: false,
		};
	}
}
@statement("assignment", "x <- 5", "#", "expr+", "operator.assignment", "expr+")
export class AssignmentStatement extends Statement {
	/** Can be a normal variable name, like [name x], or an array access expression */
	name: ExpressionAST;
	expr: ExpressionAST;
	constructor(tokens:[ExpressionAST, Token, ExpressionAST]){
		super(tokens);
		[this.name, , this.expr] = tokens;
		if("operator" in this.name){
			if(this.name.operator != "array access") fail(`Expression ${displayExpression(this.name)} cannot be assigned to`);
		}
	}
	run(runtime:Runtime){
		if("operator" in this.name){
			runtime.processArrayAccess(this.name, "set", this.expr);
		} else {
			const variable = runtime.getVariable(this.name.text);
			if(!variable) fail(`Undeclared variable ${this.name.text}`);
			if(!variable.mutable) fail(`Cannot assign to constant ${this.name.text}`);
			variable.value = runtime.evaluateExpr(this.expr, variable.type)[1];
		}
	}
}
@statement("output", `OUTPUT "message"`, "keyword.output", ".+")
export class OutputStatement extends Statement {
	outMessage: (Token | ExpressionAST)[];
	constructor(tokens:Token[]){
		super(tokens);
		this.outMessage = splitTokensOnComma(tokens.slice(1)).map(parseExpression);
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
	constructor(tokens:[Token, Token]){
		super(tokens);
		this.name = tokens[1].text;
	}
	run(runtime:Runtime){
		const variable = runtime.getVariable(this.name);
		if(!variable) fail(`Undeclared variable ${this.name}`);
		if(!variable.mutable) fail(`Cannot INPUT ${this.name} because it is a constant`);
		const input = runtime._input(`Enter the value for variable ${this.name} (type: ${variable.type})`);
		switch(variable.type){
			case "BOOLEAN":
				variable.value = input.toLowerCase() != "false"; break;
			case "INTEGER": {
				const value = Number(input);
				if(isNaN(value)) fail(`input was an invalid number`);
				if(!Number.isSafeInteger(value)) fail(`input was an invalid integer`);
				variable.value = value;
				break; }
			case "REAL": {
				const value = Number(input);
				if(isNaN(value)) fail(`input was an invalid number`);
				if(!Number.isSafeInteger(value)) fail(`input was an invalid integer`);
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
	constructor(tokens:[Token, ExpressionAST]){
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
			value: runtime.evaluateExpr(this.expr, statement.returnType)[1]
		};
	}
}
@statement("call", "CALL Func(5)", "keyword.call", "expr+")
export class CallStatement extends Statement {
	func:ExpressionASTBranchNode;
	constructor(tokens:[Token, ExpressionAST]){
		super(tokens);
		if(!(tokens[1] instanceof Token) && tokens[1].operator == "function call"){
			this.func = tokens[1];
		} else crash(`CALL can only be used to call functions or procedures`);
	}
	run(runtime:Runtime){
		const name = this.func.operatorToken.text;
		const func = runtime.getFunction(name);
		if("name" in func) fail(`CALL cannot be used on builtin functions, because they have no side effects`);
		runtime.callFunction(func, this.func.nodes);
	}
}


@statement("if", "IF a < 5 THEN", "block", "auto", "keyword.if", "expr+", "keyword.then")
export class IfStatement extends Statement {
	condition:ExpressionAST;
	constructor(tokens:[Token, ExpressionAST, Token]){
		super(tokens);
		this.condition = tokens[1];
	}
	/** Warning: block will not include the usual end statement. */
	static supportsSplit(block:ProgramASTBranchNode, statement:Statement):boolean {
		return block.type == "if" && statement.stype == "else" && block.nodeGroups[0].length > 0;
		//If the current block is an if statement, the splitting statement is "else", and there is at least one statement in the first block
	}
	runBlock(runtime:Runtime, node:ProgramASTBranchNode){
		if(runtime.evaluateExpr(this.condition, "BOOLEAN")[1]){
			return runtime.runBlock(node.nodeGroups[0]);
		} else if(node.controlStatements[1] instanceof ElseStatement && node.nodeGroups[1]){
			return runtime.runBlock(node.nodeGroups[1]);
		}
	}
}
@statement("else", "ELSE", "block_multi_split", "keyword.else")
export class ElseStatement extends Statement {}
@statement("switch", "CASE OF x", "block", "keyword.case", "keyword.of", "expr+")
export class SwitchStatement extends Statement {
	//First node group is blank, because a blank node group is created and then the block is split by the first case branch
	expression:ExpressionAST;
	constructor(tokens:[Token, Token, ExpressionAST]){
		super(tokens);
		[,, this.expression] = tokens;
	}
	static supportsSplit(block:ProgramASTBranchNode, statement:Statement):boolean { //TODO allow error messages
		return block.type == "switch" && statement.stype == "case" && (block.nodeGroups.at(-1)!.length > 0 || block.nodeGroups.length == 1);
	}
	runBlock(runtime:Runtime, {controlStatements, nodeGroups}:ProgramASTBranchNode):void | StatementExecutionResult {
		const [switchType, switchValue] = runtime.evaluateExpr(this.expression);
		if(nodeGroups[0].length > 0) fail(`Statements are not allowed before the first case branch`, nodeGroups[0]); //TODO this is a syntax error and should error at parse
		for(let i = 1; i < controlStatements.length; i ++){
			//skip the first one as that is the switch statement
			if(controlStatements[i] instanceof SwitchEndStatement) break; //end of statements
			else if(controlStatements[i] instanceof CaseBranchStatement){
				const caseToken = (controlStatements[i] as CaseBranchStatement).value;
				//Ensure that OTHERWISE is the last branch
				if(caseToken.type == "keyword.otherwise" && i != controlStatements.length - 2)
					fail(`OTHERWISE case branch must be the last case branch`, controlStatements[i]);

				if((function branchMatches(){
					if(caseToken.type == "keyword.otherwise") return true;
					try {
						//Try to evaluate the case token with the same type as the switch target
						const [caseType, caseValue] = Runtime.evaluateToken(caseToken, switchType);
						return switchValue == caseValue;
					} catch(err){
						if(err instanceof SoodocodeError){
							//type error (TODO make sure it is actually a type error)
							//try again leaving the type blank, this will probably evaluate to false and it will try the next branch
							const [caseType, caseValue] = Runtime.evaluateToken(caseToken);
							return switchType == caseType && switchValue == caseValue;
						} else throw err;
					}
				})()){
					runtime.runBlock(nodeGroups[i] ?? crash(`Missing node group in switch block`));
					break;
				}
			} else {
				console.error(controlStatements, nodeGroups);
				crash(`Invalid set of control statements for switch block`);
			}
		}
	}
}
@statement("switch.end", "ENDCASE", "block_end", "keyword.case_end")
export class SwitchEndStatement extends Statement {}
@statement("case", "5: ", "block_multi_split", "#", ".", "punctuation.colon")
export class CaseBranchStatement extends Statement {
	value:Token;
	constructor(tokens:[Token, Token]){
		super(tokens);
		[this.value] = tokens;
		if(this.value.type != "keyword.otherwise")
			Runtime.evaluateToken(this.value); //make sure the value can be evaluated statically TODO check error message
	}
}
@statement("for", "FOR i <- 1 TO 10", "block", "keyword.for", "name", "operator.assignment", "expr+", "keyword.to", "expr+")
export class ForStatement extends Statement {
	name:string;
	lowerBound:ExpressionAST;
	upperBound:ExpressionAST;
	constructor(tokens:[Token, Token, Token, ExpressionAST, Token, ExpressionAST]){
		super(tokens);
		this.name = tokens[1].text;
		this.lowerBound = tokens[3];
		this.upperBound = tokens[5];
	}
	runBlock(runtime:Runtime, node:ProgramASTBranchNode){
		const lower = runtime.evaluateExpr(this.lowerBound, "INTEGER")[1];
		const upper = runtime.evaluateExpr(this.upperBound, "INTEGER")[1];
		if(upper < lower) return;
		const end = node.controlStatements[1] as ForEndStatement;
		if(end.name !== this.name) fail(`Incorrect NEXT statement: expected variable "${this.name}" from for loop, got variable "${end.name}"`);
		for(let i = lower; i <= upper; i++){
			const result = runtime.runBlock(node.nodeGroups[0], {
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
			if(result) return result;
		}
	}
}
@statement("for.end", "NEXT i", "block_end", "keyword.for_end", "name")
export class ForEndStatement extends Statement {
	name:string;
	constructor(tokens:[Token, Token]){
		super(tokens);
		this.name = tokens[1].text;
	}
}
@statement("while", "WHILE c < 20", "block", "auto", "keyword.while", "expr+")
export class WhileStatement extends Statement {
	condition:ExpressionAST;
	constructor(tokens:[Token, ExpressionAST]){
		super(tokens);
		this.condition = tokens[1];
	}
	runBlock(runtime:Runtime, node:ProgramASTBranchNode){
		while(runtime.evaluateExpr(this.condition, "BOOLEAN")[1]){
			const result = runtime.runBlock(node.nodeGroups[0], {
				statement: this,
				variables: {}
			});
			if(result) return result;
		}
	}
}
@statement("dowhile", "REPEAT", "block", "keyword.dowhile")
export class DoWhileStatement extends Statement {
	runBlock(runtime:Runtime, node:ProgramASTBranchNode){
		do {
			const result = runtime.runBlock(node.nodeGroups[0], {
				statement: this,
				variables: {}
			});
			if(result) return result;
			//TODO prevent infinite loops
		} while(!runtime.evaluateExpr((node.controlStatements[1] as DoWhileEndStatement).condition, "BOOLEAN")[1]);
		//Inverted, the pseudocode statement is "until"
	}
}
@statement("dowhile.end", "UNTIL flag = false", "block_end", "keyword.dowhile_end", "expr+")
export class DoWhileEndStatement extends Statement {
	condition:ExpressionAST;
	constructor(tokens:[Token, ExpressionAST]){
		super(tokens);
		this.condition = tokens[1];
	}
}

@statement("function", "FUNCTION name(arg1: TYPE) RETURNS INTEGER", "block", "auto", "keyword.function", "name", "parentheses.open", ".*", "parentheses.close", "keyword.returns", "name")
export class FunctionStatement extends Statement {
	/** Mapping between name and type */
	args:FunctionArguments;
	returnType:VariableType;
	name:string;
	constructor(tokens:Token[]){
		super(tokens);
		const args = parseFunctionArguments(tokens.slice(3, -3));
		if(typeof args == "string") fail(`Invalid function arguments: ${args}`);
		this.args = args;
		const returnType = tokens.at(-1)!.text;
		if(!isVarType(returnType)) fail(`Invalid type ${returnType}`);
		this.returnType = returnType;
		this.name = tokens[1].text;
	}
	runBlock(runtime:Runtime, node:FunctionData){
		if(this.name in runtime.functions) fail(`Duplicate function definition for ${this.name}`);
		else if(this.name in builtinFunctions) fail(`Function ${this.name} is already defined as a builtin function`);
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

