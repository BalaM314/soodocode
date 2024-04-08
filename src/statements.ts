/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the definitions for every statement type supported by Soodocode.
*/


import {
	EnumeratedVariableType, FunctionData, PointerVariableType, PrimitiveVariableType, RecordVariableType, Runtime,
	SetVariableType, UnresolvedVariableType, VariableType, VariableTypeMapping, VariableValue
} from "./runtime.js";
import { TokenType, Token, TextRange, TextRanged } from "./lexer-types.js";
import {
	ExpressionAST, ExpressionASTArrayTypeNode, ExpressionASTFunctionCallNode, ExpressionASTTypeNode,
	ProgramASTBranchNode, TokenMatcher
} from "./parser-types.js";
import { isLiteral, parseExpression, parseFunctionArguments, parseType, processTypeData } from "./parser.js";
import {
	displayExpression, fail, crash, escapeHTML, isPrimitiveType, splitTokensOnComma, getTotalRange,
	SoodocodeError, fquote,
} from "./utils.js";
import { builtinFunctions } from "./builtin_functions.js";


export type StatementType = //TODO clean up these names
	| "declaration" | "define" | "constant" | "assignment" | "output" | "input" | "return" | "call"
	| "type" | "type.pointer" | "type.enum" | "type.set" | "type.end"
	| "if" | "if.end" | "else"
	| "switch" | "switch.end" | "case" | "case.range"
	| "for" | "for.step" | "for.end"
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
export type FunctionArguments = Map<string, {type:UnresolvedVariableType, passMode:PassMode}>;
export type BuiltinFunctionArguments = Map<string, {type:PrimitiveVariableType[], passMode:PassMode}>;
export type FunctionArgumentData = [name:string, {type:UnresolvedVariableType, passMode:PassMode}];
export type FunctionArgumentDataPartial = [nameToken:Token, {type:UnresolvedVariableType | null, passMode:PassMode | null}];

export type StatementExecutionResult = {
	type: "function_return";
	value: VariableValue;
};

