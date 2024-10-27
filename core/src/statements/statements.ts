/* @license
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the definitions for every statement type supported by Soodocode.
*/


import { configs } from "../config/index.js";
import { Token, TokenType } from "../lexer/index.js";
import { ExpressionAST, ExpressionASTFunctionCallNode, ExpressionASTNodeExt, ExpressionASTTypeNode, getUniqueNamesFromCommaSeparatedTokenList, isLiteral, literalTypes, parseExpression, parseFunctionArguments, processTypeData, ProgramASTBranchNode, ProgramASTBranchNodeType, ProgramASTNodeGroup, splitTokensOnComma } from "../parser/index.js";
import { ClassMethodData, ClassVariableType, ConstantData, EnumeratedVariableType, FileMode, FunctionData, PointerVariableType, PrimitiveVariableType, RecordVariableType, SetVariableType, TypedNodeValue, UnresolvedVariableType, UntypedNodeValue, VariableScope, VariableType, VariableValue } from "../runtime/runtime-types.js";
import { Runtime } from "../runtime/runtime.js";
import { combineClasses, crash, enableConfig, f, fail, getTotalRange, RangeArray } from "../utils/funcs.js";
import type { TextRange } from "../utils/types.js";
import { evaluate, finishStatements, statement } from "./decorators.js";
import { FunctionArguments, StatementExecutionResult, StatementType } from "./statement-types.js";
import { Statement } from "./statement.js";

export abstract class TypeStatement extends Statement {
	preRun(group:ProgramASTNodeGroup, node?:ProgramASTBranchNode){
		super.preRun(group, node);
	}
	createType(runtime:Runtime):readonly [name:string, type:VariableType<false>] {
		crash(`Missing runtime implementation for type initialization for statement ${this.stype}`);
	}
	createTypeBlock(runtime:Runtime, block:ProgramASTBranchNode):readonly [name:string, type:VariableType<false>] {
		crash(`Missing runtime implementation for type initialization for statement ${this.stype}`);
	}
}

@statement("declare", "DECLARE variable: TYPE", "keyword.declare", ".+", "punctuation.colon", "type+")
export class DeclareStatement extends Statement {
	static requiresScope = true;
	varType = this.expr(-1, "type");
	variables:[string, Token][] = getUniqueNamesFromCommaSeparatedTokenList(
		this.tokens(1, -2), this.token(-2)
	).map(t => [t.text, t] as [string, Token]);
	run(runtime:Runtime){
		const varType = runtime.resolveVariableType(processTypeData(this.varType));
		if(varType instanceof SetVariableType) fail({
			summary: `Cannot declare a set variable with the DECLARE statement`,
			help: [f.range`use the DEFINE statement instead, like this:\nDEFINE ${this.variables[0][0]} (your comma-separated values here): ${this.expr(-1, "type")}`]
		}, this.nodes.at(-1));
		for(const [variable, token] of this.variables){
			runtime.defineVariable(variable, {
				type: varType,
				name: variable,
				value: varType.getInitValue(runtime, configs.initialization.normal_variables_default.value),
				declaration: this,
				mutable: true,
			}, token);
		}
	}
}
@statement("constant", "CONSTANT x = 1.5", "keyword.constant", "name", "operator.equal_to", "literal") //the equal_to operator is used in this statement, idk why
export class ConstantStatement extends Statement {
	static requiresScope = true;
	name = this.token(1).text;
	expression = this.token(3);
	preRun(group: ProgramASTNodeGroup, node?:ProgramASTBranchNode){
		super.preRun(group, node);
		group.hasTypesOrConstants = true;
	}
	run(runtime:Runtime){
		if(runtime.getVariable(this.name)) fail(`Constant ${this.name} was already declared`, this);
		const { type, value } = Runtime.evaluateToken(this.expression)
			?? crash(`evaluation of literals cannot fail`);
		runtime.getCurrentScope().variables[this.name] = {
			type,
			name: this.name,
			get value(){ return value; },
			set value(value){ crash(`Attempted assignment to constant`); },
			declaration: this,
			mutable: false,
		};
	}
}
@statement("define", "DEFINE PrimesBelow20 (2, 3, 5, 7, 11, 13, 17, 19): myIntegerSet", "keyword.define", "name", "parentheses.open", ".*", "parentheses.close", "punctuation.colon", "name")
export class DefineStatement extends Statement {
	static requiresScope = true;
	name = this.token(1);
	variableTypeToken = this.token(-1);
	variableType = processTypeData(this.variableTypeToken);
	values = getUniqueNamesFromCommaSeparatedTokenList(
		this.tokens(3, -3), this.token(-3), literalTypes
	);
	run(runtime:Runtime){
		const type = runtime.resolveVariableType(this.variableType);
		if(!(type instanceof SetVariableType)) fail({
			summary: `DEFINE can only be used on set types`,
			help: `use a DECLARE statement instead`
		}, this.variableTypeToken);
		runtime.defineVariable(this.name.text, {
			type,
			name: this.name.text,
			declaration: this,
			mutable: true,
			value: this.values.map(t => (
				Runtime.evaluateToken(t, type.baseType as PrimitiveVariableType)
					?? crash(`evaluating a literal token cannot fail`)
			).value)
		}, this.name);
	}
}

