/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the types for the parser.
*/

import type { TextRange, TextRanged, Token, TokenType } from "./lexer-types.js";
import { Operator } from "./parser.js";
import { ArrayVariableType, PrimitiveVariableType } from "./runtime-types.js";
import type { Statement } from "./statements.js";
import { IFormattable } from "./types.js";
import { getTotalRange } from "./utils.js";


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
		public nodes: ExpressionASTNode[],
		public allTokens: Token[],
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
		public functionName: Token,
		public args: ExpressionASTNode[],
		public allTokens: Token[],
	){
		this.range = getTotalRange(allTokens);
	}
	toString(){
		return this.allTokens.map(t => t.text).join(" ");
	}
	fmtText():string {
		return `${this.functionName.text}(${this.args.map(n => n.fmtText()).join(", ")})`;
	}
	fmtDebug():string {
		return `${this.functionName.text}(${this.args.map(n => n.fmtDebug()).join(" ")})`;
	}
}
export class ExpressionASTClassInstantiationNode implements TextRanged {
	range: TextRange;
	constructor(
		public className: Token,
		public args: ExpressionASTNode[],
		public allTokens: Token[],
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
		public indices: ExpressionASTNode[],
		public allTokens: Token[],
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
		public lengthInformation: [low:Token, high:Token][],
		public elementType: Token,
		public allTokens: Token[],
	){
		this.range = getTotalRange(allTokens);
	}
	toData():ArrayVariableType {
		return new ArrayVariableType(
			this.lengthInformation.map(bounds => bounds.map(t => Number(t.text)) as [number, number]),
			PrimitiveVariableType.resolve(this.elementType.text)
		);
	}
	fmtText():string {
		return `ARRAY[${this.lengthInformation.map(([l, h]) => `${l.text}:${h.text}`).join(", ")}] OF ${this.elementType.text}`;
	}
	fmtDebug():string {
		return `ARRAY[${this.lengthInformation.map(([l, h]) => `${l.fmtDebug()} : ${h.fmtDebug()}`).join(", ")}] OF ${this.elementType.fmtDebug()}`;
	}
}
// export class ExpressionASTPointerTypeNode implements TextRanged {
// 	range: TextRange;
// 	constructor(
// 		public targetType: Token,
// 		public allTokens: Token[],
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
// 		public values: Token[],
// 		public allTokens: Token[],
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
}
/** The valid types for a branch node in a program AST. */
export type ProgramASTBranchNodeType = | "if" | "for" | "for.step" | "while" | "dowhile" | "function" | "procedure" | "switch" | "type" | "class" | "class_function" | "class_procedure";
