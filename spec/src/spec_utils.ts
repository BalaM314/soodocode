import { Symbol, SymbolType, Token, TokenType } from "../../build/lexer-types.js";
import { ExpressionAST, ExpressionASTArrayAccessNode, ExpressionASTArrayTypeNode, ExpressionASTBranchNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, ExpressionASTLeafNode, ExpressionASTNodeExt, Operator, OperatorType, ProgramAST, ProgramASTBranchNode, ProgramASTBranchNodeType, ProgramASTLeafNode, ProgramASTNode, operators } from "../../build/parser-types.js";
import { PrimitiveVariableType, PrimitiveVariableTypeName, UnresolvedVariableType, VariableType } from "../../build/runtime-types.js";
import { Statement } from "../../build/statements.js";
import { crash } from "../../build/utils.js";
import { tokenTextMapping } from "../../build/lexer.js";


//Types prefixed with a underscore indicate simplified versions that contain the data required to construct the normal type with minimal boilerplate.

export type _Symbol = [type:SymbolType, text:string];
export type _Token = [type:TokenType, text:string] | TokenType | string | number;

export type _ExpressionAST = _ExpressionASTNode;
export type _ExpressionASTLeafNode = _Token;
export type _ExpressionASTNode = _ExpressionASTLeafNode | _ExpressionASTBranchNode;
export type _ExpressionASTBranchNode = [
	"tree",
	operator: _Operator | [type: "function call", name:_ExpressionASTLeafNode | _ExpressionASTOperatorBranchNode] | [type: "class instantiation", name:string] | [type: "array access", name:_ExpressionASTNode],
	nodes: _ExpressionASTNode[],
];
export type _ExpressionASTOperatorBranchNode = _ExpressionASTBranchNode & [unknown, _Operator, _ExpressionASTNode[]];
export type _ExpressionASTArrayTypeNode = [lengthInformation:[low:number, high:number][], type:_Token];
export type _ExpressionASTExt = _ExpressionAST | _ExpressionASTArrayTypeNode;

export type _VariableType = Exclude<VariableType, PrimitiveVariableType> | PrimitiveVariableTypeName;
export type _UnresolvedVariableType = string;

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

export type Processed<T> =
	T extends _Symbol ? Symbol :
	T extends _Token ? Token :
	T extends _ExpressionAST ? ExpressionAST :
	T extends _ExpressionASTLeafNode ? ExpressionASTLeafNode :
	T extends _ExpressionASTOperatorBranchNode ? ExpressionASTBranchNode :
	T extends _ExpressionASTBranchNode ? ExpressionASTBranchNode | ExpressionASTArrayAccessNode | ExpressionASTFunctionCallNode | ExpressionASTClassInstantiationNode :
	T extends _ExpressionASTArrayTypeNode ? ExpressionASTArrayTypeNode :
	T extends _ExpressionASTExt ? ExpressionAST | ExpressionASTArrayTypeNode :
	T extends _VariableType ? VariableType :
	T extends _UnresolvedVariableType ? UnresolvedVariableType :
	T extends _Operator ? Operator :
	T extends _Statement ? Statement :
	T extends _ProgramAST ? ProgramAST :
	T extends _ProgramASTLeafNode ? ProgramASTLeafNode :
	T extends _ProgramASTNode ? ProgramASTNode :
	T extends _ProgramASTBranchNode ? ProgramASTBranchNode :
	never
;


export const operatorTokens: Record<Exclude<OperatorType, "assignment" | "pointer">, Token> = {
	"add": token("operator.add", "+"),
	"subtract": token("operator.minus", "-"),
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
	"negate": token("operator.minus", "-"),
	"access": token("punctuation.period", "."),
	"pointer_reference": token("operator.pointer", "^"),
	"pointer_dereference": token("operator.pointer", "^"),
}

export function token(type:TokenType, text:string):Token {
	return new Token(type, text, [-1, -1]);
}
export function symbol([type, text]:[type:SymbolType, text:string]):Symbol {
	return new Symbol(type, text, [-1, -1]);
}
export function process_Token(input:_Token):Token {
	if(Array.isArray(input)) return token(...input);
	else if(typeof input == "number") return token("number.decimal", input.toString());
	else return tokenTextMapping[input as never] ? token(input as TokenType, tokenTextMapping[input as never]) : token("name", input);
}
//\[("operator\.and"|"keyword\.file_mode\.append"|"keyword\.array"|"keyword\.pass_mode\.by_reference"|"keyword\.pass_mode\.by_value"|"keyword\.call"|"keyword\.case"|"keyword\.class"|"keyword\.close_file"|"keyword\.constant"|"keyword\.declare"|"keyword\.define"|"operator\.integer_divide"|"keyword\.else"|"keyword\.case_end"|"keyword\.class_end"|"keyword\.function_end"|"keyword\.if_end"|"keyword\.procedure_end"|"keyword\.type_end"|"keyword\.while_end"|"boolean\.false"|"keyword\.for"|"keyword\.function"|"keyword\.get_record"|"keyword\.if"|"keyword\.inherits"|"keyword\.input"|"operator\.mod"|"keyword\.new"|"keyword\.for_end"|"operator\.not"|"keyword\.of"|"keyword\.open_file"|"operator\.or"|"keyword\.otherwise"|"keyword\.output"|"keyword\.class_modifier\.private"|"keyword\.procedure"|"keyword\.class_modifier\.public"|"keyword\.put_record"|"keyword\.file_mode\.random"|"keyword\.file_mode\.read"|"keyword\.read_file"|"keyword\.dowhile"|"keyword\.return"|"keyword\.returns"|"keyword\.seek"|"keyword\.set"|"keyword\.step"|"keyword\.super"|"keyword\.then"|"keyword\.to"|"boolean\.true"|"keyword\.type"|"keyword\.dowhile_end"|"keyword\.while"|"keyword\.file_mode\.write"|"keyword\.write_file"|"operator\.assignment"|"operator\.greater_than_equal"|"operator\.less_than_equal"|"operator\.not_equal_to"|"operator\.equal_to"|"operator\.greater_than"|"operator\.less_than"|"operator\.add"|"operator\.minus"|"operator\.multiply"|"operator\.divide"|"operator\.pointer"|"operator\.string_concatenate"|"parentheses\.open"|"parentheses\.close"|"bracket\.open"|"bracket\.close"|"brace\.open"|"brace\.close"|"punctuation\.colon"|"punctuation\.semicolon"|"punctuation\.comma"|"punctuation\.period"|"newline"),( ?)".+?"\]


