/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the definitions for every statement type supported by Soodocode.
*/


import { builtinFunctions } from "./builtin_functions.js";
import { TextRange, TextRanged, Token, TokenType } from "./lexer-types.js";
import { ExpressionAST, ExpressionASTArrayTypeNode, ExpressionASTFunctionCallNode, ExpressionASTTypeNode, ProgramASTBranchNode, ProgramASTBranchNodeType, TokenMatcher } from "./parser-types.js";
import { expressionLeafNodeTypes, isLiteral, parseExpression, parseFunctionArguments, processTypeData } from "./parser.js";
import { ClassVariableType, ClassMethodData, EnumeratedVariableType, FileMode, FunctionData, PointerVariableType, PrimitiveVariableType, RecordVariableType, SetVariableType, UnresolvedVariableType, VariableType, VariableTypeMapping, VariableValue, typesEqual, checkClassMethodsCompatible } from "./runtime-types.js";
import { Runtime } from "./runtime.js";
import { IFormattable } from "./types.js";
import { Abstract, crash, fail, f, getTotalRange, getUniqueNamesFromCommaSeparatedTokenList, splitTokensOnComma, getRange } from "./utils.js";


//TODO snake case
export type StatementType =
	| "declare" | "define" | "constant" | "assignment" | "output" | "input" | "return" | "call"
	| "type" | "type.pointer" | "type.enum" | "type.set" | "type.end"
	| "if" | "if.end" | "else"
	| "switch" | "switch.end" | "case" | "case.range"
	| "for" | "for.step" | "for.end"
	| "while" | "while.end"
	| "dowhile" | "dowhile.end"
	| "function" | "function.end"
	| "procedure" | "procedure.end"
	| "openfile" | "readfile" | "writefile" | "closefile"
	| "seek" | "getrecord" | "putrecord"
	| "class" | "class.inherits" | "class.end"
	| "class_property"
	| "class_procedure" | "class_procedure.end"
	| "class_function" | "class_function.end"
;
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

@Abstract
export class Statement implements TextRanged, IFormattable {
	type:typeof Statement;
	stype:StatementType;
	static type:StatementType;
	category:StatementCategory;
	static category:StatementCategory = null!; //Assigned in the decorator
	static example:string = null!; //Assigned in the decorator
	static tokens:(TokenMatcher | "#")[] = null!; //Assigned in the decorator
	static suppressErrors = false;
	/**
	 * If set, this statement class will only be checked for in blocks of the specified type.
	 **/
	static blockType:ProgramASTBranchNodeType | null = null;
	/**
	 * If set, only the specified statement classes will only be checked for in blocks of this statement. Make sure to add the end statement.
	 **/
	static allowOnly:Set<StatementType> | null = null;
	range: TextRange;
	constructor(public tokens:(Token | ExpressionAST | ExpressionASTArrayTypeNode)[]){
		this.type = this.constructor as typeof Statement;
		this.stype = this.type.type;
		this.category = this.type.category;
		this.range = getTotalRange(tokens);
	}
	fmtText(){
		return this.tokens.map(t => t.fmtText()).join(" ");
	}
	fmtDebug(){
		return this.tokens.map(t => t.fmtDebug()).join(" ");
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
	/**
	 * Use this method to validate block splitting statements.
	 * Split statements are only considered if the block type matches, so this method returns true by default.
	 * Warning: block will not include the usual end statement.
	 **/
	static supportsSplit(block:ProgramASTBranchNode, statement:Statement):true | string {
		return true;
	}
	static checkBlock(block:ProgramASTBranchNode){
		//crash if the block is invalid or incomplete
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
				class __endStatement extends Statement {
					static blockType = type as ProgramASTBranchNodeType; //TODO valiate casts
				}
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
			const firstToken = args[0] as Exclude<TokenMatcher, "#">;
			switch(firstToken){
				case ".": case ".*": case ".+": case "expr+": case "type+": case "literal": case "literal|otherwise":
					crash(`Invalid statement definitions! Statements starting with matcher ${firstToken} must be irregular`);
					break;
				//Register these on the different token types
				case "class_modifier":
					(statements.byStartKeyword["keyword.class_modifier.private"] ??= []).push(input);
					(statements.byStartKeyword["keyword.class_modifier.public"] ??= []).push(input);
					break;
				case "file_mode":
					(statements.byStartKeyword["keyword.file_mode.read"] ??= []).push(input);
					(statements.byStartKeyword["keyword.file_mode.write"] ??= []).push(input);
					(statements.byStartKeyword["keyword.file_mode.append"] ??= []).push(input);
					(statements.byStartKeyword["keyword.file_mode.random"] ??= []).push(input);
					break;
				default:
					(statements.byStartKeyword[firstToken] ??= []).push(input);
			}
		}
		if(statements.byType[type]) crash(`Invalid statement definitions! Statement for type ${type} already registered`);
		statements.byType[type] = input;
		input.tokens = args as TokenMatcher[];
		return input;
	};
}

