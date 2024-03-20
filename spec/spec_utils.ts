import { SymbolType, Token, TokenType, symbol, token } from "../src/lexer-types.js";
import {
	ExpressionAST, ExpressionASTArrayTypeNode, ExpressionASTBranchNode, ExpressionASTLeafNode, ExpressionASTNodeExt, ProgramAST, ProgramASTBranchNode, ProgramASTBranchNodeType, ProgramASTNode
} from "../src/parser-types.js";
import { Operator, operators, OperatorType } from "../src/parser.js";
import { Statement } from "../src/statements.js";
import { crash } from "../src/utils.js";


//Types prefixed with a underscore indicate simplified versions that contain the data required to construct the normal type with minimal boilerplate.

export type _Symbol = [type:SymbolType, text:string];
export type _Token = [type:TokenType, text:string];

export type _ExpressionAST = _ExpressionASTNode;
export type _ExpressionASTLeafNode = _Token;
export type _ExpressionASTNode = _ExpressionASTLeafNode | _ExpressionASTBranchNode;
export type _ExpressionASTBranchNode = [
	"tree",
	operator: _Operator | [type: "function call", name:string] | [type: "array access", name:string],
	nodes: _ExpressionASTNode[],
];
export type _ExpressionASTArrayTypeNode = [lengthInformation:[low:number, high:number][], type:_Token];
export type _ExpressionASTExt = _ExpressionAST | _ExpressionASTArrayTypeNode;

export type _Operator = Exclude<OperatorType, "assignment" | "pointer">;

export type _Statement = [constructor:typeof Statement, input:(_Token | _ExpressionAST | _ExpressionASTArrayTypeNode)[]];
export type _ProgramAST = _ProgramASTNode[];
export type _ProgramASTLeafNode = _Statement;
export type _ProgramASTNode = _ProgramASTLeafNode | _ProgramASTBranchNode;
export type _ProgramASTBranchNode = {
	type: ProgramASTBranchNodeType;
	controlStatements: _Statement[];
	nodeGroups: _ProgramASTNode[][];
}



export const operatorTokens: Record<Exclude<OperatorType, "assignment" | "pointer">, Token> = {
	"add": token("operator.add", "+"),
	"subtract": token("operator.subtract", "-"),
	"multiply": token("operator.multiply", "*"),
	"divide": token("operator.divide", "/"),
	"mod": token("operator.mod", "MOD"),
	"integer_divide": token("operator.integer_divide", "DIV"),
	"and": token("operator.and", "AND"),
	"or": token("operator.or", "OR"),
	"not": token("operator.not", "NOT"),
	"equal_to": token("operator.equal_to", "="),
	"not_equal_to": token("operator.not_equal_to", "<>"),
	"less_than": token("operator.less_than", "<"),
	"greater_than": token("operator.greater_than", ">"),
	"less_than_equal": token("operator.less_than_equal", "<="),
	"greater_than_equal": token("operator.greater_than_equal", ">="),
	"string_concatenate": token("operator.string_concatenate", "&"),
	"negate": token("operator.subtract", "-"),
}

export function is_ExpressionASTArrayTypeNode(input:_ExpressionAST | _ExpressionASTArrayTypeNode):input is _ExpressionASTArrayTypeNode {
	return Array.isArray(input[1]);
}

export function process_Statement(input:_Statement):Statement {
	return new input[0](input[1].map(process_ExpressionASTExt));
}

export function process_ExpressionASTArrayTypeNode(input:_ExpressionASTArrayTypeNode):ExpressionASTArrayTypeNode {
	return new ExpressionASTArrayTypeNode(
		input[0].map(bounds => bounds.map(b => token("number.decimal", b.toString()))),
		token(input[1]),
		[token(input[1])] //SPECNULL
	);
}

export function process_ExpressionASTExt<TIn extends _ExpressionASTExt>(input:TIn):
	TIn extends (_ExpressionASTArrayTypeNode | _ExpressionASTLeafNode)
		? (ExpressionASTArrayTypeNode | ExpressionASTLeafNode)
		: (ExpressionASTNodeExt) {
	if(is_ExpressionASTArrayTypeNode(input)) return process_ExpressionASTArrayTypeNode(input);
	else return process_ExpressionAST(input) as any; //unsafe
}

export function process_ExpressionAST(input:_ExpressionAST):ExpressionAST {
	if(input.length == 2){
		return token(...input);
	} else {
		let operator:Operator | "array access" | "function call";
		let operatorToken:Token;
		if(Array.isArray(input[1]) && input[1][0] == "array access"){
			operator = input[1][0];
			operatorToken = token("name", input[1][1]);
		} else if(Array.isArray(input[1]) && input[1][0] == "function call"){
			operator = input[1][0];
			operatorToken = token("name", input[1][1]);
		} else {
			operator = operators[input[1]];
			operatorToken = operatorTokens[input[1]];
		}
		return new ExpressionASTBranchNode(
			operatorToken,
			operator,
			input[2].map(process_ExpressionAST),
			[operatorToken] //SPECNULL
		);
	}
}

export function process_ProgramAST(input:_ProgramAST, program:string = "" /* SPECNULL */):ProgramAST {
	return {
		program,
		nodes: input.map(process_ProgramASTNode)
	};
}

export function process_ProgramASTNode(input:_ProgramASTNode):ProgramASTNode {
	return Array.isArray(input)
		? process_Statement(input)
		: new ProgramASTBranchNode(
			input.type,
			input.controlStatements.map(process_Statement),
			input.nodeGroups.map(block => block.map(process_ProgramASTNode)),
		);
}

export const anyRange = [jasmine.any(Number), jasmine.any(Number)];

/** Mutates input unsafely */
export function applyAnyRange<TIn extends
	ExpressionAST | ExpressionASTArrayTypeNode | Statement | ProgramASTBranchNode | ProgramAST
>(input:TIn):jasmine.Expected<TIn> {
	if(input instanceof Token){
		input.range;
		(input as any).range = anyRange;
	} else if(input instanceof Statement){
		input.range;
		(input as any).range = anyRange;
		input.tokens.forEach(applyAnyRange);
	} else if(input instanceof ExpressionASTBranchNode){
		input.range;
		(input as any).range = anyRange;
		input.allTokens;
		(input as any).allTokens = jasmine.any(Array);
		applyAnyRange(input.operatorToken)
		input.nodes.forEach(applyAnyRange);
	} else if(input instanceof ExpressionASTArrayTypeNode){
		input.range;
		(input as any).range = anyRange;
		input.allTokens;
		(input as any).allTokens = jasmine.any(Array);
		applyAnyRange(input.type);
	} else if(input instanceof ProgramASTBranchNode){
		input.range;
		(input as any).range = anyRange;
		input.controlStatements.forEach(applyAnyRange);
		input.nodeGroups.forEach(block => block.forEach(applyAnyRange));
	} else if("nodes" in input && "program" in input){
		input.nodes.forEach(applyAnyRange);
	} else {
		input satisfies never;
		crash(`Type error at applyAnyRange()`);
	}
	return input;
}