export function is_ExpressionASTArrayTypeNode(input:_ExpressionAST | _ExpressionASTArrayTypeNode):input is _ExpressionASTArrayTypeNode {
	return Array.isArray(input) && Array.isArray(input[0]);
}

export function process_Statement(input:_Statement):Statement {
	return new input[0](input[1].map(process_ExpressionASTExt));
}

export function process_ExpressionASTArrayTypeNode(input:_ExpressionASTArrayTypeNode):ExpressionASTArrayTypeNode {
	return new ExpressionASTArrayTypeNode(
		input[0].map(bounds => bounds.map(b => token("number.decimal", b.toString()))),
		process_Token(input[1]),
		[process_Token(input[1])] //SPECNULL
	);
}

export function process_ExpressionASTExt<TIn extends _ExpressionASTLeafNode | _ExpressionASTArrayTypeNode | _ExpressionASTBranchNode>(input:TIn):
	TIn extends (_ExpressionASTArrayTypeNode | _ExpressionASTLeafNode)
		? (ExpressionASTArrayTypeNode | ExpressionASTLeafNode)
		: (ExpressionASTNodeExt) {
	if(is_ExpressionASTArrayTypeNode(input)) return process_ExpressionASTArrayTypeNode(input);
	else return (process_ExpressionAST(input) satisfies ExpressionASTNodeExt) as never;
}

export function process_ExpressionAST<T extends _ExpressionASTNode>(input:T):Processed<T>;
export function process_ExpressionAST(input:_ExpressionAST):ExpressionAST {
	if(typeof input == "string" || typeof input == "number" || input.length == 2){
		return process_Token(input);
	} else {
		if(Array.isArray(input[1]) && input[1][0] == "array access"){
			return new ExpressionASTArrayAccessNode(
				process_ExpressionAST(input[1][1]),
				input[2].map(process_ExpressionAST),
				[token("name", "_")] //SPECNULL
			);
		} else if(Array.isArray(input[1]) && input[1][0] == "function call"){
			const functionName = process_ExpressionAST(input[1][1]);
			if(functionName instanceof ExpressionASTBranchNode || functionName instanceof Token)
				return new ExpressionASTFunctionCallNode(
					functionName,
					input[2].map(process_ExpressionAST),
					[token("name", "_")] //SPECNULL
				);
			else crash(`Invalid _ExpressionAST; function name must be an operator branch node or a leaf node`);
		} else if(Array.isArray(input[1]) && input[1][0] == "class instantiation"){
			return new ExpressionASTClassInstantiationNode(
				token("name", input[1][1]),
				input[2].map(process_ExpressionAST),
				[token("name", "_")] //SPECNULL
			);
		} else {
			return new ExpressionASTBranchNode(
				operatorTokens[input[1]],
				operators[input[1]],
				input[2].map(process_ExpressionAST),
				[operatorTokens[input[1]]] //SPECNULL
			);
		}
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
export function process_VariableType(input:_VariableType):VariableType;
export function process_VariableType(input:_VariableType | null):VariableType | null;
export function process_VariableType(input:_VariableType | null):VariableType | null {
	if(input == null) return input;
	if(typeof input == "string") return PrimitiveVariableType.get(input);
	return input;
}
export function process_UnresolvedVariableType(input:_UnresolvedVariableType):UnresolvedVariableType {
	return PrimitiveVariableType.get(input) ?? ["unresolved", input];
}
export function fakeStatement(type:typeof Statement):Statement {
	//lol wut
	return {
		type
	} as Statement;
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
	} else if(input instanceof ExpressionASTArrayAccessNode){
		input.range;
		(input as any).range = anyRange;
		input.allTokens;
		(input as any).allTokens = jasmine.any(Array);
		applyAnyRange(input.target)
		input.indices.forEach(applyAnyRange);
	} else if(input instanceof ExpressionASTFunctionCallNode){
		input.range;
		(input as any).range = anyRange;
		input.allTokens;
		(input as any).allTokens = jasmine.any(Array);
		applyAnyRange(input.functionName)
		input.args.forEach(applyAnyRange);
	} else if(input instanceof ExpressionASTClassInstantiationNode){
		input.range;
		(input as any).range = anyRange;
		input.allTokens;
		(input as any).allTokens = jasmine.any(Array);
		applyAnyRange(input.className)
		input.args.forEach(applyAnyRange);
	} else if(input instanceof ExpressionASTArrayTypeNode){
		input.range;
		(input as any).range = anyRange;
		input.allTokens;
		(input as any).allTokens = jasmine.any(Array);
		applyAnyRange(input.elementType);
	} else if(input instanceof ProgramASTBranchNode){
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

export function name(text:string):Token {
	return token("name", text);
}
export function num(text:string):Token {
	return token("number.decimal", text);
}
