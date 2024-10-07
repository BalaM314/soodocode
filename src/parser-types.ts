/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the types for the parser.
*/

import { Token, TokenType } from "./lexer-types.js";
import type { CaseBranchStatement, ClassFunctionEndStatement, ClassFunctionStatement, ClassInheritsStatement, ClassProcedureEndStatement, ClassProcedureStatement, ClassStatement, DoWhileEndStatement, DoWhileStatement, ElseStatement, ForEndStatement, ForStatement, ForStepStatement, FunctionStatement, IfStatement, ProcedureStatement, Statement, SwitchStatement, TypeStatement, WhileStatement } from "./statements.js";
import type { ClassProperties, IFormattable, TextRange, TextRanged } from "./types.js";
import { crash, f, getTotalRange, match, RangeArray } from "./utils.js";


/** Represents an expression tree. */
export type ExpressionAST = ExpressionASTNode;
/** Represents a single node in an expression AST. */
export type ExpressionASTNode =
| ExpressionASTLeafNode
| ExpressionASTBranchNode
| ExpressionASTFunctionCallNode
| ExpressionASTArrayAccessNode
| ExpressionASTClassInstantiationNode; //UPDATE: Statement.expr
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
		if(this.operator.fix.startsWith("unary_prefix")){
			return `(${this.operatorToken.text} ${this.nodes[0].fmtText()})`;
		} else if(this.operator.fix.startsWith("unary_postfix")){
			return `(${this.nodes[0].fmtText()} ${this.operatorToken.text})`;
		} else { //binary operator
			return `(${this.nodes[0].fmtText()} ${this.operatorToken.text} ${this.nodes[1].fmtText()})`;
		}
	}
	fmtDebug():string {
		return `[${this.operator.id} ${this.nodes.map(n => n.fmtDebug()).join(" ")}]`;
	}
}
/** Represents a function call expression in an expression AST. */
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
/** Represents a class instantiation expression in an expression AST. */
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
/** Represents an array access expression in an expression AST. */
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
	range: TextRange = this.allTokens.range;
	constructor(
		public lengthInformation: [low:ExpressionAST, high:ExpressionAST][] | null,
		public elementType: Token,
		public allTokens: RangeArray<Token>,
	){}
	fmtText():string {
		const rangeText = this.lengthInformation ? `[${this.lengthInformation.map(([l, h]) => f.text`${l}:${h}`).join(", ")}]` : "";
		return `ARRAY OF ${this.elementType.text}`;
	}
	fmtDebug():string {
		const rangeText = this.lengthInformation ? `[${this.lengthInformation.map(([l, h]) => `${l.fmtDebug()} : ${h.fmtDebug()}`).join(", ")}]` : "";
		return `ARRAY${rangeText} OF ${this.elementType.fmtDebug()}`;
	}
}
/** Represents a special node that represents a range type, such as `1..20` */
export class ExpressionASTRangeTypeNode implements TextRanged, IFormattable {
	range: TextRange = this.allTokens.range;
	constructor(
		public low:Token,
		public high:Token,
		public allTokens: RangeArray<Token>,
	){}
	fmtText():string {
		return `${this.low.text}..${this.high.text}`;
	}
	fmtDebug():string {
		return f.debug`${this.low} .. ${this.high}`;
	}
}
// export class ExpressionASTPointerTypeNode implements TextRanged {
// 	range: TextRange = this.allTokens.range;
// 	constructor(
// 		public targetType: Token,
// 		public allTokens: RangeArray<Token>,
// 	){}
// 	toData(name:string):PointerVariableType {
// 		return new PointerVariableType(
// 			name,
// 			PrimitiveVariableType.get(this.targetType.text) ?? fail(f.quote`Invalid variable type ${this.targetType}`)
// 		);
// 	}
// }
// export class ExpressionASTEnumTypeNode implements TextRanged {
// 	range: TextRange = this.allTokens.range;
// 	constructor(
// 		public values: RangeArray<Token>,
// 		public allTokens: RangeArray<Token>,
// 	){}
// 	toData(name:string):EnumeratedVariableType {
// 		return new EnumeratedVariableType(
// 			name,
// 			this.values.map(t => t.text)
// 		);
// 	}
// }
/** Represents a node that represents a type, for example, a single token, or an array type node. */
export type ExpressionASTTypeNode = Token | ExpressionASTRangeTypeNode | ExpressionASTArrayTypeNode; //UPDATE: ExpressionASTTypeNodes
/** Represents an "extended" expression AST node, which may also be an array type node */
export type ExpressionASTNodeExt = ExpressionASTNode | ExpressionASTTypeNode;

export const ExpressionASTTypeNodes = [
	Token, ExpressionASTArrayTypeNode, ExpressionASTRangeTypeNode
] as const;
export const ExpressionASTNodes = [
	Token, ExpressionASTBranchNode, ExpressionASTFunctionCallNode, ExpressionASTArrayAccessNode, ExpressionASTClassInstantiationNode
] as const;