@statement("type.pointer", "TYPE IntPointer = ^INTEGER", "keyword.type", "name", "operator.equal_to", "operator.pointer", "type+")
export class TypePointerStatement extends TypeStatement {
	name = this.token(1).text;
	targetType = processTypeData(this.expr(4, "type"));
	createType(runtime:Runtime){
		return [this.name, new PointerVariableType(
			false, this.name, this.targetType, this.range
		)] as const;
	}
}
@statement("type.enum", "TYPE Weekend = (Sunday, Saturday)", "keyword.type", "name", "operator.equal_to", "parentheses.open", ".*", "parentheses.close")
export class TypeEnumStatement extends TypeStatement {
	name = this.token(1);
	values = getUniqueNamesFromCommaSeparatedTokenList(this.tokens(4, -1), this.token(-1));
	createType(runtime:Runtime){
		return [this.name.text, new EnumeratedVariableType(
			this.name.text, this.values.map(t => t.text)
		)] as const;
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
		)] as const; //TODO allow sets of UDTs
	}
}
@statement("type", "TYPE StudentData", "block", "auto", "keyword.type", "name")
export class TypeRecordStatement extends TypeStatement {
	name = this.token(1);
	static propagatesControlFlowInterruptions = false;
	static allowOnly = new Set<StatementType>(["declare"]);
	createTypeBlock(runtime:Runtime, node:ProgramASTBranchNode){
		const fields:Record<string, [UnresolvedVariableType, TextRange]> = Object.create(null);
		for(const statement of node.nodeGroups[0]){
			if(!(statement instanceof DeclareStatement)) crash(`allowOnly is ["declare"]`);
			statement.variables.forEach(([v, r]) => fields[v] = [processTypeData(statement.varType), r.range]);
		}
		return [this.name.text, new RecordVariableType(false, this.name.text, fields)] as const;
	}
}
@statement("assignment", "x <- 5", "#", "expr+", "operator.assignment", "expr+")
export class AssignmentStatement extends Statement {
	static requiresScope = configs.statements.auto_declare_classes.value;
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
						name: this.target.text, declaration: this,
						mutable: true,
						type, value,
					};
				} else fail({
					summary: f.quote`Variable ${this.target.text} does not exist`,
					help: {
						message: `to automatically declare the variable`,
						config: configs.statements.auto_declare_classes,
						value: true,
					}
				}, this.target, this);
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
		if(!variable.mutable) fail(f.quote`Cannot INPUT ${this.name} because it is immutable`, this.nodes[1], this);
		const input = runtime._input(f.text`Enter the value for variable "${this.name}" (type: ${variable.type})`, variable.type);
		switch(variable.type){
			case PrimitiveVariableType.BOOLEAN:
				if(input.toLowerCase() == "false") variable.value = false;
				else if(input.toLowerCase() == "true") variable.value = true;
				else fail(`input was an invalid boolean`, this);
				break;
			case PrimitiveVariableType.INTEGER: {
				if(input.trim().length == 0) fail(`input was empty`, this);
				const value = Number(input);
				if(isNaN(value)) fail(`input was an invalid number`, this);
				if(!Number.isSafeInteger(value)) fail(`input was an invalid integer`, this);
				variable.value = value;
				break; }
			case PrimitiveVariableType.REAL: {
				if(input.trim().length == 0) fail(`input was empty`, this);
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
	static interruptsControlFlow = true;
	@evaluate expression = this.exprT(1);
	run(runtime:Runtime){
		const fn = runtime.getCurrentFunction();
		if(!fn) fail(`RETURN is only valid within a function.`, this);
		let type;
		if(fn instanceof ProgramASTBranchNode){
			const statement = fn.controlStatements[0];
			if(statement instanceof ProcedureStatement) fail(`Procedures cannot return a value.`, this);
			type = statement.returnType();
		} else {
			if(fn instanceof ClassProcedureStatement) fail(`Procedures cannot return a value.`, this);
			type = fn.returnType();
		}
		return {
			type: "function_return" as const,
			value: runtime.evaluateUntyped(this.expression, runtime.resolveVariableType(type))
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
				fail({
					summary: `CALL cannot be used on functions.`,
					elaboration: `Cambridge says so in section 8.2 of the official pseudocode guide.`,
					help: enableConfig(configs.statements.call_functions)
				}, this.func);
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
		const scope:VariableScope = {
			statement: this,
			opaque: false,
			variables: Object.create(null),
			types: Object.create(null),
		};
		if(runtime.evaluate(this.condition)){
			return runtime.runBlock(node.nodeGroups[0], true, scope);
		} else if(node.controlStatements[1] instanceof ElseStatement && node.nodeGroups[1]){
			return runtime.runBlock(node.nodeGroups[1], true, scope);
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
					return runtime.runBlock(nodeGroups[i] ?? crash(`Missing node group in switch block`), true, {
						statement: this,
						opaque: false,
						variables: Object.create(null),
						types: Object.create(null),
					});
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
			fail({
				summary: f.range`Range bound ${this.lowerBound} is not valid`,
				elaboration: `expected a number or character`
			}, this.lowerBound);
		if(this.lowerBound.type != this.upperBound.type){
			const lowerBoundType = this.lowerBound.type == "number.decimal" ? `number` : `char`;
			const upperBoundType = this.upperBound.type == "number.decimal" ? `number` : `char`;
			fail({
				summary: f.quote`Range bound ${this.upperBound} is not valid`,
				elaboration: [
					f.range`the other range bound (${this.lowerBound}) was a ${lowerBoundType}`,
					f.range`expected another ${lowerBoundType}, not a ${upperBoundType}`
				]
			}, this.upperBound);
		}
	}
	branchMatches(switchType:VariableType, switchValue:VariableValue){
		if(this.value.type == "keyword.otherwise") return true;
		//Evaluate the case tokens with the same type as the switch target
		const { value:lValue } = Runtime.evaluateToken(this.lowerBound, switchType)!;
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
	preRun(group:ProgramASTNodeGroup, node:ProgramASTBranchNode<"for">){
		super.preRun(group, node);
		this.empty = node.nodeGroups[0].length == 0;
		const endStatement = node.controlStatements[1];
		if(endStatement.name.text !== this.name)
			fail({
				summary: f.quote`Incorrect NEXT statement`,
				elaboration: [
					`the variables in the FOR statement and NEXT statement should match`,
					f.quote`expected variable ${this.name} from for loop, got variable ${endStatement.name}`
				]
			}, endStatement.name);
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
			runtime.statementExecuted(this, Number(to - from) / _step);
			return;
		}
		
		const variable:ConstantData = {
			declaration: this,
			name: this.name,
			mutable: false,
			type: PrimitiveVariableType.INTEGER,
			value: null!,
		};
		if(node.nodeGroups[0].simple()){
			//The contents do not have any types or declarations, so the scope does not need to be reset
			//Use the same scope for all loop iterations
			const scope:VariableScope = {
				statement: this,
				opaque: false,
				variables: Object.setPrototypeOf({
					[this.name]: variable
				}, null),
				types: Object.create(null),
			};
			runtime.scopes.push(scope);
			for(
				let i = from;
				direction == 1 ? i <= to : i >= to;
				i += step
			){
				variable.value = Number(i);
				runtime.runBlockFast(node.nodeGroups[0]);
			}
			runtime.scopes.pop();
		} else {
			for(let i = from; direction == 1 ? i <= to : i >= to; i += step){
				variable.value = Number(i);
				const result = runtime.runBlock(node.nodeGroups[0], false, {
					statement: this,
					opaque: false,
					//Set the loop variable in the loop scope
					variables: Object.setPrototypeOf({
						[this.name]: variable
					}, null),
					types: Object.create(null)
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
			const result = runtime.runBlock(node.nodeGroups[0], true, {
				statement: this,
				opaque: false,
				variables: Object.create(null),
				types: Object.create(null),
			});
			if(result) return result;
		}
	}
}
@statement("do_while", "REPEAT", "block", "keyword.do_while")
export class DoWhileStatement extends Statement {
	runBlock(runtime:Runtime, node:ProgramASTBranchNode<"do_while">){
		//Register the execution of an infinite amount of statements if the condition is constant false
		if(node.nodeGroups[0].length == 0 && node.controlStatements[1].condition.value === false)
			runtime.statementExecuted(this, Infinity);

		do {
			const result = runtime.runBlock(node.nodeGroups[0], true, {
				statement: this,
				opaque: false,
				variables: Object.create(null),
				types: Object.create(null),
			});
			if(result) return result;
		} while(!runtime.evaluate(node.controlStatements[1].condition));
		//Inverted, the pseudocode statement is "until"
	}
}
@statement("do_while.end", "UNTIL flag = false", "block_end", "keyword.dowhile_end", "expr+")
export class DoWhileEndStatement extends Statement {
	@evaluate condition = this.exprT(1, "BOOLEAN");
	static blockType: ProgramASTBranchNodeType = "do_while";
}

@statement("function", "FUNCTION name(arg1: TYPE) RETURNS INTEGER", "block", "auto", "keyword.function", "name", "parentheses.open", ".*", "parentheses.close", "keyword.returns", "type+")
export class FunctionStatement extends Statement {
	/** Mapping between name and type */
	args:FunctionArguments;
	argsRange:TextRange;
	returnTypeNode:ExpressionASTTypeNode;
	name:string;
	nameToken:Token;
	static propagatesControlFlowInterruptions = false;
	constructor(tokens:RangeArray<Token>, offset = 0){
		super(tokens); //for subclasses
		tokens = tokens.slice(offset);
		this.args = parseFunctionArguments(tokens.slice(3, -3));
		this.argsRange = this.args.size > 0 ? getTotalRange(tokens.slice(3, -3)) : tokens[2].rangeAfter();
		this.returnTypeNode = tokens.at(-1)!;
		this.nameToken = tokens[1];
		this.name = tokens[1].text;
	}
	returnType():UnresolvedVariableType { return processTypeData(this.returnTypeNode); }
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
	static propagatesControlFlowInterruptions = false;
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

@statement("open_file", `OPENFILE "file.txt" FOR READ`, "keyword.open_file", "expr+", "keyword.for", "file_mode")
export class OpenFileStatement extends Statement implements IFileStatement {
	mode = this.token(3);
	@evaluate filename = this.exprT(1, "STRING");
	run(runtime:Runtime){
		const name = runtime.evaluate(this.filename);
		const mode = FileMode(this.mode.type.split("keyword.file_mode.")[1].toUpperCase());
		const file = runtime.fs.openFile(name, ["WRITE", "APPEND"].includes(mode))
			?? fail(f.quote`File ${name} does not exist.`, this.filename);
		if(runtime.openFiles[name]) fail(f.quote`File ${name} has already been opened.`, this.filename);
		if(mode == "READ"){
			runtime.openFiles[name] = {
				...file,
				mode,
				lines: file.text.split("\n").slice(0, -1), //the last element will be blank, because all lines end with a newline
				lineNumber: 0,
				openRange: this.range,
			};
		} else if(mode == "RANDOM"){
			fail(`Not yet implemented`, this.mode);
		} else {//mode == "APPEND" | "WRITE"
			runtime.openFiles[name] = {
				name: file.name,
				text: mode == "APPEND" ? file.text : "",
				mode,
				openRange: this.range,
			};
		}
	}
}
@statement("close_file", `CLOSEFILE "file.txt"`, "keyword.close_file", "expr+")
export class CloseFileStatement extends Statement implements IFileStatement {
	@evaluate filename = this.exprT(1, "STRING");
	run(runtime:Runtime){
		const name = runtime.evaluate(this.filename);
		const openFile = runtime.openFiles[name];
		if(openFile){
			if(["WRITE", "APPEND", "RANDOM"].includes(openFile.mode)){
				//Flush buffered writes to the file system
				//File must exist because it was opened
				runtime.fs.updateFile(name, openFile.text);
			}
			runtime.openFiles[name] = undefined;
			runtime.fs.closeFile(name);
		} else if(name in runtime.openFiles){
			fail(f.quote`File ${name} has already been closed, cannot close it again`, this);
		} else {
			fail(f.quote`File ${name} was never opened, cannot close it`, this);
		}
	}
}
@statement("read_file", `READFILE "file.txt", OutputVar`, "keyword.read_file", "expr+", "punctuation.comma", "expr+")
export class ReadFileStatement extends Statement implements IFileStatement {
	@evaluate filename = this.exprT(1, "STRING");
	output = this.expr(3);
	run(runtime:Runtime){
		const name = runtime.evaluate(this.filename);
		const data = runtime.getOpenFile(name, ["READ"], `Reading from a file with READFILE`);
		if(data.lineNumber >= data.lines.length)
			fail({
				summary: `End of file reached`,
				help: `before attempting to read from the file, check if it has lines left with the EOF function, like "EOF(filename)"`
			}, this);
		const output = runtime.evaluateExpr(this.output, "variable");
		output.value = data.lines[data.lineNumber ++];
	}
}
@statement("write_file", `WRITEFILE "file.txt", "hello world"`, "keyword.write_file", "expr+", "punctuation.comma", "expr+")
export class WriteFileStatement extends Statement implements IFileStatement {
	@evaluate filename = this.exprT(1, "STRING");
	@evaluate data = this.exprT(3, "STRING");
	run(runtime:Runtime){
		const name = runtime.evaluate(this.filename);
		const data = runtime.getOpenFile(name, ["WRITE", "APPEND"], `Writing to a file with WRITEFILE`);
		//Note: writes are buffered, and are only saved when the file is closed.
		data.text += runtime.evaluate(this.data) + "\n";
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
@statement("get_record", `GETRECORD "file.txt", Record`, "keyword.get_record", "expr+", "punctuation.comma", "expr+")
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
@statement("put_record", `PUTRECORD "file.txt", Record`, "keyword.put_record", "expr+", "punctuation.comma", "expr+")
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
	name = this.token(1);
	static allowOnly = new Set<StatementType>(["class_property", "class_procedure", "class_function"]);
	static propagatesControlFlowInterruptions = false;
	createClass(runtime:Runtime, branchNode:ProgramASTBranchNode):ClassVariableType<false> {
		const classData = new ClassVariableType(false, this);
		for(const node of branchNode.nodeGroups[0]){
			if(node instanceof ProgramASTBranchNode){
				if(node.controlStatements[0] instanceof ClassFunctionStatement || node.controlStatements[0] instanceof ClassProcedureStatement){
					const method = node.controlStatements[0];
					if(classData.ownMethods[method.name]){
						fail(f.quote`Duplicate declaration of class method ${method.name}`, method.nameToken, method);
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
						fail(f.quote`Duplicate declaration of class property ${variable}`, token, node);
					} else {
						classData.properties[variable] = [processTypeData(node.varType), node, token];
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
		return [this.name.text, this.createClass(runtime, branchNode)] as [name: string, type: VariableType<false>];
	}
}
@statement("class.inherits", "CLASS Dog INHERITS Animal", "block", "keyword.class", "name", "keyword.inherits", "name")
export class ClassInheritsStatement extends ClassStatement {
	superClassName = this.token(3);
	createClass(runtime:Runtime, branchNode:ProgramASTBranchNode):ClassVariableType<false> {
		if(this.superClassName.text == this.name.text) fail(`A class cannot inherit from itself`, this.superClassName, this);
		const baseClass = runtime.getClass(this.superClassName.text, this.superClassName.range, this);
		const extensions = super.createClass(runtime, branchNode);

		//Apply the base class's properties and functions
		extensions.baseClass = baseClass;
		for(const [key, value] of Object.entries(baseClass.properties)){
			if(extensions.properties[key]){
				fail(f.quote`Property ${key} has already been declared in the base class, cannot declare it again`, extensions.properties[key][2], extensions.properties[key][1]);
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
	preRun(group:ProgramASTNodeGroup, node:ProgramASTBranchNode<"class_procedure">){
		super.preRun(group, node);
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