export class Statement implements TextRanged {
	type:typeof Statement;
	stype:StatementType;
	static type:StatementType;
	category:StatementCategory;
	static category:StatementCategory = null!; //Assigned in the decorator
	static example:string = null!; //Assigned in the decorator
	static tokens:(TokenMatcher | "#")[] = null!; //Assigned in the decorator
	range: TextRange;
	constructor(public tokens:(Token | ExpressionAST | ExpressionASTArrayTypeNode)[]){
		this.type = this.constructor as typeof Statement;
		this.stype = this.type.type;
		this.category = this.type.category;
		this.range = getTotalRange(tokens);
	}
	toString(html = false){
		if(html){
			return this.tokens.map(t => t instanceof Token ? escapeHTML(t.text) : `<span class="expression-container">${displayExpression(t, false, true)}</span>`).join(" ");
		} else {
			return this.tokens.map(t => displayExpression(t, false)).join(" ");
		}
	}
	static blockEndStatement<
		/** use Function to prevent narrowing, leave blank otherwise */
		TOut extends typeof Statement | Function = typeof Statement
	>():typeof Statement extends TOut ? TOut : unknown { //hack
		if(this.category != "block") crash(`Statement ${this.type} has no block end statement because it is not a block statement`);
		return statements.byType[this.type.split(".")[0] + ".end" as StatementType] as never; //REFACTOR CHECK
	}
	example(){
		return this.type.example;
	}
	/** Warning: block will not include the usual end statement. */
	static supportsSplit(block:ProgramASTBranchNode, statement:Statement):true | string {
		return fquote`current block of type ${block.type} cannot be split by ${statement.toString()}`;
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
	varType:UnresolvedVariableType;
	constructor(tokens:[Token, ...names:Token[], Token, ExpressionASTTypeNode]){
		super(tokens);

		//parse the variable list
		//TODO replace with splitArray or somehow refactor this code
		let expected:"name" | "commaOrColon" = "name";
		for(const token of tokens.slice(1, -2) as Token[]){
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
		const varType = runtime.resolveVariableType(this.varType);
		for(const variable of this.variables){
			if(runtime.getVariable(variable)) fail(`Variable ${variable} was already declared`);
			runtime.getCurrentScope().variables[variable] = {
				type: varType,
				value: typeof varType == "string" ? null : varType.getInitValue(runtime),
				declaration: this,
				mutable: true,
			};
		}
	}
}
@statement("constant", "CONSTANT x = 1.5", "keyword.constant", "name", "operator.equal_to", "literal") //the equal_to operator is used in this statement, idk why
export class ConstantStatement extends Statement {
	name: string;
	expr: Token;
	constructor(tokens:[Token, Token, Token, Token]){
		super(tokens);
		let [constant, name, equals, expr] = tokens;
		this.name = name.text;
		this.expr = expr;
	}
	run(runtime:Runtime){
		if(runtime.getVariable(this.name)) fail(`Constant ${this.name} was already declared`);
		const [type, value] = Runtime.evaluateToken(this.expr);
		runtime.getCurrentScope().variables[this.name] = {
			type,
			get value(){ return value; },
			set value(value){ crash(`Attempted assignment to constant`); },
			declaration: this,
			mutable: false,
		};
	}
}
@statement("define", "DEFINE PrimesBelow20 (2, 3, 5, 7, 11, 13, 17, 19): myIntegerSet", "keyword.define", "name", "parentheses.open", ".+", "parentheses.close", "punctuation.colon", "name")
export class DefineStatement extends Statement {
	name: Token;
	variableType: Token;
	values: Token[];
	constructor(tokens:[Token, Token, Token, ...Token[], Token, Token, Token]){
		super(tokens);
		this.name = tokens[1];
		this.variableType = tokens.at(-1)!;
		const valuesTokens = tokens.slice(3, -3);
		//TODO duped code: getUniqueTextFromCommaSeparatedTokenList
		this.values = splitTokensOnComma(valuesTokens).map(group => {
			if(group.length != 1) fail(`All enum values must be separated by commas`, group.length > 0 ? group : valuesTokens);
			return group[0];
		});
		if(new Set(this.values.map(t => t.text)).size !== this.values.length){
			//duplicate value
			const duplicateToken = valuesTokens.find((a, i) => valuesTokens.find((b, j) => a.text == b.text && i != j)) ?? crash(`Unable to find the duplicate enum value in ${valuesTokens.join(" ")}`);
			fail(fquote`Duplicate enum value ${duplicateToken.text}`, duplicateToken);
		}
	}
	run(runtime:Runtime){
		const type = runtime.getType(this.variableType.text) ?? fail(`Nonexistent variable type ${this.variableType.text}`, this.variableType);
		if(!(type instanceof SetVariableType)) fail(`DEFINE can only be used on set types, please use a declare statement instead`, this.variableType);
		runtime.getCurrentScope().variables[this.name.text] = {
			type,
			declaration: this,
			mutable: false,
			value: this.values.map(t => Runtime.evaluateToken(t, type.baseType)[1] as VariableTypeMapping<PrimitiveVariableType>)
		};
	}
}

@statement("type.pointer", "TYPE IntPointer = ^INTEGER", "keyword.type", "name", "operator.equal_to", "operator.pointer", "type+")
export class TypePointerStatement extends Statement {
	name: string;
	targetType: UnresolvedVariableType;
	constructor(tokens:[Token, Token, Token, Token, ExpressionASTTypeNode]){
		super(tokens);
		let targetType;
		[, {text: this.name},,, targetType] = tokens;
		this.targetType = processTypeData(targetType);
	}
	run(runtime:Runtime){
		runtime.getCurrentScope().types[this.name] = new PointerVariableType(
			this.name, runtime.resolveVariableType(this.targetType)
		);
	}
}
@statement("type.enum", "TYPE Weekend = (Sunday, Saturday)", "keyword.type", "name", "operator.equal_to", "parentheses.open", ".+", "parentheses.close")
export class TypeEnumStatement extends Statement {
	name: Token;
	values: Token[];
	constructor(tokens:[Token, Token, Token, Token, ...Token[], Token]){
		super(tokens);
		this.name = tokens[1];
		const valuesTokens = tokens.slice(4, -1);
		this.values = splitTokensOnComma(valuesTokens).map(group => {
			if(group.length != 1) fail(`All enum values must be separated by commas`, group.length > 0 ? group : valuesTokens);
			return group[0];
		});
		if(new Set(this.values.map(t => t.text)).size !== this.values.length){
			//duplicate value
			const duplicateToken = valuesTokens.find((a, i) => valuesTokens.find((b, j) => a.text == b.text && i != j)) ?? crash(`Unable to find the duplicate enum value in ${valuesTokens.join(" ")}`);
			fail(fquote`Duplicate enum value ${duplicateToken.text}`, duplicateToken);
		}
	}
	run(runtime:Runtime){
		runtime.getCurrentScope().types[this.name.text] = new EnumeratedVariableType(
			this.name.text, this.values.map(t => t.text)
		);
	}
}
@statement("type.set", "TYPE myIntegerSet = SET OF INTEGER", "keyword.type", "name", "operator.equal_to", "keyword.set", "keyword.of", "name")
export class TypeSetStatement extends Statement {
	name: Token;
	setType: PrimitiveVariableType;
	constructor(tokens:[Token, Token, Token, Token, Token, Token]){
		super(tokens);
		this.name = tokens[1];
		if(isPrimitiveType(tokens[5].text))
			this.setType = tokens[5].text;
		else fail(`Sets of non-primitive types are not supported.`);
	}
	run(runtime:Runtime){
		runtime.getCurrentScope().types[this.name.text] = new SetVariableType(
			this.name.text, this.setType
		);
	}
}
@statement("type", "TYPE StudentData", "block", "auto", "keyword.type", "name")
export class TypeRecordStatement extends Statement {
	name: Token;
	constructor(tokens:[Token, Token]){
		super(tokens);
		this.name = tokens[1];
	}
	runBlock(runtime:Runtime, node:ProgramASTBranchNode){
		const fields:Record<string, VariableType> = {};
		for(const statement of node.nodeGroups[0]){
			if(!(statement instanceof DeclarationStatement)) fail(`Statements in a record type block can only be declaration statements`);
			const type = runtime.resolveVariableType(statement.varType);
			statement.variables.forEach(v => fields[v] = type);
		}
		runtime.getCurrentScope().types[this.name.text] = new RecordVariableType(this.name.text, fields);
	}
}
@statement("assignment", "x <- 5", "#", "expr+", "operator.assignment", "expr+")
export class AssignmentStatement extends Statement {
	/** Can be a normal variable name, like [name x], or an array access expression */
	target: ExpressionAST;
	expr: ExpressionAST;
	constructor(tokens:[ExpressionAST, Token, ExpressionAST]){
		super(tokens);
		[this.target, , this.expr] = tokens;
		if(this.target instanceof Token && isLiteral(this.target.type))
			fail(fquote`Cannot assign to literal token ${this.target.text}`, this.target, this);
	}
	run(runtime:Runtime){
		const variable = runtime.evaluateExpr(this.target, "variable");
		if(!variable.mutable) fail(`Cannot assign to constant ${this.target.toString()}`);
		variable.value = runtime.evaluateExpr(this.expr, variable.type)[1];
	}
}
@statement("output", `OUTPUT "message"`, "keyword.output", ".+")
export class OutputStatement extends Statement {
	outMessage: (Token | ExpressionAST)[];
	constructor(tokens:[Token, ...Token[]]){
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
			value: runtime.evaluateExpr(this.expr, runtime.resolveVariableType(statement.returnType))[1]
		};
	}
}
@statement("call", "CALL Func(5)", "keyword.call", "expr+")
export class CallStatement extends Statement {
	func:ExpressionASTFunctionCallNode;
	constructor(tokens:[Token, ExpressionAST]){
		super(tokens);
		if(tokens[1] instanceof ExpressionASTFunctionCallNode){
			this.func = tokens[1];
		} else fail(`CALL can only be used to call functions or procedures`);
	}
	run(runtime:Runtime){
		const name = this.func.functionName.text;
		const func = runtime.getFunction(name);
		if("name" in func) fail(`CALL cannot be used on builtin functions, because they have no side effects`);
		if(func.controlStatements[0] instanceof FunctionStatement) fail(`CALL cannot be used on functions because "Functions should only be called as part of an expression." according to Cambridge.`);
		runtime.callFunction(func, this.func.args);
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
	static supportsSplit(block:ProgramASTBranchNode, statement:Statement):true | string {
		if(statement.stype != "else") return `${statement.stype} statements are not valid in IF blocks`;
		return true;
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
@statement("switch", "CASE OF x", "block", "auto", "keyword.case", "keyword.of", "expr+")
export class SwitchStatement extends Statement {
	//First node group is blank, because a blank node group is created and then the block is split by the first case branch
	expression:ExpressionAST;
	constructor(tokens:[Token, Token, ExpressionAST]){
		super(tokens);
		[,, this.expression] = tokens;
	}
	static supportsSplit(block:ProgramASTBranchNode, statement:Statement):true | string {
		if(!(statement instanceof CaseBranchStatement)) return `${statement.stype} statements are not valid in CASE OF blocks`;
		if(block.nodeGroups.at(-1)!.length == 0 && block.nodeGroups.length != 1) return `Previous case branch was empty.`;
		return true;
	}
	runBlock(runtime:Runtime, {controlStatements, nodeGroups}:ProgramASTBranchNode):void | StatementExecutionResult {
		const [switchType, switchValue] = runtime.evaluateExpr(this.expression);
		if(nodeGroups[0].length > 0) fail(`Statements are not allowed before the first case branch`, nodeGroups[0]); //TODO this is a syntax error and should error at parse
		for(const [i, statement] of controlStatements.entries()){
			if(i == 0) continue;
			//skip the first one as that is the switch statement
			if(statement instanceof this.type.blockEndStatement<Function>()) break; //end of statements
			else if(statement instanceof CaseBranchStatement){
				const caseToken = statement.value;
				//Ensure that OTHERWISE is the last branch
				if(caseToken.type == "keyword.otherwise" && i != controlStatements.length - 2)
					fail(`OTHERWISE case branch must be the last case branch`, statement);

				if(statement.branchMatches(switchType, switchValue)){
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
@statement("case", "5: ", "block_multi_split", "#", "literal|otherwise", "punctuation.colon")
export class CaseBranchStatement extends Statement {
	value:Token;
	constructor(tokens:[Token, Token]){
		super(tokens);
		[this.value] = tokens;
	}
	branchMatches(switchType:VariableType, switchValue:VariableValue){
		if(this.value.type == "keyword.otherwise") return true;
		//Try to evaluate the case token with the same type as the switch target
		const [caseType, caseValue] = Runtime.evaluateToken(this.value, switchType);
		return switchValue == caseValue;
	}
}
@statement("case.range", "5 TO 10: ", "block_multi_split", "#", "literal", "keyword.to", "literal", "punctuation.colon")
export class CaseBranchRangeStatement extends CaseBranchStatement {
	upperBound:Token;
	static allowedTypes:TokenType[] = ["number.decimal", "char"];
	constructor(tokens:[Token, Token, Token, Token]){
		super(tokens.slice(0, 2) as [Token, Token]);
		if(!CaseBranchRangeStatement.allowedTypes.includes(tokens[0].type))
			fail(`Token of type ${tokens[0].type} is not valid in range cases: expected a number of character`, tokens[0]);
		if(tokens[2].type != tokens[0].type)
			fail(`Token of type ${tokens[2].type} does not match the other range bound: expected a ${tokens[0].type}`, tokens[2]);
		this.upperBound = tokens[2];
	}
	branchMatches(switchType:VariableType, switchValue:VariableValue){
		if(this.value.type == "keyword.otherwise") return true;
		//Evaluate the case tokens with the same type as the switch target
		const [lType, lValue] = Runtime.evaluateToken(this.value, switchType);
		const [uType, uValue] = Runtime.evaluateToken(this.upperBound, switchType);
		return lValue <= switchValue && switchValue <= uValue;
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
	step(runtime:Runtime):number {
		return 1;
	}
	runBlock(runtime:Runtime, node:ProgramASTBranchNode){
		const lower = runtime.evaluateExpr(this.lowerBound, "INTEGER")[1];
		const upper = runtime.evaluateExpr(this.upperBound, "INTEGER")[1];
		if(upper < lower) return;
		const end = node.controlStatements[1] as ForEndStatement;
		if(end.name !== this.name) fail(`Incorrect NEXT statement: expected variable "${this.name}" from for loop, got variable "${end.name}"`);
		const step = this.step(runtime);
		for(let i = lower; i <= upper; i += step){
			const result = runtime.runBlock(node.nodeGroups[0], {
				statement: this,
				variables: {
					//Set the loop variable in the loop scope
					[this.name]: {
						declaration: this,
						mutable: false,
						type: "INTEGER",
						get value(){ return i; },
						set value(value){ crash(`Attempted assignment to constant`) },
					}
				},
				types: {}
			});
			if(result) return result;
		}
	}
}
@statement("for.step", "FOR x <- 1 TO 20 STEP 2", "block", "keyword.for", "name", "operator.assignment", "expr+", "keyword.to", "expr+", "keyword.step", "expr+")
export class ForStepStatement extends ForStatement {
	stepToken: ExpressionAST;
	constructor(tokens:[Token, Token, Token, ExpressionAST, Token, ExpressionAST, Token, ExpressionAST]){
		super(tokens.slice(0, 6) as [Token, Token, Token, ExpressionAST, Token, ExpressionAST]);
		this.stepToken = tokens[7];
	}
	step(runtime:Runtime):number {
		return runtime.evaluateExpr(this.stepToken, "INTEGER")[1];
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
				variables: {},
				types: {},
			});
			if(result) return result;
		}
	}
}
@statement("dowhile", "REPEAT", "block", "keyword.dowhile")
export class DoWhileStatement extends Statement {
	static maxLoops = 10_000; //CONFIG
	runBlock(runtime:Runtime, node:ProgramASTBranchNode){
		let i = 0;
		do {
			const result = runtime.runBlock(node.nodeGroups[0], {
				statement: this,
				variables: {},
				types: {},
			});
			if(result) return result;
			if(++i > DoWhileStatement.maxLoops)
				fail(`Too many loop iterations`, node.controlStatements[0], node.controlStatements);
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
	returnType:UnresolvedVariableType;
	name:string;
	constructor(tokens:Token[]){
		super(tokens);
		const args = parseFunctionArguments(tokens.slice(3, -3));
		if(typeof args == "string") fail(`Invalid function arguments: ${args}`);
		this.args = args;
		const returnType = tokens.at(-1)!.text;
		if(!isPrimitiveType(returnType)) fail(`Invalid type ${returnType}`);
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