/** Names for operators that are valid within expressions. Includes operator.negate and operator.pointer_reference, but not operator.minus or operator.assignment. */
export type OperatorName<T = TokenType> = T extends `operator.${infer N}` ? N extends ("minus" | "assignment" | "pointer" | "range") ? never : (N | "negate" | "subtract" | "access" | "pointer_reference" | "pointer_dereference") : never;
/**
 * The way that this operator can be used within expressions.
 * 
 * * binary: an operator that is between two other expressions.
 * Example: a + b
 * 
 * * unary_prefix: an operator that comes before one expression.
 * Example: - c
 * 
 * * binary_o_unary_prefix: An operator that is between two other expressions, like binary, but has also been overloaded as a unary prefix operator.
 * Example: d - e (the - operator can also be a unary prefix operator)
 * 
 * * unary_prefix_o_postfix: An operator that comes before one expression, but has also been overloaded as a unary postfix operator.
 * Example: ^ x
 * 
 * * unary_postfix_o_prefix: An operator that comes after one expression, but has also been overloaded as a unary prefix operator.
 * Example: y ^
 */
export type OperatorFix = "binary" | "binary_o_unary_prefix" | "unary_prefix" | "unary_prefix_o_postfix" | "unary_postfix_o_prefix";
export type OperatorCategory = "arithmetic" | "logical" | "string" | "special"; 
/**
 * Token types for operators that are valid within expressions.
 * Includes operator.negate and operator.pointer_reference, but not operator.minus or operator.assignment.
 */
export type OperatorType = `operator.${OperatorName}`;
export class Operator implements IFormattable {
	token!: TokenType;
	id!: OperatorType;
	fix!: OperatorFix;
	category!: OperatorCategory;
	constructor(args:ClassProperties<Operator>){
		Object.assign(this, args);
	}
	fmtText(){
		return match(this.id, {
			"operator.or": "or",
			"operator.and": "and",
			"operator.equal_to": "equal to",
			"operator.not_equal_to": "not equal to",
			"operator.less_than": "less than",
			"operator.less_than_equal": "less than equal",
			"operator.greater_than": "greater than",
			"operator.greater_than_equal": "greater than equal",
			"operator.add": "add",
			"operator.subtract": "subtract",
			"operator.string_concatenate": "string concatenate",
			"operator.multiply": "multiply",
			"operator.divide": "divide",
			"operator.integer_divide": "integer divide",
			"operator.mod": "mod",
			"operator.pointer_reference": "pointer reference",
			"operator.not": "not",
			"operator.negate": "negate",
			"operator.pointer_dereference": "pointer dereference",
			"operator.access": "access",
		});
	}
	fmtDebug(){
		return `Operator [${this.id}] (${this.category} ${this.fix})`;
	}
}

export type PreprocessedOperator = {
	category: OperatorCategory;
	fix?: OperatorFix;
} & ({
	id: OperatorType;
	token: TokenType;
} | {
	token: OperatorType & TokenType;
});

