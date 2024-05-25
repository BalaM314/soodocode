/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the types for the parser.
*/

import type { Token, RangeArray, TokenType } from "./lexer-types.js";
import type { Statement } from "./statements.js";
import type { ClassProperties, IFormattable, PartialKey, TextRange, TextRanged } from "./types.js";
import { crash, f, getTotalRange } from "./utils.js";


/** Represents an expression tree. */
export type ExpressionAST = ExpressionASTNode;
/** Represents a single node in an expression AST. */
export type ExpressionASTNode = ExpressionASTLeafNode | ExpressionASTBranchNode | ExpressionASTFunctionCallNode | ExpressionASTArrayAccessNode | ExpressionASTClassInstantiationNode;
/** Represents a leaf node (node with no child nodes) in an expression AST. */
export type ExpressionASTLeafNode = Token;
/** Represents a branch node (node with child nodes) in an expression AST. */
export class ExpressionASTBranchNode implements TextRanged, IFormattable {
	range: TextRange;
	constructor(
		public operatorToken: Token,
		public operator: Operator,
		public nodes: RangeArray<ExpressionAST>,
		public allTokens: RangeArray<Token>,
	){
		this.range = getTotalRange(allTokens);
	}
	toString(){
		return this.allTokens.map(t => t.text).join(" ");
	}
	fmtText():string {
		if(this.operator.type.startsWith("unary_prefix")){
			return `(${this.operatorToken.text} ${this.nodes[0].fmtText()})`;
		} else if(this.operator.type.startsWith("unary_postfix")){
			return `(${this.nodes[0].fmtText()} ${this.operatorToken.text})`;
		} else { //binary operator
			return `(${this.nodes[0].fmtText()} ${this.operatorToken.text} ${this.nodes[1].fmtText()})`;
		}
	}
	fmtDebug():string {
		return `[${this.operator.name} ${this.nodes.map(n => n.fmtDebug()).join(" ")}]`;
	}
}
export class ExpressionASTFunctionCallNode implements TextRanged, IFormattable {
	range: TextRange;
	constructor(
		public functionName: ExpressionASTLeafNode | ExpressionASTBranchNode,
		public args: RangeArray<ExpressionAST>,
		public allTokens: RangeArray<Token>,
	){
		this.range = getTotalRange(allTokens);
	}
	toString(){
		return this.allTokens.map(t => t.text).join(" ");
	}
	fmtText():string {
		return f.text`${this.functionName}(${this.args.map(n => n.fmtText()).join(", ")})`;
	}
	fmtDebug():string {
		return f.debug`${this.functionName}(${this.args.map(n => n.fmtDebug()).join(" ")})`;
	}
}
export class ExpressionASTClassInstantiationNode implements TextRanged {
	range: TextRange;
	constructor(
		public className: Token,
		public args: RangeArray<ExpressionAST>,
		public allTokens: RangeArray<Token>,
	){
		this.range = getTotalRange(allTokens);
	}
	toString(){
		return this.allTokens.map(t => t.text).join(" ");
	}
	fmtText():string {
		return `NEW ${this.className.text}(${this.args.map(n => n.fmtText()).join(", ")})`;
	}
	fmtDebug():string {
		return `NEW ${this.className.text}(${this.args.map(n => n.fmtDebug()).join(" ")})`;
	}
}
export class ExpressionASTArrayAccessNode implements TextRanged, IFormattable {
	range: TextRange;
	constructor(
		public target: ExpressionASTNode,
		public indices: RangeArray<ExpressionAST>,
		public allTokens: RangeArray<Token>,
	){
		this.range = getTotalRange(allTokens);
	}
	toString(){
		return this.allTokens.map(t => t.text).join(" ");
	}
	fmtText():string {
		return `${this.target.fmtText()}[${this.indices.map(n => n.fmtText()).join(", ")}]`;
	}
	fmtDebug():string {
		return `${this.target.fmtDebug()}[${this.indices.map(n => n.fmtDebug()).join(" ")}]`;
	}
}
/** Represents a special node that represents an array type, such as `ARRAY[1:10, 1:20] OF INTEGER` */
export class ExpressionASTArrayTypeNode implements TextRanged, IFormattable {
	range: TextRange;
	constructor(
		public lengthInformation: [low:ExpressionAST, high:ExpressionAST][] | null, //TODO support expressions here
		public elementType: Token,
		public allTokens: RangeArray<Token>,
	){
		this.range = getTotalRange(allTokens);
	}
	fmtText():string {
		const rangeText = this.lengthInformation ? `[${this.lengthInformation.map(([l, h]) => f.text`${l}:${h}`).join(", ")}]` : "";
		return `ARRAY OF ${this.elementType.text}`;
	}
	fmtDebug():string {
		const rangeText = this.lengthInformation ? `[${this.lengthInformation.map(([l, h]) => `${l.fmtDebug()} : ${h.fmtDebug()}`).join(", ")}]` : "";
		return `ARRAY${rangeText} OF ${this.elementType.fmtDebug()}`;
	}
}
// export class ExpressionASTPointerTypeNode implements TextRanged {
// 	range: TextRange;
// 	constructor(
// 		public targetType: Token,
// 		public allTokens: RangeArray<Token>,
// 	){
// 		this.range = getTotalRange(allTokens);
// 	}
// 	toData(name:string):PointerVariableType {
// 		return new PointerVariableType(
// 			name,
// 			PrimitiveVariableType.get(this.targetType.text) ?? fail(f.quote`Invalid variable type ${this.targetType}`)
// 		);
// 	}
// }
// export class ExpressionASTEnumTypeNode implements TextRanged {
// 	range: TextRange;
// 	constructor(
// 		public values: RangeArray<Token>,
// 		public allTokens: RangeArray<Token>,
// 	){
// 		this.range = getTotalRange(allTokens);
// 	}
// 	toData(name:string):EnumeratedVariableType {
// 		return new EnumeratedVariableType(
// 			name,
// 			this.values.map(t => t.text)
// 		);
// 	}
// }
/** Represents a node that represents a type, which can be either a single token or an array type node. */
export type ExpressionASTTypeNode = Token | ExpressionASTArrayTypeNode;
/** Represents an "extended" expression AST node, which may also be an array type node */
export type ExpressionASTNodeExt = ExpressionASTNode | ExpressionASTArrayTypeNode;