@statement("declare", "DECLARE variable: TYPE", "keyword.declare", ".+", "punctuation.colon", "type+")
export class DeclareStatement extends Statement {
	variables:string[] = [];
	varType:UnresolvedVariableType;
	constructor(tokens:[Token, ...names:Token[], Token, ExpressionASTTypeNode]){
		super(tokens);

		//parse the variable list
		this.variables = getUniqueNamesFromCommaSeparatedTokenList(tokens.slice(1, -2) as Token[], tokens.at(-2) as Token).map(t => t.text);
		this.varType = processTypeData(tokens.at(-1)!);
	}
	run(runtime:Runtime){
		const varType = runtime.resolveVariableType(this.varType);
		for(const variable of this.variables){
			if(runtime.getVariable(variable)) fail(`Variable ${variable} was already declared`);
			runtime.getCurrentScope().variables[variable] = {
				type: varType,
				value: typeof varType == "string" ? null : varType.getInitValue(runtime, false),
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
		const [_constant, name, _equals, expr] = tokens;
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
		this.values = getUniqueNamesFromCommaSeparatedTokenList(tokens.slice(3, -3), tokens.at(-3), expressionLeafNodeTypes);
	}
	run(runtime:Runtime){
		const type = runtime.getType(this.variableType.text) ?? fail(`Nonexistent variable type ${this.variableType.text}`, this.variableType);
		if(!(type instanceof SetVariableType)) fail(`DEFINE can only be used on set types, please use a declare statement instead`, this.variableType);
		runtime.getCurrentScope().variables[this.name.text] = {
			type,
			declaration: this,
			mutable: true,
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
		this.values = getUniqueNamesFromCommaSeparatedTokenList(tokens.slice(4, -1), tokens.at(-1));
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
		this.setType = PrimitiveVariableType.get(tokens[5].text) ?? fail(`Sets of non-primitive types are not supported.`);
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
			if(!(statement instanceof DeclareStatement)) fail(`Statements in a record type block can only be declaration statements`);
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
			fail(f.quote`Cannot assign to literal token ${this.target}`, this.target, this);
	}
	run(runtime:Runtime){
		const variable = runtime.evaluateExpr(this.target, "variable");
		if(!variable.mutable) fail(f.quote`Cannot assign to constant ${this.target}`);
		//CONFIG allow copying arrays/records by assignment?
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
			const expr = runtime.evaluateExpr(token, PrimitiveVariableType.STRING)[1];
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
		if(!variable) fail(`Undeclared variable ${this.name}`, this.tokens[1]);
		if(!variable.mutable) fail(`Cannot INPUT ${this.name} because it is a constant`);
		const input = runtime._input(f.text`Enter the value for variable "${this.name}" (type: ${variable.type})`);
		switch(variable.type){
			case PrimitiveVariableType.BOOLEAN:
				variable.value = input.toLowerCase() != "false"; break;
			case PrimitiveVariableType.INTEGER: {
				const value = Number(input);
				if(isNaN(value)) fail(`input was an invalid number`);
				if(!Number.isSafeInteger(value)) fail(`input was an invalid integer`);
				variable.value = value;
				break; }
			case PrimitiveVariableType.REAL: {
				const value = Number(input);
				if(isNaN(value)) fail(`input was an invalid number`);
				if(!Number.isSafeInteger(value)) fail(`input was an invalid integer`);
				variable.value = value;
				break; }
			case PrimitiveVariableType.STRING:
				variable.value = input;
				break;
			case PrimitiveVariableType.CHAR:
				if(input.length == 1) variable.value = input;
				else fail(`input was not a valid character: contained more than one character`);
				break;
			default:
				fail(f.quote`Cannot INPUT variable of type ${variable.type}`, this);
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
		let type;
		if(fn instanceof ProgramASTBranchNode){
			const statement = fn.controlStatements[0];
			if(statement instanceof ProcedureStatement) fail(`Procedures cannot return a value.`, this);
			type = statement.returnType;
		} else {
			if(fn instanceof ClassProcedureStatement) fail(`Procedures cannot return a value.`, this);
			type = fn.returnType;
		}
		return {
			type: "function_return" as const,
			value: runtime.evaluateExpr(this.expr, runtime.resolveVariableType(type))[1]
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
		const func = runtime.evaluateExpr(this.func.functionName, "function");
		if(Array.isArray(func)){
			//Class method
			runtime.callClassMethod(func[0], func[1], this.func.args); //TODO change "require return value" to also allow "forbid return value" on callFunction and callClassMethod
		} else {
			if("name" in func) fail(`CALL cannot be used on builtin functions, because they have no side effects`);
			if(func.controlStatements[0] instanceof FunctionStatement) fail(`CALL cannot be used on functions because "Functions should only be called as part of an expression." according to Cambridge.`);
			runtime.callFunction(func, this.func.args);
		}
	}
}


@statement("if", "IF a < 5 THEN", "block", "auto", "keyword.if", "expr+", "keyword.then")
export class IfStatement extends Statement {
	condition:ExpressionAST;
	constructor(tokens:[Token, ExpressionAST, Token]){
		super(tokens);
		this.condition = tokens[1];
	}
	runBlock(runtime:Runtime, node:ProgramASTBranchNode){
		if(runtime.evaluateExpr(this.condition, PrimitiveVariableType.BOOLEAN)[1]){
			return runtime.runBlock(node.nodeGroups[0]);
		} else if(node.controlStatements[1] instanceof ElseStatement && node.nodeGroups[1]){
			return runtime.runBlock(node.nodeGroups[1]);
		}
	}
}
@statement("else", "ELSE", "block_multi_split", "keyword.else")
export class ElseStatement extends Statement {
	static blockType: ProgramASTBranchNodeType | null = "if";
}
@statement("switch", "CASE OF x", "block", "auto", "keyword.case", "keyword.of", "expr+")
export class SwitchStatement extends Statement {
	//First node group is blank, because a blank node group is created and then the block is split by the first case branch
	expression:ExpressionAST;
	constructor(tokens:[Token, Token, ExpressionAST]){
		super(tokens);
		[,, this.expression] = tokens;
	}
	static supportsSplit(block:ProgramASTBranchNode, statement:Statement):true | string {
		if(block.nodeGroups.at(-1)!.length == 0 && block.nodeGroups.length != 1) return `Previous case branch was empty. (Fallthrough is not supported.)`;
		return true;
	}
	static checkBlock({nodeGroups, controlStatements}:ProgramASTBranchNode){
		if(nodeGroups[0].length > 0) fail(`Statements are not allowed before the first case branch`, nodeGroups[0]);
		let err:Statement | undefined;
		// eslint-disable-next-line no-cond-assign
		if(err = controlStatements.slice(1, -1).find((s, i, arr) =>
			s instanceof CaseBranchStatement && s.value.type == "keyword.otherwise" && i != arr.length - 1)
		) fail(`OTHERWISE case branch must be the last case branch`, err);
	}
	runBlock(runtime:Runtime, {controlStatements, nodeGroups}:ProgramASTBranchNode):void | StatementExecutionResult {
		const [switchType, switchValue] = runtime.evaluateExpr(this.expression);
		for(const [i, statement] of controlStatements.entries()){
			if(i == 0) continue;
			//skip the first one as that is the switch statement
			if(statement instanceof this.type.blockEndStatement<Function>()) break; //end of statements
			else if(statement instanceof CaseBranchStatement){
				const caseToken = statement.value;
				if(caseToken.type == "keyword.otherwise" && i != controlStatements.length - 2)
					crash(`OTHERWISE case branch must be the last case branch`);

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
	static blockType:ProgramASTBranchNodeType = "switch";
	constructor(tokens:[Token, Token]){
		super(tokens);
		[this.value] = tokens;
	}
	branchMatches(switchType:VariableType, switchValue:VariableValue){
		if(this.value.type == "keyword.otherwise") return true;
		//Try to evaluate the case token with the same type as the switch target
		const [_caseType, caseValue] = Runtime.evaluateToken(this.value, switchType);
		return switchValue == caseValue;
	}
}
@statement("case.range", "5 TO 10: ", "block_multi_split", "#", "literal", "keyword.to", "literal", "punctuation.colon")
export class CaseBranchRangeStatement extends CaseBranchStatement {
	upperBound:Token;
	static blockType:ProgramASTBranchNodeType = "switch";
	static allowedTypes:TokenType[] = ["number.decimal", "char"];
	constructor(tokens:[Token, Token, Token, Token]){
		super(tokens as never);
		if(!CaseBranchRangeStatement.allowedTypes.includes(tokens[0].type))
			fail(`Token of type ${tokens[0].type} is not valid in range cases: expected a number or character`, tokens[0]);
		if(tokens[2].type != tokens[0].type)
			fail(`Token of type ${tokens[2].type} does not match the other range bound: expected a ${tokens[0].type}`, tokens[2]);
		this.upperBound = tokens[2];
	}
	branchMatches(switchType:VariableType, switchValue:VariableValue){
		if(this.value.type == "keyword.otherwise") return true;
		//Evaluate the case tokens with the same type as the switch target
		const [_lType, lValue] = Runtime.evaluateToken(this.value, switchType);
		const [_uType, uValue] = Runtime.evaluateToken(this.upperBound, switchType);
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
	step(_runtime:Runtime):number {
		return 1;
	}
	runBlock(runtime:Runtime, node:ProgramASTBranchNode){
		const lower = runtime.evaluateExpr(this.lowerBound, PrimitiveVariableType.INTEGER)[1];
		const upper = runtime.evaluateExpr(this.upperBound, PrimitiveVariableType.INTEGER)[1];
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
						type: PrimitiveVariableType.INTEGER,
						get value(){ return i; },
						set value(value){ crash(`Attempted assignment to constant`); },
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
		super(tokens as never);
		this.stepToken = tokens[7];
	}
	step(runtime:Runtime):number {
		return runtime.evaluateExpr(this.stepToken, PrimitiveVariableType.INTEGER)[1];
	}
}
@statement("for.end", "NEXT i", "block_end", "keyword.for_end", "name")
export class ForEndStatement extends Statement {
	name:string;
	static blockType: ProgramASTBranchNodeType = "for";
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
		while(runtime.evaluateExpr(this.condition, PrimitiveVariableType.BOOLEAN)[1]){
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
		} while(!runtime.evaluateExpr((node.controlStatements[1] as DoWhileEndStatement).condition, PrimitiveVariableType.BOOLEAN)[1]);
		//Inverted, the pseudocode statement is "until"
	}
}
@statement("dowhile.end", "UNTIL flag = false", "block_end", "keyword.dowhile_end", "expr+")
export class DoWhileEndStatement extends Statement {
	condition:ExpressionAST;
	static blockType: ProgramASTBranchNodeType = "dowhile";
	constructor(tokens:[Token, ExpressionAST]){
		super(tokens);
		this.condition = tokens[1];
	}
}

@statement("function", "FUNCTION name(arg1: TYPE) RETURNS INTEGER", "block", "auto", "keyword.function", "name", "parentheses.open", ".*", "parentheses.close", "keyword.returns", "name")
export class FunctionStatement extends Statement {
	/** Mapping between name and type */
	args:FunctionArguments;
	argsRange:TextRange;
	returnType:UnresolvedVariableType;
	name:string;
	constructor(tokens:Token[]){
		super(tokens);
		this.args = parseFunctionArguments(tokens.slice(3, -3));
		this.argsRange = getTotalRange(tokens.slice(3, -3));
		this.returnType = processTypeData(tokens.at(-1)!);
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
	argsRange:TextRange;
	name:string;
	constructor(tokens:Token[]){
		super(tokens);
		this.args = parseFunctionArguments(tokens.slice(3, -1));
		this.argsRange = getTotalRange(tokens.slice(3, -1));
		this.name = tokens[1].text;
	}
	runBlock(runtime:Runtime, node:FunctionData){
		//Don't actually run the block
		runtime.functions[this.name] = node;
	}
}

interface IFileStatement {
	filename: ExpressionAST;
}

@statement("openfile", `OPENFILE "file.txt" FOR READ`, "keyword.open_file", "expr+", "keyword.for", "file_mode")
export class OpenFileStatement extends Statement implements IFileStatement { //TODO filestatement?
	mode:Token;
	filename:ExpressionAST;
	constructor(tokens:[Token, ExpressionAST, Token, Token]){
		super(tokens);
		[, this.filename, , this.mode] = tokens;
	}
	run(runtime:Runtime){
		const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING)[1];
		const mode = this.mode.text as FileMode;
		const file = runtime.fs.getFile(name, mode == "WRITE") ?? fail(`File ${name} does not exist.`);
		if(mode == "READ"){
			runtime.openFiles[name] = {
				file,
				mode,
				lines: file.text.split("\n").slice(0, -1), //the last element will be blank, because all lines end with a newline
				lineNumber: 0
			};
		} else if(mode == "RANDOM"){
			fail(`Not yet implemented`);
		} else {
			if(mode == "WRITE") file.text = ""; //Clear the file so it can be overwritten
			runtime.openFiles[name] = {
				file,
				mode,
			};
		}
	}
}
@statement("closefile", `CLOSEFILE "file.txt"`, "keyword.close_file", "expr+")
export class CloseFileStatement extends Statement implements IFileStatement {
	filename:ExpressionAST;
	constructor(tokens:[Token, ExpressionAST]){
		super(tokens);
		[, this.filename] = tokens;
	}
	run(runtime:Runtime){
		const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING)[1];
		if(runtime.openFiles[name]) runtime.openFiles[name] = undefined;
		else if(name in runtime.openFiles) fail(f.quote`Cannot close file ${name}, because it has already been closed.`);
		else fail(f.quote`Cannot close file ${name}, because it was never opened.`);
	}
}
@statement("readfile", `READFILE "file.txt", OutputVar`, "keyword.read_file", "expr+", "punctuation.comma", "expr+")
export class ReadFileStatement extends Statement implements IFileStatement {
	filename:ExpressionAST;
	output:ExpressionAST;
	constructor(tokens:[Token, ExpressionAST, Token, ExpressionAST]){
		super(tokens);
		[, this.filename, , this.output] = tokens;
	}
	run(runtime:Runtime){
		const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING)[1];
		const data = runtime.getOpenFile(name, ["READ"], `Reading from a file with READFILE`);
		if(data.lineNumber >= data.lines.length) fail(`End of file reached`);
		const output = runtime.evaluateExpr(this.output, "variable");
		output.value = data.lines[data.lineNumber ++];
	}
}
@statement("writefile", `WRITEFILE "file.txt", "hello world"`, "keyword.write_file", "expr+", "punctuation.comma", "expr+")
export class WriteFileStatement extends Statement implements IFileStatement {
	filename:ExpressionAST;
	data:ExpressionAST;
	constructor(tokens:[Token, ExpressionAST, Token, ExpressionAST]){
		super(tokens);
		[, this.filename, , this.data] = tokens;
	}
	run(runtime:Runtime){
		const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING)[1];
		const data = runtime.getOpenFile(name, ["WRITE", "APPEND"], `Writing to a file with WRITEFILE`);
		data.file.text += runtime.evaluateExpr(this.data, PrimitiveVariableType.STRING)[1] + "\n";
	}
}

@statement("seek", `SEEK "file.txt", 5`, "keyword.seek", "expr+", "punctuation.comma", "expr+")
export class SeekStatement extends Statement implements IFileStatement {
	filename:ExpressionAST;
	index:ExpressionAST;
	constructor(tokens:[Token, ExpressionAST, Token, ExpressionAST]){
		super(tokens);
		[, this.filename, , this.index] = tokens;
	}
	run(runtime:Runtime){
		const index = runtime.evaluateExpr(this.index, PrimitiveVariableType.INTEGER)[1];
		if(index < 0) fail(`SEEK index must be positive`);
		const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING)[1];
		const data = runtime.getOpenFile(name, ["RANDOM"], `SEEK statement`);
		fail(`Not yet implemented`);
	}
}
@statement("getrecord", `GETRECORD "file.txt", Record`, "keyword.get_record", "expr+", "punctuation.comma", "expr+")
export class GetRecordStatement extends Statement implements IFileStatement {
	filename: ExpressionAST;
	variable: ExpressionAST;
	constructor(tokens:[Token, ExpressionAST, Token, ExpressionAST]){
		super(tokens);
		[, this.filename, , this.variable] = tokens;
	}
	run(runtime:Runtime){
		const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING)[1];
		const data = runtime.getOpenFile(name, ["RANDOM"], `GETRECORD statement`);
		const variable = runtime.evaluateExpr(this.variable, "variable");
		fail(`Not yet implemented`);
	}
}
@statement("putrecord", `PUTRECORD "file.txt", Record`, "keyword.put_record", "expr+", "punctuation.comma", "expr+")
export class PutRecordStatement extends Statement implements IFileStatement {
	filename: ExpressionAST;
	variable: ExpressionAST;
	constructor(tokens:[Token, ExpressionAST, Token, ExpressionAST]){
		super(tokens);
		[, this.filename, , this.variable] = tokens;
	}
	run(runtime:Runtime){
		const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING)[1];
		const data = runtime.getOpenFile(name, ["RANDOM"], `PUTRECORD statement`);
		const [type, value] = runtime.evaluateExpr(this.variable);
		fail(`Not yet implemented`);
	}
}

interface IClassMemberStatement {
	accessModifierToken: Token;
	accessModifier: "public" | "private";
}

@statement("class", "CLASS Dog", "block", "auto", "keyword.class", "name")
export class ClassStatement extends Statement {
	static allowOnly = new Set<StatementType>(["class_property", "class_procedure", "class_function", "class.end"]);
	name: Token;
	constructor(tokens:[Token, Token] | [Token, Token, Token, Token]){
		super(tokens);
		this.name = tokens[1];
	}
	initializeClass(runtime:Runtime, branchNode:ProgramASTBranchNode):ClassVariableType {
		const classData = new ClassVariableType(this);
		for(const node of branchNode.nodeGroups[0]){
			if(node instanceof ProgramASTBranchNode){
				if(node.controlStatements[0] instanceof ClassFunctionStatement || node.controlStatements[0] instanceof ClassProcedureStatement){
					const method = node.controlStatements[0];
					if(classData.methods[method.name]){
						fail(f.quote`Duplicate declaration of class method ${method.name}`, this, classData.methods[method.name]);
					} else {
						node.controlStatements[0] satisfies (ClassFunctionStatement | ClassProcedureStatement);
						classData.methods[method.name] = node as ClassMethodData;
					}
				} else {
					console.error({branchNode, node});
					crash(`Invalid node in class block`);
				}
			} else if(node instanceof ClassPropertyStatement){
				for(const variable of node.variables){
					if(classData.properties[variable]){
						fail(f.quote`Duplicate declaration of class property ${variable}`, this, classData.properties[variable]);
					} else {
						classData.properties[variable] = node;
					}
				}
			} else {
				console.error({branchNode, node});
				crash(`Invalid node in class block`);
			}
		}
		return classData;
	}
	runBlock(runtime:Runtime, branchNode:ProgramASTBranchNode){
		if(runtime.getCurrentScope().types[this.name.text]) fail(f.quote`Type ${this.name.text} already exists in the current scope`);
		const data = this.initializeClass(runtime, branchNode);
		runtime.getCurrentScope().types[this.name.text] = data;
	}
}
@statement("class.inherits", "CLASS Dog INHERITS Animal", "block", "keyword.class", "name", "keyword.inherits", "name")
export class ClassInheritsStatement extends ClassStatement {
	superClassName:Token;
	constructor(tokens:[Token, Token, Token, Token]){
		super(tokens);
		this.superClassName = tokens[3];
	}
	initializeClass(runtime:Runtime, branchNode:ProgramASTBranchNode):ClassVariableType {
		const baseClass = runtime.getClass(this.superClassName.text);
		const extensions = super.initializeClass(runtime, branchNode);

		//Apply the base class's properties and functions
		extensions.baseClass = baseClass;
		for(const [key, value] of Object.entries(baseClass.properties)){
			if(extensions.properties[key]){
				fail(f.quote`Property ${key} has already been defined in base class ${this.superClassName.text}`, extensions.properties[key]);
			} else {
				extensions.properties[key] = value;
			}
		}
		for(const [key, value] of Object.entries(baseClass.methods)){
			//If the method has not been overriden, set it to the base class's method
			if(extensions.methods[key]){
				const base = extensions.methods[key].controlStatements[0];
				const derived = baseClass.methods[key].controlStatements[0];
				checkClassMethodsCompatible(base, derived);
			} else {
				extensions.methods[key] = value;
			}
		}
		return extensions;
	}
}


@statement("class_property", "PUBLIC variable: TYPE", "class_modifier", ".+", "punctuation.colon", "type+")
export class ClassPropertyStatement extends DeclareStatement implements IClassMemberStatement {
	accessModifierToken: Token;
	accessModifier: "public" | "private";
	static blockType: ProgramASTBranchNodeType = "class";
	constructor(tokens:[Token, ...names:Token[], Token, ExpressionASTTypeNode]){
		super(tokens);
		this.accessModifierToken = tokens[0];
		this.accessModifier = this.accessModifierToken.type.split("keyword.class_modifier.")[1] as "public" | "private";
	}
	run(runtime:Runtime){
		crash(`Class sub-statements cannot be run normally`);
	}
}
@statement("class_procedure", "PUBLIC PROCEDURE func(arg1: INTEGER, arg2: pDATE)", "block", "class_modifier", "keyword.procedure", "name", "parentheses.open", ".*", "parentheses.close")
export class ClassProcedureStatement extends ProcedureStatement implements IClassMemberStatement {
	accessModifierToken: Token;
	accessModifier: "public" | "private";
	methodKeywordToken: Token;
	static blockType: ProgramASTBranchNodeType = "class";
	constructor(tokens:[Token, Token, Token, Token, ...Token[], Token]){
		super(tokens.slice(1));
		this.tokens.unshift(tokens[0]);
		this.accessModifierToken = tokens[0];
		this.methodKeywordToken = tokens[1];
		this.accessModifier = this.accessModifierToken.type.split("keyword.class_modifier.")[1] as "public" | "private";
		if(this.name == "NEW" && this.accessModifier == "private")
			fail(`Constructors cannot be private, because running private constructors is impossible`, this.accessModifierToken);
	}
	runBlock(){
		crash(`Class sub-statements cannot be run normally`);
	}
}
@statement("class_procedure.end", "ENDPROCEDURE", "block_end", "keyword.procedure_end")
export class ClassProcedureEndStatement extends Statement {}
@statement("class_function", "PUBLIC FUNCTION func(arg1: INTEGER, arg2: pDATE) RETURNS INTEGER", "block", "class_modifier", "keyword.function", "name", "parentheses.open", ".*", "parentheses.close", "keyword.returns", "name")
export class ClassFunctionStatement extends FunctionStatement implements IClassMemberStatement {
	accessModifierToken: Token;
	accessModifier: "public" | "private";
	methodKeywordToken: Token;
	static blockType: ProgramASTBranchNodeType = "class";
	constructor(tokens:[Token, Token, Token, Token, ...Token[], Token, Token, Token]){
		super(tokens.slice(1));
		this.tokens.unshift(tokens[0]);
		this.accessModifierToken = tokens[0];
		this.methodKeywordToken = tokens[1];
		this.accessModifier = this.accessModifierToken.type.split("keyword.class_modifier.")[1] as "public" | "private";
	}
	runBlock(){
		crash(`Class sub-statements cannot be run normally`);
	}
}
@statement("class_function.end", "ENDFUNCTION", "block_end", "keyword.function_end")
export class ClassFunctionEndStatement extends Statement {}