/** Lowest to highest. Operators in the same 1D array have the same priority and are evaluated left to right. */
export const operatorsByPriority = ((input:PreprocessedOperator[][]):Operator[][] =>
	input.map(row => row.map(o =>
		new Operator({
			token: o.token,
			category: o.category,
			fix: o.fix ?? "binary",
			id: "id" in o ? o.id : o.token,
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
			id: "operator.subtract",
			token: "operator.minus",
			category: "arithmetic",
			fix: "binary_o_unary_prefix"
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
			id: "operator.pointer_reference",
			category: "special",
			fix: "unary_prefix_o_postfix"
		},
		{
			token: "operator.not",
			category: "logical",
			fix: "unary_prefix"
		},
		{
			token: "operator.minus",
			id: "operator.negate",
			category: "arithmetic",
			fix: "unary_prefix"
		},
	],
	[
		{
			token: "operator.pointer",
			id: "operator.pointer_dereference",
			category: "special",
			fix: "unary_postfix_o_prefix"
		}
	],
	[
		{
			token: "punctuation.period",
			id: "operator.access",
			category: "special",
		}
	]
	//(function call)
	//(array access)
]);
/** Indexed by OperatorType */
export const operators = Object.fromEntries(
	operatorsByPriority.flat().map(o => [
		o.id.startsWith("operator.") ? o.id.split("operator.")[1] : crash(`operator names should start with operator.`), o
	] as const)
) as Record<OperatorName, Operator>;


/** Matches one or more tokens when validating a statement. expr+ causes an expression to be parsed, and type+ causes a type to be parsed. Variadic matchers cannot be adjacent, because the matcher after the variadic matcher is used to determine how many tokens to match. */
export type TokenMatcher = TokenType | "." | "literal" | "literal|otherwise" | ".*" | ".+" | "expr+" | "type+" | "file_mode" | "class_modifier";

/** Represents a fully processed program. Contains the program represented as an abstract syntax tree. */
export type ProgramAST = {
	program: string;
	nodes: ProgramASTNodeGroup;
};
/** Represents a single node in a program AST. */
export type ProgramASTNode = ProgramASTLeafNode | ProgramASTBranchNode;
/** Represents a leaf node (node with no child nodes) in a program AST. */
export type ProgramASTLeafNode = Statement;
/** Represents a branch node (node with children) in a program AST. */
export class ProgramASTBranchNode<T extends ProgramASTBranchNodeType = ProgramASTBranchNodeType> implements TextRanged {
	constructor(
		public type: T,
		/**
		 * Contains the control statements for this block.
		 * Example: for FUNCTION blocks, the first element will be the FUNCTION statement and the second one will be the ENDFUNCTION statement.
		 */
		public controlStatements: ProgramASTBranchNodeTypeMapping<T>,
		/**
		 * Contains all the statements between the control statements.
		 * Example: for `IF FALSE THEN; a; ELSE; b; c; ENDIF;`, the value of nodeGroups will be [[a], [b, c]].
		 */
		public nodeGroups: ProgramASTNodeGroup[],
	){}
	/** Unsound due to array bivariance */
	controlStatements_(){
		return this.controlStatements satisfies Statement[] as Statement[];
	}
	range():TextRange {
		return getTotalRange([
			...this.controlStatements,
			...(this.nodeGroups as ProgramASTNode[][]).flat(1)
		]);
	}
	static typeName(type:ProgramASTBranchNodeType){
		return match(type, {
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
		});
	}
	typeName(){
		return ProgramASTBranchNode.typeName(this.type);
	}
}

export class ProgramASTNodeGroup extends Array<ProgramASTNode> {
	requiresScope = true;
	hasTypesOrConstants = true;
	hasReturn = true;
	private _simple = false;
	async preRun(parent?:ProgramASTBranchNode){
		this.requiresScope = false;
		this.hasTypesOrConstants = false;
		this.hasReturn = false;

		for(const node of this){
			if(node instanceof ProgramASTBranchNode){
				for(const block of node.nodeGroups){
					await block.preRun();
					//this {
					//	IF x < 5 THEN
					//		RETURN 5
					//	ENDIF
					//}
					//If the { RETURN 5 } group has a return statement, and the IF statement propagates the return, this block also can return
					//But if the RETURN was inside a function or class, this block doesn't return
					if(block.hasReturn && node.controlStatements[0].type.propagatesControlFlowInterruptions) this.hasReturn = true;
				}
				for(const statement of node.controlStatements){
					await statement.triggerPreRun(this, node); //UNSOUND
				}
			} else {
				await node.triggerPreRun(this, parent);
			}
		}
		this._simple = !this.requiresScope && !this.hasTypesOrConstants && !this.hasReturn;
	}
	simple():this is { requiresScope: false; hasTypesOrConstants: false; hasReturn: false; } {
		return this._simple;
	}
	static from(nodes:ProgramASTNode[]){
		return super.from(nodes) as ProgramASTNodeGroup;
	}
}
//Delete the useless function
delete (ProgramASTNodeGroup as {from: any;}).from;

// A type that looks like `name.variant` is treated as a variant of `name`,
// meaning things that require a block of type `name` will also accept `name.variant`.
/** The valid types for a branch node in a program AST. */
export const programASTBranchNodeTypes = ["if", "for", "for.step", "while", "dowhile", "function", "procedure", "switch", "type", "class", "class.inherits", "class_function", "class_procedure"] as const;
/** The valid types for a branch node in a program AST. */
export type ProgramASTBranchNodeType = typeof programASTBranchNodeTypes extends ReadonlyArray<infer T> ? T : never;
export function ProgramASTBranchNodeType(input:string):ProgramASTBranchNodeType {
	if(programASTBranchNodeTypes.includes(input)) return input;
	crash(`"${input}" is not a valid program AST branch node type`);
}
export type ProgramASTBranchNodeTypeMapping<T extends ProgramASTBranchNodeType> =
	T extends "if" ? [IfStatement, Statement] | [IfStatement, ElseStatement, Statement] :
	T extends "for" ? [ForStatement, ForEndStatement] :
	T extends "for.step" ? [ForStepStatement, ForEndStatement] :
	T extends "while" ? [WhileStatement, Statement] :
	T extends "dowhile" ? [DoWhileStatement, DoWhileEndStatement] :
	T extends "function" ? [FunctionStatement, Statement] :
	T extends "procedure" ? [ProcedureStatement, Statement] :
	T extends "switch" ? [SwitchStatement, ...CaseBranchStatement[], Statement] :
	T extends "type" ? [TypeStatement, Statement] :
	T extends "class" ? [ClassStatement, Statement] :
	T extends "class.inherits" ? [ClassInheritsStatement, Statement] :
	T extends "class_function" ? [ClassFunctionStatement, ClassFunctionEndStatement] :
	T extends "class_procedure" ? [ClassProcedureStatement, ClassProcedureEndStatement] :
	Statement[];
