/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the definitions for every statement type supported by Soodocode.
*/


import { configs } from "./config.js";
import { Token, TokenType } from "./lexer-types.js";
import { tokenTextMapping } from "./lexer.js";
import { ExpressionAST, ExpressionASTFunctionCallNode, ExpressionASTNodeExt, ExpressionASTNodes, ExpressionASTTypeNode, ExpressionASTTypeNodes, ProgramASTBranchNode, ProgramASTBranchNodeType, TokenMatcher } from "./parser-types.js";
import { expressionLeafNodeTypes, isLiteral, parseExpression, parseFunctionArguments, processTypeData, StatementCheckTokenRange } from "./parser.js";
import { ClassMethodData, ClassVariableType, EnumeratedVariableType, FileMode, FunctionData, TypedNodeValue, PointerVariableType, PrimitiveVariableType, PrimitiveVariableTypeName, RecordVariableType, SetVariableType, UnresolvedVariableType, VariableType, VariableValue, UntypedNodeValue, NodeValue } from "./runtime-types.js";
import { Runtime } from "./runtime.js";
import type { IFormattable, TextRange, TextRanged } from "./types.js";
import { Abstract, combineClasses, crash, f, fail, forceType, getTotalRange, getUniqueNamesFromCommaSeparatedTokenList, RangeArray, splitTokensOnComma } from "./utils.js";

//Enable decorator metadata
if(!Symbol.metadata)
	Object.defineProperty(Symbol, "metadata", {
		writable: false,
		enumerable: false,
		configurable: false,
		value: Symbol("Symbol.metadata")
	});

//TODO snake case
export const statementTypes = [
	"declare", "define", "constant", "assignment", "output", "input", "return", "call",
	"type", "type.pointer", "type.enum", "type.set", "type.end",
	"if", "if.end", "else",
	"switch", "switch.end", "case", "case.range",
	"for", "for.step", "for.end",
	"while", "while.end",
	"dowhile", "dowhile.end",
	"function", "function.end",
	"procedure", "procedure.end",
	"openfile", "readfile", "writefile", "closefile",
	"seek", "getrecord", "putrecord",
	"class", "class.inherits", "class.end",
	"class_property",
	"class_procedure", "class_procedure.end",
	"class_function", "class_function.end",
	"illegal.assignment", "illegal.end", "illegal.for.end"
] as const;
export type StatementType = typeof statementTypes extends ReadonlyArray<infer T> ? T : never;
/** Statement types that don't start with "illegal." */
export type LegalStatementType<T extends StatementType = StatementType> = T extends `illegal.${string}` ? never : T;
export function StatementType(input:string):StatementType {
	if(statementTypes.includes(input)) return input;
	crash(`"${input}" is not a valid statement type`);
}

export type StatementCategory = "normal" | "block" | "block_end" | "block_multi_split";

/** Stores all statement constructors. */
export const statements = {
	byStartKeyword: {} as Partial<Record<TokenType, (typeof Statement)[]>>,
	byType: {} as Record<StatementType, typeof Statement>,
	irregular: [] as (typeof Statement)[],
};

export type FunctionArgumentPassMode = "value" | "reference";
export type FunctionArguments = Map<string, {type:UnresolvedVariableType, passMode:FunctionArgumentPassMode}>;
export type BuiltinFunctionArguments = Map<string, {type:VariableType[], passMode:FunctionArgumentPassMode}>;
export type FunctionArgumentData = [name:string, {type:UnresolvedVariableType, passMode:FunctionArgumentPassMode}];
export type FunctionArgumentDataPartial = [nameToken:Token, {type:UnresolvedVariableType | null, passMode:FunctionArgumentPassMode | null}];

export type StatementExecutionResult = {
	type: "function_return";
	value: VariableValue;
};

@Abstract
export class Statement implements TextRanged, IFormattable {
	/** A reference to the constructor and its static properties. */
	type:typeof Statement;
	stype:StatementType;
	category:StatementCategory;
	range:TextRange = getTotalRange(this.nodes);
	/** Prevents preRun() from being called twice */
	preRunDone = false;