export type OperatorType<T = TokenType> = T extends `operator.${infer N}` ? N extends "minus" ? never : (N | "negate" | "subtract" | "access" | "pointer_reference" | "pointer_dereference") : never;
export type OperatorMode = "binary" | "binary_o_unary_prefix" | "unary_prefix" | "unary_prefix_o_postfix" | "unary_postfix_o_prefix";
export type OperatorCategory = "arithmetic" | "logical" | "string" | "special"; 
export class Operator implements IFormattable {
	token!: TokenType;
	name!: string;
	type!: OperatorMode;
	category!: OperatorCategory;
	constructor(args:ClassProperties<Operator>){
		Object.assign(this, args);
	}
	fmtText(){
		return `${this.name}`; //TODO display name
	}
	fmtDebug(){
		return `Operator [${this.name}] (${this.category} ${this.type})`;
	}
}

/** Lowest to highest. Operators in the same 1D array have the same priority and are evaluated left to right. */
export const operatorsByPriority = ((input:(PartialKey<ClassProperties<Operator>, "type" | "name">)[][]):Operator[][] =>
	input.map(row => row.map(o =>
		new Operator({
			token: o.token,
			category: o.category,
			type: o.type ?? "binary",
			name: o.name ?? o.token,
		})
	))
)([
	[
		{
			token: "operator.or",
			category: "logical"
		}
	],[
		{
			token: "operator.and",
			category: "logical"
		}
	],[
		{
			token: "operator.equal_to",
			category: "logical"
		},{
			token: "operator.not_equal_to",
			category: "logical"
		}
	],[
		{
			token: "operator.less_than",
			category: "logical"
		},{
			token: "operator.less_than_equal",
			category: "logical"
		},{
			token: "operator.greater_than",
			category: "logical"
		},{
			token: "operator.greater_than_equal",
			category: "logical"
		}
	],[
		{
			token: "operator.add",
			category: "arithmetic"
		},{
			name: "operator.subtract",
			token: "operator.minus",
			category: "arithmetic",
			type: "binary_o_unary_prefix"
		},{
			token: "operator.string_concatenate",
			category: "string"
		}
	],[
		{
			token: "operator.multiply",
			category: "arithmetic"
		},{
			token: "operator.divide",
			category: "arithmetic"
		},{
			token: "operator.integer_divide",
			category: "arithmetic"
		},{
			token: "operator.mod",
			category: "arithmetic"
		}
	],
	//no exponentiation operator?
	[
		{
			token: "operator.pointer",
			name: "operator.pointer_reference",
			category: "special",
			type: "unary_prefix_o_postfix"
		},
		{
			token: "operator.not",
			category: "logical",
			type: "unary_prefix"
		},
		{
			token: "operator.minus",
			name: "operator.negate",
			category: "arithmetic",
			type: "unary_prefix"
		},
	],
	[
		{
			token: "operator.pointer",
			name: "operator.pointer_dereference",
			category: "special",
			type: "unary_postfix_o_prefix"
		}
	],
	[
		{
			token: "punctuation.period",
			name: "operator.access",
			category: "special",
		}
	]
	//(function call)
	//(array access)
]);
/** Indexed by OperatorType */
export const operators = Object.fromEntries(
	operatorsByPriority.flat().map(o => [
		o.name.startsWith("operator.") ? o.name.split("operator.")[1] : o.name, o
	] as const)
) as Omit<Record<OperatorType, Operator>, "assignment" | "pointer">;


