/* @license
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the base Statement class, which all the other statements extend.
*/

import { Token } from "../lexer/lexer-types.js";
import { ExpressionAST, ExpressionASTLeafNode, ExpressionASTNodes, ExpressionASTTypeNode, ExpressionASTTypeNodes, ProgramASTBranchNode, ProgramASTBranchNodeType, ProgramASTNodeGroup, StatementNode, TokenMatcher } from "../parser/parser-types.js";
import { StatementCheckTokenRange } from "../parser/parser.js";
import { NodeValue, PrimitiveVariableTypeName, TypedNodeValue, UntypedNodeValue, VariableType } from "../runtime/runtime-types.js";
import { Runtime } from "../runtime/runtime.js";
import { Abstract, crash, fail, getTotalRange, RangeArray, type IFormattable } from "../utils/funcs.js";
import type { TextRange, TextRanged } from "../utils/types.js";
import { statements } from "./registry.js";
import { LegalStatementType, StatementCategory, StatementExecutionResult, StatementType } from "./statement-types.js";


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
	constructor(public nodes:RangeArray<StatementNode>){
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
	tokens(from:number, to?:number):RangeArray<Token> {
		const tokens = this.nodes.slice(from, to);
		tokens.forEach((t, i) =>
			t instanceof Token || crash(`Assertion failed: node at index ${i} was not a token`)
		);
		return tokens as RangeArray<Token>;
	}
	/** Returns the node at `ind` and asserts that it is an ExpressionASTLeafNode. */
	eleaf(ind:number):ExpressionASTLeafNode {
		const node = this.nodes.at(ind);
		if(node instanceof ExpressionASTLeafNode) return node;
		else crash(`Assertion failed: node at index ${ind} was not an ExpressionASTLeafNode`);
	}
	/** Returns the nodes from `from` to `to` (exclusive) and asserts that they are all ExpressionASTLeafNodes. */
	eleafs(from:number, to?:number):RangeArray<ExpressionASTLeafNode> {
		const tokens = this.nodes.slice(from, to);
		tokens.forEach((t, i) =>
			t instanceof ExpressionASTLeafNode || crash(`Assertion failed: node at index ${i} was not a token`)
		);
		return tokens as RangeArray<ExpressionASTLeafNode>;
	}
	/** Returns the node at `ind` as a TypedNodeValue. */
	tokenT<InputType extends PrimitiveVariableTypeName | VariableType>(ind:number, type:InputType):TypedNodeValue<ExpressionASTLeafNode, InputType> {
		return new TypedNodeValue(this.eleaf(ind), type);
	}
	/** Returns the node at `ind` and asserts that it is an expression. */
	expr(ind:number):ExpressionAST;
	/** Returns the node at `ind` and asserts that it is an expression. */
	expr(ind:number, allowed:"expr", error?:string):ExpressionAST;
	/** Returns the node at `ind` and asserts that it is a type. */
	expr(ind:number, allowed:"type", error?:string):ExpressionASTTypeNode;
	/** Returns the node at `ind` and asserts that it is one of the given types. */
	expr<Type extends new (...args:any[]) => {}>(ind:number, allowed:Type[], error?:string):InstanceType<Type>;
	/** Returns the node at `ind` and asserts that it is one of the given types. */
	expr<Type extends new (...args:any[]) => {}, ValidatedType extends StatementNode>(ind:number, allowed:Type[], error:string | undefined, extraValidator:(node:StatementNode) => node is ValidatedType):InstanceType<Type> & ValidatedType;
	/** Returns the node at `ind` and asserts that it is one of the given types. */
	expr<Type extends new (...args:any[]) => {}>(ind:number, allowed:Type[], error:string | undefined, extraValidator:(node:StatementNode) => boolean):InstanceType<Type>;
	expr(ind:number, allowed:"expr" | "type" | readonly (new (...args:any[]) => {})[] = "expr", error?:string | undefined, extraValidator:(node:StatementNode) => boolean = () => true):StatementNode {
		if(allowed === "type") allowed = ExpressionASTTypeNodes;
		if(allowed === "expr") allowed = ExpressionASTNodes;

		if(allowed.find(c => this.nodes.at(ind) instanceof c) && extraValidator(this.nodes.at(ind)!))
			return this.nodes.at(ind) as ExpressionAST;

		if(error != undefined) fail(error, this.nodes.at(ind));
		else {
			console.error(this.nodes, extraValidator.toString());
			crash(`Assertion failed: node at index ${ind} was not an expression`);
		}
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
			"do_while": "REPEAT",
			"do_while.end": "UNTIL",
			"function": "FUNCTION",
			"function.end": "ENDFUNCTION",
			"procedure": "PROCEDURE",
			"procedure.end": "ENDPROCEDURE",
			"open_file": "OPENFILE",
			"read_file": "READFILE",
			"write_file": "WRITEFILE",
			"close_file": "CLOSEFILE",
			"seek": "SEEK",
			"get_record": "GETRECORD",
			"put_record": "PUTRECORD",
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
		return invalidMessage != null ? tokens.filter(t => [".*" , ".+" , "expr+" , "type+"].includes(t)).length * 100 - tokens.length : 10000;
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
	static requiresScope = false;
	static interruptsControlFlow = false;
	/** True if a return from this statement causes the block to return, like an IF or FOR block statement. False for functions and classes, which do not execute their code. */
	static propagatesControlFlowInterruptions = true;
	/**
	 * This function is called once before execution starts, and is passed the parent group, and the closest branch node if it exists.
	 * Must tell the group if this statement requires a scope, or is a type statement, or interrupts control flow by returning, even if recursively.
	 * The default implementation tries to evaluate evaluatable fields.
	 **/
	preRun(group:ProgramASTNodeGroup, node?:ProgramASTBranchNode){
		if(this.type.requiresScope) group.requiresScope = true;
		if(this.type.interruptsControlFlow) group.hasReturn = true;

		for(const field of this.type.evaluatableFields){
			//Safety: checked in the decorator
			const nodeValue = (this as never as Record<typeof field, NodeValue>)[field];
			if(!(nodeValue instanceof TypedNodeValue || nodeValue instanceof UntypedNodeValue)) crash(`Decorated invalid field ${field}`);
			nodeValue.init();
		}
	}
	triggerPreRun(group:ProgramASTNodeGroup, node?:ProgramASTBranchNode){
		if(!this.preRunDone) this.preRun(group, node);
		this.preRunDone = true;
	}
}