	static type:StatementType = null!; //Assigned in the decorator
	static category:StatementCategory = null!; //Assigned in the decorator
	static example:string = null!; //Assigned in the decorator
	static tokens:(TokenMatcher | "#")[] = null!; //Assigned in the decorator
	/** A list of field names storing NodeValue objects that might be evaluatable before running. Set by the `@evaluate` decorator. */
	static evaluatableFields: string[]; //Assigned in the decorator
	static suppressErrors = false;
	/** If set, this statement class will only be checked for in blocks of the specified type. */
	static blockType:ProgramASTBranchNodeType | null = null;
	/** If set, only the specified statement classes will only be checked for in blocks of this statement. Make sure to add the end statement. */
	static allowOnly:Set<StatementType> | null = null;
	/** If set, this statement is invalid and will fail with the below error message if it parses successfully. */
	static invalidMessage: string | null | ((parseOutput:StatementCheckTokenRange[], context:ProgramASTBranchNode | null) => [message:string, range?:TextRange]) = null;
	constructor(public nodes:RangeArray<ExpressionASTNodeExt>){
		this.type = new.target;
		this.stype = this.type.type;
		this.category = this.type.category;
	}
	/** Returns the node at `ind` and asserts that it is a token. */
	token(ind:number):Token {
		const node = this.nodes.at(ind);
		if(node instanceof Token) return node;
		else crash(`Assertion failed: node at index ${ind} was not a token`);
	}
	/** Returns the nodes from `from` to `to` (exclusive) and asserts that they are all tokens. */
	tokens(from:number, to:number):RangeArray<Token> {
		const tokens = this.nodes.slice(from, to);
		tokens.forEach((t, i) =>
			t instanceof Token || crash(`Assertion failed: node at index ${i} was not a token`)
		);
		return tokens as RangeArray<Token>;
	}
	/** Returns the node at `ind` as a TypedNodeValue. */
	tokenT<InputType extends PrimitiveVariableTypeName | VariableType>(ind:number, type:InputType):TypedNodeValue<Token, InputType> {
		return new TypedNodeValue(this.token(ind), type);
	}
	/** Returns the node at `ind` and asserts that it is an expression. */
	expr(ind:number):ExpressionAST;
	/** Returns the node at `ind` and asserts that it is an expression. */
	expr(ind:number, allowed:"expr", error?:string):ExpressionAST;
	/** Returns the node at `ind` and asserts that it is a type. */
	expr(ind:number, allowed:"type", error?:string):ExpressionASTTypeNode;
	/** Returns the node at `ind` and asserts that it is one of the given types. */
	expr<Type extends new (...args:any[]) => {}>(ind:number, allowed:Type[], error?:string):InstanceType<Type>;
	expr(ind:number, allowed:"expr" | "type" | readonly (new (...args:any[]) => {})[] = "expr", error?:string):ExpressionASTNodeExt {
		if(allowed === "type") allowed = ExpressionASTTypeNodes;
		if(allowed === "expr") allowed = ExpressionASTNodes;

		if(allowed.some(c => this.nodes.at(ind) instanceof c))
			return this.nodes.at(ind) as ExpressionAST;

		if(error != undefined) fail(error, this.nodes.at(ind));
		else crash(`Assertion failed: node at index ${ind} was not an expression`);
	}
	/** Returns the node at `ind` as an untyped node value. */
	exprT(ind:number):UntypedNodeValue<ExpressionAST>;
	/** Returns the node at `ind` as a typed node value. */
	exprT<InputType extends PrimitiveVariableTypeName | VariableType>(ind:number, type:InputType):TypedNodeValue<ExpressionAST, InputType>;
	exprT<InputType extends PrimitiveVariableTypeName | VariableType>(ind:number, type?:InputType):TypedNodeValue<ExpressionAST, InputType> | UntypedNodeValue<ExpressionAST> {
		if(type) return new TypedNodeValue(this.expr(ind), type);
		else return new UntypedNodeValue(this.expr(ind));
	}
	fmtText(){
		return this.nodes.map(t => t.fmtText()).join(" ");
	}
	fmtDebug(){
		return this.nodes.map(t => t.fmtDebug()).join(" ");
	}
	/** Returns the block end statement for a given statement type */
	static blockEndStatement<
		/** use Function to prevent narrowing, leave blank otherwise */
		TOut extends typeof Statement | Function = typeof Statement
	>():typeof Statement extends TOut ? TOut : unknown { //hack
		if(this.category != "block") crash(`Statement ${this.type} has no block end statement because it is not a block statement`);
		return statements.byType[StatementType(this.type.split(".")[0] + ".end")] as never;
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
	static typeName(type:StatementType = this.type):string {
		if(!type) crash(`Argument must be specified when calling typeName() on base Statement`);
		return ({
			"declare": "DECLARE",
			"define": "DEFINE",
			"constant": "CONSTANT",
			"assignment": "Assignment",
			"output": "OUTPUT",
			"input": "INPUT",
			"return": "RETURN",
			"call": "CALL",
			"type": "TYPE (record)",
			"type.pointer": "TYPE (pointer)",
			"type.enum": "TYPE (enum)",
			"type.set": "TYPE (set)",
			"type.end": "ENDTYPE",
			"if": "IF",
			"if.end": "ENDIF",
			"else": "ELSE",
			"switch": "CASE OF",
			"switch.end": "ENDCASE",
			"case": "Case branch",
			"case.range": "Case branch (range)",
			"for": "FOR",
			"for.step": "FOR (step)",
			"for.end": "NEXT",
			"while": "WHILE",
			"while.end": "ENDWHILE",
			"dowhile": "REPEAT",
			"dowhile.end": "UNTIL",
			"function": "FUNCTION",
			"function.end": "ENDFUNCTION",
			"procedure": "PROCEDURE",
			"procedure.end": "ENDPROCEDURE",
			"openfile": "OPENFILE",
			"readfile": "READFILE",
			"writefile": "WRITEFILE",
			"closefile": "CLOSEFILE",
			"seek": "SEEK",
			"getrecord": "GETRECORD",
			"putrecord": "PUTRECORD",
			"class": "CLASS",
			"class.inherits": "CLASS (inherits)",
			"class.end": "ENDCLASS",
			"class_property": "Class property",
			"class_procedure": "Class procedure",
			"class_procedure.end": "ENDPROCEDURE (class)",
			"class_function": "Class function",
			"class_function.end": "ENDFUNCTION (class)",
		} satisfies Record<LegalStatementType, string> as Record<string, string | undefined>)[type] ?? "unknown statement";
	}
	/** Higher scores are given lower priority. */
	static tokensSortScore({tokens, invalidMessage}:typeof Statement = this):number {
		//TODO move usage to end of statement definitions
		return invalidMessage != null ? tokens.filter(t => [".*" , ".+" , "expr+" , "type+"].includes(t)).length * 100 - tokens.length : 10000;
	}
	run(runtime:Runtime):void | StatementExecutionResult {
		crash(`Missing runtime implementation for statement ${this.stype}`);
	}
	runBlock(runtime:Runtime, node:ProgramASTBranchNode):void | StatementExecutionResult { //TODO merge this with run()
		if(this.category == "block")
			crash(`Missing runtime implementation for block statement ${this.stype}`);
		else
			crash(`Cannot run statement ${this.stype} as a block, because it is not a block statement`);
	}
	/** This function is called once before execution starts, and is passed the closest branch node if it exists. The default implementation tries to evaluate evaluatable fields. */
	preRun(node?:ProgramASTBranchNode){
		for(const field of this.type.evaluatableFields){
			//Safety: checked in the decorator
			const nodeValue = (this as never as Record<typeof field, NodeValue>)[field];
			if(!(nodeValue instanceof TypedNodeValue || nodeValue instanceof UntypedNodeValue)) crash(`Decorated invalid field ${field}`);
			nodeValue.init();
		}
	}
	triggerPreRun(node?:ProgramASTBranchNode){
		if(!this.preRunDone) this.preRun(node);
		this.preRunDone = true;
	}
}

type StatementDecoratorMetadata = {
	evaluatableFields?: (typeof Statement)["evaluatableFields"];
	done?: boolean;
};

/** Decorator that registers a statement type. */
function statement<TClass extends typeof Statement>(type:StatementType, example:string, ...tokens:TokenMatcher[]):
	(input:TClass, context:ClassDecoratorContext<TClass>) => TClass;
/** Decorator that registers a statement type with matchers that do not need a keyword as the first matcher. */
function statement<TClass extends typeof Statement>(type:StatementType, example:string, irregular:"#", ...tokens:TokenMatcher[]):
	(input:TClass, context:ClassDecoratorContext<TClass>) => TClass;
/** Decorator that registers a block or block_end or block_multi_split statement type. */
function statement<TClass extends typeof Statement>(type:StatementType, example:string, category:"block" | "block_end" | "block_multi_split", ...tokens:TokenMatcher[]):
	(input:TClass, context:ClassDecoratorContext<TClass>) => TClass;
/** Decorator that registers a block or block_end or block_multi_split statement type with matchers that do not need a keyword as the first matcher. */
function statement<TClass extends typeof Statement>(type:StatementType, example:string, category:"block" | "block_end" | "block_multi_split", irregular:"#", ...tokens:TokenMatcher[]):
	(input:TClass, context:ClassDecoratorContext<TClass>) => TClass;
/** Decorator that registers a block statement type, and automatically creates a corresponding end statement type. */
function statement<TClass extends typeof Statement>(type:StatementType, example:string, category:"block", endType:"auto", ...tokens:TokenMatcher[]):
	(input:TClass, context:ClassDecoratorContext<TClass>) => TClass;

function statement<TClass extends typeof Statement>(type:StatementType, example:string, ...args:string[]){
	return function (input:TClass, context:ClassDecoratorContext<TClass>):TClass {
		input.type = type;
		input.example = example;

		forceType<StatementDecoratorMetadata>(context.metadata);
		input.evaluatableFields = (context.metadata.evaluatableFields ?? []);
		context.metadata.done = true;

		if(args[0] == "block" || args[0] == "block_end" || args[0] == "block_multi_split"){
			input.category = args[0];
			args.shift();
		} else {
			input.category = "normal";
		}
		if(args[0] == "auto" && input.category == "block"){
			args.shift();
			//REFACTOR CHECK
			@statement(
				StatementType(type + ".end"),
				tokenTextMapping[TokenType(args[0] + "_end") as keyof typeof tokenTextMapping] ?? "[unknown]",
				"block_end",
				TokenType(args[0] + "_end")
			)
			class __endStatement extends Statement {
				static blockType = ProgramASTBranchNodeType(type);
			}
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
/** Called after all statement types have been defined and registered. May be called multiple times if necessary. */
function finishStatements(){
	statements.irregular.sort((a, b) => a.tokensSortScore() - b.tokensSortScore());
}

/**
 * Decorator that marks a NodeValue field as possibly evaluatable during pre-run.
 * Example: `@evaluate condition = this.exprT(1, "BOOLEAN")`
 * During prerun, an attempt will be made to evaluate the condition statically.
 * If the condition requires a variable or can change at runtime, nothing will happen,
 * but if it can be evaluated statically (for example, if the condition is `5 < 6`),
 * its value will be cached and will not be recomputed at runtime.
 **/
function evaluate<This extends Statement & {[_ in K]: NodeValue}, K extends string, Value>(
	_:undefined, context:ClassFieldDecoratorContext<This, Value> & { name: K; static: false; }
){
	forceType<StatementDecoratorMetadata>(context.metadata);
	if(context.metadata.done){
		//The metadata object is prototype linked to the superclass's metadata object
		//Copy over the array and unlink it
		const evaluatableFields = context.metadata.evaluatableFields ?? [];
		Object.setPrototypeOf(context.metadata, null);
		context.metadata.evaluatableFields = evaluatableFields.slice();
	}
	(context.metadata.evaluatableFields ??= []).push(context.name);
}

export abstract class TypeStatement extends Statement {
	createType(runtime:Runtime):[name:string, type:VariableType<false>] {
		crash(`Missing runtime implementation for type initialization for statement ${this.stype}`);
	}
	createTypeBlock(runtime:Runtime, block:ProgramASTBranchNode):[name:string, type:VariableType<false>] {
		crash(`Missing runtime implementation for type initialization for statement ${this.stype}`);
	}
}

@statement("declare", "DECLARE variable: TYPE", "keyword.declare", ".+", "punctuation.colon", "type+")
export class DeclareStatement extends Statement {
	varType = processTypeData(this.expr(-1, "type"));
	variables:[string, Token][] = getUniqueNamesFromCommaSeparatedTokenList(
		this.tokens(1, -2), this.token(-2)
	).map(t => [t.text, t] as [string, Token]);
	run(runtime:Runtime){
		const varType = runtime.resolveVariableType(this.varType);
		if(varType instanceof SetVariableType) fail(`Cannot declare a set variable with the DECLARE statement, please use the DEFINE statement`, this.nodes.at(-1));
		for(const [variable, token] of this.variables){
			if(runtime.getCurrentScope().variables[variable]) fail(`Variable ${variable} was already declared`, token);
			runtime.getCurrentScope().variables[variable] = {
				type: varType,
				value: varType.getInitValue(runtime, configs.initialization.normal_variables_default.value),
				declaration: this,
				mutable: true,
			};
		}
	}
}
@statement("constant", "CONSTANT x = 1.5", "keyword.constant", "name", "operator.equal_to", "literal") //the equal_to operator is used in this statement, idk why
export class ConstantStatement extends Statement {
	name = this.token(1).text;
	expression = this.token(3);
	run(runtime:Runtime){
		if(runtime.getVariable(this.name)) fail(`Constant ${this.name} was already declared`, this);
		const { type, value } = Runtime.evaluateToken(this.expression)
			?? fail(f.quote`Cannot evaluate expression ${this.expression} in a static context`, this.expression);
		runtime.getCurrentScope().variables[this.name] = {
			type,
			get value(){ return value; },
			set value(value){ crash(`Attempted assignment to constant`); },
			declaration: this,
			mutable: false,
		};
	}
}
@statement("define", "DEFINE PrimesBelow20 (2, 3, 5, 7, 11, 13, 17, 19): myIntegerSet", "keyword.define", "name", "parentheses.open", ".*", "parentheses.close", "punctuation.colon", "name")
export class DefineStatement extends Statement {
	name = this.token(1);
	variableType = this.token(-1);
	values = getUniqueNamesFromCommaSeparatedTokenList(
		this.tokens(3, -3), this.token(-3), expressionLeafNodeTypes
	);
	run(runtime:Runtime){
		const type = runtime.getType(this.variableType.text) ?? fail(`Nonexistent variable type ${this.variableType.text}`, this.variableType);
		if(!(type instanceof SetVariableType)) fail(`DEFINE can only be used on set types, please use a declare statement instead`, this.variableType);
		runtime.getCurrentScope().variables[this.name.text] = {
			type,
			declaration: this,
			mutable: true,
			value: this.values.map(t => (
				Runtime.evaluateToken(t, type.baseType as PrimitiveVariableType)
					?? fail(f.quote`Cannot evaluate token ${t} in a static context`, t)
			).value)
		};
	}
}

@statement("type.pointer", "TYPE IntPointer = ^INTEGER", "keyword.type", "name", "operator.equal_to", "operator.pointer", "type+")
export class TypePointerStatement extends TypeStatement {
	name = this.token(1).text;
	targetType = processTypeData(this.expr(4, "type"));
	createType(runtime:Runtime){
		return [this.name, new PointerVariableType(
			false, this.name, this.targetType
		)] as [name: string, type: VariableType<false>];
	}
}
@statement("type.enum", "TYPE Weekend = (Sunday, Saturday)", "keyword.type", "name", "operator.equal_to", "parentheses.open", ".*", "parentheses.close")
export class TypeEnumStatement extends TypeStatement {
	name = this.token(1);
	values = getUniqueNamesFromCommaSeparatedTokenList(this.tokens(4, -1), this.token(-1));
	createType(runtime:Runtime){
		return [this.name.text, new EnumeratedVariableType(
			this.name.text, this.values.map(t => t.text)
		)] as [name: string, type: VariableType<false>];
	}
}
@statement("type.set", "TYPE myIntegerSet = SET OF INTEGER", "keyword.type", "name", "operator.equal_to", "keyword.set", "keyword.of", "name")
export class TypeSetStatement extends TypeStatement {
	name = this.token(1);
	setType = PrimitiveVariableType.get(this.token(5).text)
		?? fail(`Sets of non-primitive types are not supported.`, this.token(5));
	createType(runtime:Runtime){
		return [this.name.text, new SetVariableType(
			false, this.name.text, this.setType
		)] as [name: string, type: VariableType<false>]; //TODO allow sets of UDTs
	}
}
@statement("type", "TYPE StudentData", "block", "auto", "keyword.type", "name")
export class TypeRecordStatement extends TypeStatement {
	name = this.token(1);
	createTypeBlock(runtime:Runtime, node:ProgramASTBranchNode){
		const fields:Record<string, [UnresolvedVariableType, TextRange]> = {};
		for(const statement of node.nodeGroups[0]){
			if(!(statement instanceof DeclareStatement)) fail(`Statements in a record type block can only be declaration statements`, statement);
			statement.variables.forEach(([v, r]) => fields[v] = [statement.varType, r.range]);
		}
		return [this.name.text, new RecordVariableType(false, this.name.text, fields)] as [name: string, type: VariableType<false>];
	}
}
@statement("assignment", "x <- 5", "#", "expr+", "operator.assignment", "expr+")
export class AssignmentStatement extends Statement {
	/** Can be a normal variable name, like [name x], or an array access expression */
	target = this.expr(0);
	@evaluate expression = this.exprT(2);
	constructor(tokens:RangeArray<ExpressionAST>){
		super(tokens);
		if(this.target instanceof Token && isLiteral(this.target.type))
			fail(f.quote`Cannot assign to literal token ${this.target}`, this.target, this);
	}
	run(runtime:Runtime){
		//Handle auto declaration for class variables
		if(this.target instanceof Token && !runtime.getVariable(this.target.text)){
			const {type, value} = runtime.evaluateUntyped(this.expression);
			if(type instanceof ClassVariableType){
				if(configs.statements.auto_declare_classes.value){
					runtime.getCurrentScope().variables[this.target.text] = {
						type, value, declaration: this, mutable: true,
					};
				} else fail(f.quote`Variable ${this.target.text} does not exist\n` + configs.statements.auto_declare_classes.errorHelp, this.target);
			} else runtime.handleNonexistentVariable(this.target.text, this.target);
		}

		runtime.assignExpr(this.target, this.expression);
	}
}
@statement("illegal.assignment", "x = 5", "#", "expr+", "operator.equal_to", "expr+")
export class AssignmentBadStatement extends Statement {
	static invalidMessage = "Use the assignment operator (<-) to assign a value to a variable. The = sign is used to test for equality.";
	static suppressErrors = true;
}
@statement("output", `OUTPUT "message"`, "keyword.output", ".+")
export class OutputStatement extends Statement {
	outMessage = splitTokensOnComma(this.nodes.slice(1) as RangeArray<Token>)
		.map(n => new UntypedNodeValue(parseExpression(n)));
	run(runtime:Runtime){
		runtime._output(this.outMessage.map(expr => runtime.evaluateUntyped(expr)));
	}
}
@statement("input", "INPUT y", "keyword.input", "name")
export class InputStatement extends Statement {
	name = this.token(1).text;
	run(runtime:Runtime){
		const variable = runtime.getVariable(this.name) ?? runtime.handleNonexistentVariable(this.name, this.nodes[1].range);
		if(!variable.mutable) fail(`Cannot INPUT ${this.name} because it is a constant`, this.nodes[1]);
		const input = runtime._input(f.text`Enter the value for variable "${this.name}" (type: ${variable.type})`, variable.type);
		switch(variable.type){
			case PrimitiveVariableType.BOOLEAN:
				variable.value = input.toLowerCase() != "false"; break;
			case PrimitiveVariableType.INTEGER: {
				const value = Number(input);
				if(isNaN(value)) fail(`input was an invalid number`, this);
				if(!Number.isSafeInteger(value)) fail(`input was an invalid integer`, this);
				variable.value = value;
				break; }
			case PrimitiveVariableType.REAL: {
				const value = Number(input);
				if(isNaN(value)) fail(`input was an invalid number`, this);
				if(!Number.isSafeInteger(value)) fail(`input was an invalid integer`, this);
				variable.value = value;
				break; }
			case PrimitiveVariableType.STRING:
				variable.value = input;
				break;
			case PrimitiveVariableType.CHAR:
				if(input.length == 1) variable.value = input;
				else fail(`input was not a valid character: contained more than one character`, this);
				break;
			default:
				fail(f.quote`Cannot INPUT variable of type ${variable.type}`, this);
		}
	}
}
@statement("return", "RETURN z + 5", "keyword.return", "expr+")
export class ReturnStatement extends Statement {
	@evaluate expression = this.exprT(1);
	run(runtime:Runtime){
		const fn = runtime.getCurrentFunction();
		if(!fn) fail(`RETURN is only valid within a function.`, this);
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
			value: runtime.evaluateUntyped(this.expression, runtime.resolveVariableType(type)).value
		};
	}
}
@statement("call", "CALL Func(5)", "keyword.call", "expr+")
export class CallStatement extends Statement {
	func = this.expr(1, [ExpressionASTFunctionCallNode], `CALL can only be used to call functions or procedures`);
	run(runtime:Runtime){
		const func = runtime.evaluateExpr(this.func.functionName, "function");
		if("clazz" in func){
			//Class method
			runtime.callClassMethod(func.method, func.clazz, func.instance, this.func.args, false);
		} else {
			if("name" in func) fail(`CALL cannot be used on builtin functions, because they have no side effects`, this.func);
			if(func.controlStatements[0] instanceof FunctionStatement && !configs.statements.call_functions.value)
				fail(`CALL cannot be used on functions according to Cambridge.\n${configs.statements.call_functions.errorHelp}`, this.func);
			runtime.callFunction(func, this.func.args);
		}
	}
}


@statement("illegal.end", "END", "block_end", "keyword.end", ".*")
export class EndBadStatement extends Statement {
	static invalidMessage:typeof Statement.invalidMessage = (result, context) =>
		[f.quote`Expected a block end statement, like ${context?.controlStatements[0].type.blockEndStatement().example ?? "ENDIF"}`];
}

@statement("if", "IF a < 5 THEN", "block", "auto", "keyword.if", "expr+", "keyword.then")
export class IfStatement extends Statement {
	@evaluate condition = this.exprT(1, "BOOLEAN");
	runBlock(runtime:Runtime, node:ProgramASTBranchNode<"if">){
		if(runtime.evaluate(this.condition)){
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
	//First node group is blank, because it is between the CASE OF and the first case
	@evaluate expression = this.exprT(2);
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
	runBlock(runtime:Runtime, {controlStatements, nodeGroups}:ProgramASTBranchNode<"switch">):void | StatementExecutionResult {
		const { type:switchType, value:switchValue } = runtime.evaluateUntyped(this.expression);
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
	value = this.token(0);
	static blockType:ProgramASTBranchNodeType = "switch";
	branchMatches(switchType:VariableType, switchValue:VariableValue){
		if(this.value.type == "keyword.otherwise") return true;
		//Try to evaluate the case token with the same type as the switch target
		const { value:caseValue } = Runtime.evaluateToken(this.value, switchType)!;
		return switchValue == caseValue;
	}
}
@statement("case.range", "5 TO 10: ", "block_multi_split", "#", "literal", "keyword.to", "literal", "punctuation.colon")
export class CaseBranchRangeStatement extends CaseBranchStatement {
	lowerBound = this.token(0);
	upperBound = this.token(2);
	static blockType:ProgramASTBranchNodeType = "switch";
	static allowedTypes = ["number.decimal", "char"] satisfies TokenType[];
	constructor(tokens:RangeArray<Token>){
		super(tokens);
		if(!CaseBranchRangeStatement.allowedTypes.includes(this.lowerBound.type))
			fail(f.quote`Token of type ${this.lowerBound.type} is not valid in range cases: expected a number or character`, this.lowerBound);
		if(this.lowerBound.type != this.upperBound.type)
			fail(f.quote`Token of type ${this.upperBound.type} does not match the other range bound: expected a ${this.lowerBound.type}`, this.upperBound);
	}
	branchMatches(switchType:VariableType, switchValue:VariableValue){
		if(this.value.type == "keyword.otherwise") return true;
		//Evaluate the case tokens with the same type as the switch target
		const { value:lValue } = Runtime.evaluateToken(this.value, switchType)!;
		const { value:uValue } = Runtime.evaluateToken(this.upperBound, switchType)!;
		return lValue <= switchValue && switchValue <= uValue;
	}
}
@statement("for", "FOR i <- 1 TO 10", "block", "keyword.for", "name", "operator.assignment", "expr+", "keyword.to", "expr+")
export class ForStatement extends Statement {
	name = this.token(1).text;
	@evaluate from = this.exprT(3, "INTEGER");
	@evaluate to = this.exprT(5, "INTEGER");
	empty?:boolean;
	preRun(node:ProgramASTBranchNode<"for">){
		super.preRun();
		this.empty = node.nodeGroups[0].length == 0;
		const endStatement = node.controlStatements[1];
		if(endStatement.name.text !== this.name)
			fail(f.quote`Incorrect NEXT statement: expected variable ${this.name} from for loop, got variable ${endStatement.name.text}`, endStatement.name);
	}
	getStep(runtime:Runtime):number {
		return 1;
	}
	runBlock(runtime:Runtime, node:ProgramASTBranchNode<"for">){

		const from = BigInt(runtime.evaluate(this.from));
		const to = BigInt(runtime.evaluate(this.to));
		const _step = this.getStep(runtime), step = BigInt(_step);
		const direction = Math.sign(_step);
		if(direction == 0)
			fail(`Invalid FOR statement: step cannot be zero`, (this as never as ForStepStatement).step);

		if(
			direction == 1 && to < from ||
			direction == -1 && from < to
		) return;

		if(this.empty){
			for(let i = from; direction == 1 ? i <= to : i >= to; i += step)
				runtime.statementExecuted(this);
		} else {
			for(let i = from; direction == 1 ? i <= to : i >= to; i += step){
				const result = runtime.runBlock(node.nodeGroups[0], {
					statement: this,
					opaque: false,
					variables: {
						//Set the loop variable in the loop scope
						[this.name]: {
							declaration: this,
							mutable: false,
							type: PrimitiveVariableType.INTEGER,
							get value(){ return Number(i); },
							set value(value){ crash(`Attempted assignment to constant`); },
						}
					},
					types: {}
				});
				if(result) return result;
			}
		}
	}
}
@statement("for.step", "FOR x <- 1 TO 20 STEP 2", "block", "keyword.for", "name", "operator.assignment", "expr+", "keyword.to", "expr+", "keyword.step", "expr+")
export class ForStepStatement extends ForStatement {
	@evaluate step = this.exprT(7, "INTEGER");
	getStep(runtime:Runtime):number {
		return runtime.evaluate(this.step);
	}
}
@statement("for.end", "NEXT i", "block_end", "keyword.for_end", "name")
export class ForEndStatement extends Statement {
	static blockType: ProgramASTBranchNodeType = "for";
	name = this.token(1);
}
@statement("illegal.for.end", "NEXT", "block_end", "keyword.for_end")
export class ForEndBadStatement extends Statement {
	static blockType: ProgramASTBranchNodeType = "for";
	static invalidMessage:typeof Statement.invalidMessage = (result, context) =>
		[`Expected ${(context!.controlStatements[0] as ForStatement).name}, got end of line`, (result[0] as Token).rangeAfter()];
}

@statement("while", "WHILE c < 20", "block", "auto", "keyword.while", "expr+")
export class WhileStatement extends Statement {
	@evaluate condition = this.exprT(1, "BOOLEAN");
	runBlock(runtime:Runtime, node:ProgramASTBranchNode<"while">){
		
		//Register the execution of an infinite amount of statements if the condition is constant true
		if(node.nodeGroups[0].length == 0 && this.condition.value === true)
			runtime.statementExecuted(this, Infinity);

		while(runtime.evaluate(this.condition)){
			const result = runtime.runBlock(node.nodeGroups[0], {
				statement: this,
				opaque: false,
				variables: {},
				types: {},
			});
			if(result) return result;
		}
	}
}
@statement("dowhile", "REPEAT", "block", "keyword.dowhile")
export class DoWhileStatement extends Statement {
	runBlock(runtime:Runtime, node:ProgramASTBranchNode<"dowhile">){
		//Register the execution of an infinite amount of statements if the condition is constant true
		if(node.nodeGroups[0].length == 0 && node.controlStatements[1].condition.value === true)
			runtime.statementExecuted(this, Infinity);

		do {
			const result = runtime.runBlock(node.nodeGroups[0], {
				statement: this,
				opaque: false,
				variables: {},
				types: {},
			});
			if(result) return result;
		} while(!runtime.evaluate(node.controlStatements[1].condition));
		//Inverted, the pseudocode statement is "until"
	}
}
@statement("dowhile.end", "UNTIL flag = false", "block_end", "keyword.dowhile_end", "expr+")
export class DoWhileEndStatement extends Statement {
	@evaluate condition = this.exprT(1, "BOOLEAN");
	static blockType: ProgramASTBranchNodeType = "dowhile";
}

@statement("function", "FUNCTION name(arg1: TYPE) RETURNS INTEGER", "block", "auto", "keyword.function", "name", "parentheses.open", ".*", "parentheses.close", "keyword.returns", "type+")
export class FunctionStatement extends Statement {
	/** Mapping between name and type */
	args:FunctionArguments;
	argsRange:TextRange;
	returnType:UnresolvedVariableType;
	returnTypeToken:ExpressionASTTypeNode;
	name:string;
	nameToken:Token;
	constructor(tokens:RangeArray<Token>, offset = 0){
		super(tokens); //for subclasses
		tokens = tokens.slice(offset);
		this.args = parseFunctionArguments(tokens.slice(3, -3));
		this.argsRange = this.args.size > 0 ? getTotalRange(tokens.slice(3, -3)) : tokens[2].rangeAfter();
		this.returnType = processTypeData(tokens.at(-1)!);
		this.returnTypeToken = tokens.at(-1)!;
		this.nameToken = tokens[1];
		this.name = tokens[1].text;
	}
	runBlock(runtime:Runtime, node:FunctionData<"function">){
		runtime.defineFunction(this.name, node, this.nameToken.range);
	}
}

@statement("procedure", "PROCEDURE name(arg1: TYPE)", "block", "auto", "keyword.procedure", "name", "parentheses.open", ".*", "parentheses.close")
export class ProcedureStatement extends Statement {
	/** Mapping between name and type */
	args:FunctionArguments;
	argsRange:TextRange;
	name:string;
	nameToken:Token;
	constructor(tokens:RangeArray<Token>, offset = 0){
		super(tokens); //for subclasses
		tokens = tokens.slice(offset);
		this.args = parseFunctionArguments(tokens.slice(3, -1));
		this.argsRange = this.args.size > 0 ? getTotalRange(tokens.slice(3, -1)) : tokens[2].rangeAfter();
		this.nameToken = tokens[1];
		this.name = tokens[1].text;
	}
	runBlock(runtime:Runtime, node:FunctionData<"procedure">){
		runtime.defineFunction(this.name, node, this.nameToken.range);
	}
}

interface IFileStatement {
	filename: TypedNodeValue<ExpressionAST, "STRING">;
}

@statement("openfile", `OPENFILE "file.txt" FOR READ`, "keyword.open_file", "expr+", "keyword.for", "file_mode")
export class OpenFileStatement extends Statement implements IFileStatement {
	mode = this.token(3);
	@evaluate filename = this.exprT(1, "STRING");
	run(runtime:Runtime){
		const name = runtime.evaluate(this.filename);
		const mode = FileMode(this.mode.type.split("keyword.file_mode.")[1].toUpperCase());
		const file = runtime.fs.getFile(name, mode == "WRITE") ?? fail(f.quote`File ${name} does not exist.`, this);
		if(mode == "READ"){
			runtime.openFiles[name] = {
				file,
				mode,
				lines: file.text.split("\n").slice(0, -1), //the last element will be blank, because all lines end with a newline
				lineNumber: 0,
				openRange: this.range,
			};
		} else if(mode == "RANDOM"){
			fail(`Not yet implemented`, this.mode);
		} else {//mode == "APPEND" | "WRITE"
			if(mode == "WRITE") file.text = ""; //Clear the file so it can be overwritten
			runtime.openFiles[name] = {
				file,
				mode,
				openRange: this.range,
			};
		}
	}
}
@statement("closefile", `CLOSEFILE "file.txt"`, "keyword.close_file", "expr+")
export class CloseFileStatement extends Statement implements IFileStatement {
	@evaluate filename = this.exprT(1, "STRING");
	run(runtime:Runtime){
		const name = runtime.evaluate(this.filename);
		if(runtime.openFiles[name]) runtime.openFiles[name] = undefined;
		else if(name in runtime.openFiles) fail(f.quote`Cannot close file ${name}, because it has already been closed.`, this);
		else fail(f.quote`Cannot close file ${name}, because it was never opened.`, this);
	}
}
@statement("readfile", `READFILE "file.txt", OutputVar`, "keyword.read_file", "expr+", "punctuation.comma", "expr+")
export class ReadFileStatement extends Statement implements IFileStatement {
	@evaluate filename = this.exprT(1, "STRING");
	output = this.expr(3);
	run(runtime:Runtime){
		const name = runtime.evaluate(this.filename);
		const data = runtime.getOpenFile(name, ["READ"], `Reading from a file with READFILE`);
		if(data.lineNumber >= data.lines.length) fail(`End of file reached\nhelp: before attempting to read from the file, check if it has lines left with EOF(filename)`, this);
		const output = runtime.evaluateExpr(this.output, "variable");
		output.value = data.lines[data.lineNumber ++];
	}
}
@statement("writefile", `WRITEFILE "file.txt", "hello world"`, "keyword.write_file", "expr+", "punctuation.comma", "expr+")
export class WriteFileStatement extends Statement implements IFileStatement {
	@evaluate filename = this.exprT(1, "STRING");
	@evaluate data = this.exprT(3, "STRING");
	run(runtime:Runtime){
		const name = runtime.evaluate(this.filename);
		const data = runtime.getOpenFile(name, ["WRITE", "APPEND"], `Writing to a file with WRITEFILE`);
		data.file.text += runtime.evaluate(this.data) + "\n";
	}
}

@statement("seek", `SEEK "file.txt", 5`, "keyword.seek", "expr+", "punctuation.comma", "expr+")
export class SeekStatement extends Statement implements IFileStatement {
	@evaluate filename = this.exprT(1, "STRING");
	@evaluate index = this.exprT(3, "INTEGER");
	run(runtime:Runtime){
		const index = runtime.evaluate(this.index);
		if(index < 0) fail(`SEEK index must be positive`, this.index);
		const name = runtime.evaluate(this.filename);
		const data = runtime.getOpenFile(name, ["RANDOM"], `SEEK statement`);
		fail(`Not yet implemented`, this);
	}
}
@statement("getrecord", `GETRECORD "file.txt", Record`, "keyword.get_record", "expr+", "punctuation.comma", "expr+")
export class GetRecordStatement extends Statement implements IFileStatement {
	@evaluate filename = this.exprT(1, "STRING");
	variable = this.expr(3);
	run(runtime:Runtime){
		const name = runtime.evaluate(this.filename);
		const data = runtime.getOpenFile(name, ["RANDOM"], `GETRECORD statement`);
		const variable = runtime.evaluateExpr(this.variable, "variable");
		fail(`Not yet implemented`, this);
	}
}
@statement("putrecord", `PUTRECORD "file.txt", Record`, "keyword.put_record", "expr+", "punctuation.comma", "expr+")
export class PutRecordStatement extends Statement implements IFileStatement {
	@evaluate filename = this.exprT(1, "STRING");
	variable = this.expr(3);
	run(runtime:Runtime){
		const name = runtime.evaluate(this.filename);
		const data = runtime.getOpenFile(name, ["RANDOM"], `PUTRECORD statement`);
		const { type, value } = runtime.evaluateExpr(this.variable);
		fail(`Not yet implemented`, this);
	}
}

class ClassMemberStatement {
	accessModifierToken: Token;
	accessModifier: "public" | "private";
	constructor(tokens:RangeArray<ExpressionASTNodeExt>){
		this.accessModifierToken = tokens[0] as Token;
		this.accessModifier = this.accessModifierToken.type.split("keyword.class_modifier.")[1] as "public" | "private";
	}
	run(){
		crash(`Class sub-statements cannot be run normally`);
	}
	runBlock(){
		crash(`Class sub-statements cannot be run normally`);
	}
}

@statement("class", "CLASS Dog", "block", "auto", "keyword.class", "name")
export class ClassStatement extends TypeStatement {
	static allowOnly = new Set<StatementType>(["class_property", "class_procedure", "class_function", "class.end"]);
	name = this.token(1);
	initializeClass(runtime:Runtime, branchNode:ProgramASTBranchNode):ClassVariableType<false> {
		const classData = new ClassVariableType(false, this);
		for(const node of branchNode.nodeGroups[0]){
			if(node instanceof ProgramASTBranchNode){
				if(node.controlStatements[0] instanceof ClassFunctionStatement || node.controlStatements[0] instanceof ClassProcedureStatement){
					const method = node.controlStatements[0];
					if(classData.ownMethods[method.name]){
						fail(f.quote`Duplicate declaration of class method ${method.name}`, this, classData.ownMethods[method.name]);
					} else {
						node.controlStatements[0] satisfies (ClassFunctionStatement | ClassProcedureStatement);
						classData.allMethods[method.name] = [
							classData,
							classData.ownMethods[method.name] = node as ClassMethodData
						];
					}
				} else {
					console.error({branchNode, node});
					crash(`Invalid node in class block`);
				}
			} else if(node instanceof ClassPropertyStatement){
				for(const [variable, token] of node.variables){
					if(classData.properties[variable]){
						fail(f.quote`Duplicate declaration of class property ${variable}`, token, classData.properties[variable][1]);
					} else {
						classData.properties[variable] = [node.varType, node];
					}
				}
				classData.propertyStatements.push(node);
			} else {
				console.error({branchNode, node});
				crash(`Invalid node in class block`);
			}
		}
		return classData;
	}
	createTypeBlock(runtime:Runtime, branchNode:ProgramASTBranchNode){
		return [this.name.text, this.initializeClass(runtime, branchNode)] as [name: string, type: VariableType<false>];
	}
}
@statement("class.inherits", "CLASS Dog INHERITS Animal", "block", "keyword.class", "name", "keyword.inherits", "name")
export class ClassInheritsStatement extends ClassStatement {
	superClassName = this.token(3);
	initializeClass(runtime:Runtime, branchNode:ProgramASTBranchNode):ClassVariableType<false> {
		if(this.superClassName.text == this.name.text) fail(`A class cannot inherit from itself`, this.superClassName);
		const baseClass = runtime.getClass(this.superClassName.text, this.superClassName.range);
		const extensions = super.initializeClass(runtime, branchNode);

		//Apply the base class's properties and functions
		extensions.baseClass = baseClass;
		for(const [key, value] of Object.entries(baseClass.properties)){
			if(extensions.properties[key]){
				fail(f.quote`Property ${key} has already been defined in base class ${this.superClassName.text}`, extensions.properties[key][1]);
			} else {
				extensions.properties[key] = value;
			}
		}
		for(const [name, value] of Object.entries(baseClass.allMethods)){
			//If the method has not been overriden, set it to the base class's method
			if(!extensions.ownMethods[name]){
				extensions.allMethods[name] = value;
			}
		}
		return extensions;
	}
}


@statement("class_property", "PUBLIC variable: TYPE", "class_modifier", ".+", "punctuation.colon", "type+")
export class ClassPropertyStatement extends combineClasses(DeclareStatement, ClassMemberStatement) {
	static blockType: ProgramASTBranchNodeType = "class";
}
@statement("class_procedure", "PUBLIC PROCEDURE func(arg1: INTEGER, arg2: pDATE)", "block", "class_modifier", "keyword.procedure", "name", "parentheses.open", ".*", "parentheses.close")
export class ClassProcedureStatement extends combineClasses(ProcedureStatement, ClassMemberStatement) {
	methodKeywordToken = this.token(1);
	static blockType: ProgramASTBranchNodeType = "class";
	constructor(tokens:RangeArray<Token>){
		super(tokens, 1);
	}
	preRun(node:ProgramASTBranchNode<"class_procedure">){
		if(this.name == "NEW" && this.accessModifier == "private")
			fail(`Constructors cannot be private, because running private constructors is impossible`, this.accessModifierToken);
		//TODO can they actually be run from subclasses?
	}
}
@statement("class_procedure.end", "ENDPROCEDURE", "block_end", "keyword.procedure_end")
export class ClassProcedureEndStatement extends Statement {}
@statement("class_function", "PUBLIC FUNCTION func(arg1: INTEGER, arg2: pDATE) RETURNS INTEGER", "block", "class_modifier", "keyword.function", "name", "parentheses.open", ".*", "parentheses.close", "keyword.returns", "type+")
export class ClassFunctionStatement extends combineClasses(FunctionStatement, ClassMemberStatement) {
	methodKeywordToken = this.token(1);
	static blockType: ProgramASTBranchNodeType = "class";
	constructor(tokens:RangeArray<Token>){
		super(tokens, 1);
	}
}
@statement("class_function.end", "ENDFUNCTION", "block_end", "keyword.function_end")
export class ClassFunctionEndStatement extends Statement {}

finishStatements();