//TODO process these into class instances
/** Matches one or more tokens when validating a statement. expr+ causes an expression to be parsed, and type+ causes a type to be parsed. Variadic matchers cannot be adjacent, because the matcher after the variadic matcher is used to determine how many tokens to match. */
export type TokenMatcher = TokenType | "." | "literal" | "literal|otherwise" | ".*" | ".+" | "expr+" | "type+" | "file_mode" | "class_modifier";

/** Represents a fully processed program. */
export type ProgramAST = {
	program: string;
	nodes: ProgramASTNode[];
};
/** Represents a single node in a program AST. */
export type ProgramASTNode = ProgramASTLeafNode | ProgramASTBranchNode;
/** Represents a leaf node (node with no child nodes) in a program AST. */
export type ProgramASTLeafNode = Statement;
/** Represents a branch node (node with children) in a program AST. */
export class ProgramASTBranchNode implements TextRanged {
	constructor(
		public type: ProgramASTBranchNodeType,
		/**
		 * Contains the control statements for this block.
		 * @example for FUNCTION blocks, the first element will be the FUNCTION statement and the second one will be the ENDFUNCTION statement.
		 */
		public controlStatements: Statement[],
		public nodeGroups: ProgramASTNode[][],
	){}
	range():TextRange {
		return getTotalRange((this.controlStatements as (Statement | ProgramASTNode)[]).concat(this.nodeGroups.flat()));
	}
	static typeName(type:ProgramASTBranchNodeType){
		return {
			"if": "if",
			"for": "for",
			"for.step": "for (step)",
			"while": "while",
			"dowhile": "repeat",
			"function": "function",
			"procedure": "procedure",
			"switch": "switch",
			"type": "type",
			"class": "class",
			"class.inherits": "class",
			"class_function": "class function",
			"class_procedure": "class procedure",
		}[type];
	}
	typeName(){
		return ProgramASTBranchNode.typeName(this.type);
	}
}
/** The valid types for a branch node in a program AST. */
export const programASTBranchNodeTypes = ["if", "for", "for.step", "while", "dowhile", "function", "procedure", "switch", "type", "class", "class.inherits", "class_function", "class_procedure"] as const;
export type ProgramASTBranchNodeType = typeof programASTBranchNodeTypes extends ReadonlyArray<infer T> ? T : never;
export function ProgramASTBranchNodeType(input:string):ProgramASTBranchNodeType {
	if(programASTBranchNodeTypes.includes(input)) return input;
	crash(`"${input}" is not a valid program AST branch node type`);
}
