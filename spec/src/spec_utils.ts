import { Symbol, SymbolType, Token, TokenType, tokenTextMapping } from "../../core/build/lexer/index.js";
import { ExpressionAST, ExpressionASTArrayAccessNode, ExpressionASTArrayTypeNode, ExpressionASTBranchNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, ExpressionASTLeafNode, ExpressionASTRangeTypeNode, ExpressionASTTypeNode, Operator, OperatorName, ProgramAST, ProgramASTBranchNode, ProgramASTBranchNodeType, ProgramASTLeafNode, ProgramASTNode, ProgramASTNodeGroup, StatementNode, expressionLeafNodeTypes, operators } from "../../core/build/parser/index.js";
import { ArrayVariableType, ClassMethodData, ClassVariableType, FileMode, PrimitiveVariableType, PrimitiveVariableTypeName, Runtime, TypedNodeValue, UnresolvedVariableType, VariableType } from "../../core/build/runtime/index.js";
import { AssignmentStatement, CallStatement, CaseBranchRangeStatement, CaseBranchStatement, ClassFunctionStatement, ClassInheritsStatement, ClassProcedureStatement, ClassPropertyStatement, ClassStatement, CloseFileStatement, ConstantStatement, DeclareStatement, DefineStatement, DoWhileEndStatement, ElseStatement, ForEndStatement, ForStatement, ForStepStatement, FunctionStatement, IfStatement, InputStatement, OpenFileStatement, OutputStatement, ProcedureStatement, ReadFileStatement, ReturnStatement, Statement, SwitchStatement, TypeEnumStatement, TypePointerStatement, TypeRecordStatement, TypeSetStatement, WhileStatement, WriteFileStatement, statements } from "../../core/build/statements/index.js";
import { RangeArray, crash, fakeObject, forceType, impossible, unreachable } from "../../core/build/utils/funcs.js";
import "../../core/build/utils/globals.js";
import type { TextRange, TextRanged2 } from "../../core/build/utils/types.js";


if(typeof jasmine === "undefined"){
	//Helper if this is being imported from the REPL
	globalThis["jasmine"] = {
		any: () => ({
			asymmetricMatch: () => true
		})
	} as never;
}

//Types prefixed with a underscore indicate simplified versions that contain the data required to construct the normal type with minimal boilerplate.

export type _Symbol = [type:SymbolType, text:string];
export type _Token = [type:TokenType, text:string] | TokenType | (string & {}) | number;

export type _ExpressionAST = _ExpressionASTNode;
export type _ExpressionASTLeafNode = _Token;
export type _ExpressionASTNode = _ExpressionASTLeafNode | _ExpressionASTBranchNode;
export type _ExpressionASTBranchNode = [
	"tree",
	operator: _Operator | [type: "function call", name:_ExpressionASTLeafNode | _ExpressionASTOperatorBranchNode] | [type: "class instantiation", name:string] | [type: "array access", name:_ExpressionASTNode],
	nodes: _ExpressionASTNode[],
];
export type _ExpressionASTOperatorBranchNode = _ExpressionASTBranchNode & [unknown, _Operator, _ExpressionASTNode[]];
export type _ExpressionASTArrayTypeNode = [lengthInformation:[low:_ExpressionAST, high:_ExpressionAST][] | null, type:_Token];
export type _ExpressionASTRangeTypeNode = [number, number];
export type _ExpressionASTExt = _ExpressionAST | _ExpressionASTArrayTypeNode | _ExpressionAST | _ExpressionASTRangeTypeNode;
export type _ExpressionASTTypeNode = _Token | _ExpressionASTRangeTypeNode | _ExpressionASTArrayTypeNode;

export type _VariableType = Exclude<VariableType, PrimitiveVariableType> | PrimitiveVariableTypeName;
export type _UnresolvedVariableType = string;

export type _Operator = OperatorName;

export type StatementUnion<T extends keyof typeof statementCreators = keyof typeof statementCreators> = T extends unknown ? [statementType:T, ...Parameters<(typeof statementCreators)[T]>] : never;
export type _Statement = [constructor:typeof Statement, input:(_Token | _ExpressionAST | _ExpressionASTArrayTypeNode)[]] | StatementUnion;
export type _ProgramAST = _ProgramASTNode[];
export type _ProgramASTLeafNode = _Statement;
export type _ProgramASTNode = _ProgramASTLeafNode | _ProgramASTBranchNode;
export type _ProgramASTBranchNode = {
	type: ProgramASTBranchNodeType;
	controlStatements: _Statement[];
	nodeGroups: _ProgramASTNode[][];
}

export type ProcessedNonExpr<T> =
	T extends _Symbol ? Symbol :
	T extends _Token ? Token :
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

export type ProcessedExpr<T> =
	T extends _ExpressionAST ? ExpressionAST :
	T extends _ExpressionASTLeafNode ? ExpressionASTLeafNode :
	T extends _ExpressionASTOperatorBranchNode ? ExpressionASTBranchNode :
	T extends _ExpressionASTBranchNode ? ExpressionASTBranchNode | ExpressionASTArrayAccessNode | ExpressionASTFunctionCallNode | ExpressionASTClassInstantiationNode :
	T extends _ExpressionASTArrayTypeNode ? ExpressionASTArrayTypeNode :
	T extends _ExpressionASTRangeTypeNode ? ExpressionASTRangeTypeNode :
	T extends _ExpressionASTExt ? ExpressionAST | ExpressionASTArrayTypeNode :
	never
;

export const operatorTokens: Record<OperatorName, Token> = {
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
};

export function token(type:TokenType, text:string):Token {
	if(type == "string") if(!(text.at(0) == `"` && text.at(-1) == `"`)) crash(`Invalid test token of type string, missing double quotes: ${text}`);
	if(type == "char") if(!(text.at(0) == `'` && text.at(2) == `'`)) crash(`Invalid test token of type char, missing single quotes: ${text}`);
	return new Token(type, text, [-1, -1]);
}
export function eleaf(type:TokenType, text:string):ExpressionASTLeafNode {
	if(type == "string") if(!(text.at(0) == `"` && text.at(-1) == `"`)) crash(`Invalid test token of type string, missing double quotes: ${text}`);
	if(type == "char") if(!(text.at(0) == `'` && text.at(2) == `'`)) crash(`Invalid test token of type char, missing single quotes: ${text}`);
	return new ExpressionASTLeafNode(type, text, [-1, -1]);
}
export function symbol([type, text]:[type:SymbolType, text:string]):Symbol {
	return new Symbol(type, text, [-1, -1]);
}
export function process_Token(input:_Token):Token {
	if(Array.isArray(input)) return token(...input);
	else if(typeof input == "number") return token("number.decimal", input.toString());
	else if(input in tokenTextMapping) return token(input as keyof typeof tokenTextMapping, tokenTextMapping[input as keyof typeof tokenTextMapping]);
	else if(input.includes(".")) crash(`Invalid name type token shorthand ${input}`);
	else return token("name", input);
}
export function process_ExpressionASTLeafNode(input:_ExpressionASTLeafNode):ExpressionASTLeafNode {
	if(Array.isArray(input)) return eleaf(...input);
	else if(typeof input == "number") return eleaf("number.decimal", input.toString());
	else if(input in tokenTextMapping) return eleaf(input as keyof typeof tokenTextMapping, tokenTextMapping[input as keyof typeof tokenTextMapping]);
	else if(input.includes(".")) crash(`Invalid name type token shorthand ${input}`);
	else return eleaf("name", input);
}
export function process_ExpressionASTLeafNodeOrToken(input:_ExpressionASTLeafNode | _Token):ExpressionASTLeafNode | Token {
	if(Array.isArray(input)){
		const [type, text] = input;
		if(expressionLeafNodeTypes.includes(type)) return eleaf(type, text);
		else return token(type, text);
	} else if(typeof input == "number") return eleaf("number.decimal", input.toString());
	else if(input in tokenTextMapping){
		return (expressionLeafNodeTypes.includes(input) ? eleaf : token)(
			input as keyof typeof tokenTextMapping, tokenTextMapping[input as keyof typeof tokenTextMapping]
		);
	} else if(input.includes(".")) crash(`Invalid name type token shorthand ${input}`);
	else return eleaf("name", input);
}
//\[("operator\.and"|"keyword\.file_mode\.append"|"keyword\.array"|"keyword\.pass_mode\.by_reference"|"keyword\.pass_mode\.by_value"|"keyword\.call"|"keyword\.case"|"keyword\.class"|"keyword\.close_file"|"keyword\.constant"|"keyword\.declare"|"keyword\.define"|"operator\.integer_divide"|"keyword\.else"|"keyword\.case_end"|"keyword\.class_end"|"keyword\.function_end"|"keyword\.if_end"|"keyword\.procedure_end"|"keyword\.type_end"|"keyword\.while_end"|"boolean\.false"|"keyword\.for"|"keyword\.function"|"keyword\.get_record"|"keyword\.if"|"keyword\.inherits"|"keyword\.input"|"operator\.mod"|"keyword\.new"|"keyword\.for_end"|"operator\.not"|"keyword\.of"|"keyword\.open_file"|"operator\.or"|"keyword\.otherwise"|"keyword\.output"|"keyword\.class_modifier\.private"|"keyword\.procedure"|"keyword\.class_modifier\.public"|"keyword\.put_record"|"keyword\.file_mode\.random"|"keyword\.file_mode\.read"|"keyword\.read_file"|"keyword\.do_while"|"keyword\.return"|"keyword\.returns"|"keyword\.seek"|"keyword\.set"|"keyword\.step"|"keyword\.super"|"keyword\.then"|"keyword\.to"|"boolean\.true"|"keyword\.type"|"keyword\.dowhile_end"|"keyword\.while"|"keyword\.file_mode\.write"|"keyword\.write_file"|"operator\.assignment"|"operator\.greater_than_equal"|"operator\.less_than_equal"|"operator\.not_equal_to"|"operator\.equal_to"|"operator\.greater_than"|"operator\.less_than"|"operator\.add"|"operator\.minus"|"operator\.multiply"|"operator\.divide"|"operator\.pointer"|"operator\.string_concatenate"|"parentheses\.open"|"parentheses\.close"|"bracket\.open"|"bracket\.close"|"brace\.open"|"brace\.close"|"punctuation\.colon"|"punctuation\.semicolon"|"punctuation\.comma"|"punctuation\.period"|"newline"),( ?)".+?"\]


export function is_ExpressionASTArrayTypeNode(input:_ExpressionASTExt):input is _ExpressionASTArrayTypeNode {
	return Array.isArray(input) && input.length == 2 && (input[0] === null || Array.isArray(input[0]));
}

export function is_ExpressionASTRangeTypeNode(input:_ExpressionASTExt):input is _ExpressionASTRangeTypeNode {
	return Array.isArray(input) && input.length == 2 && typeof input[0] == "number" && typeof input[1] == "number";
}

export function process_Statement(input:_Statement):Statement {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	if(typeof input[0] == "string") return statement(...(input as [statementType:keyof typeof statementCreators, ...rest:any[]]));
	else return new input[0](new RangeArray(input[1].map(process_ExpressionASTExt), [-1, -1]));
}

export function process_ExpressionASTArrayTypeNode(input:_ExpressionASTArrayTypeNode):ExpressionASTArrayTypeNode {
	return new ExpressionASTArrayTypeNode(
		input[0]?.map(bounds => bounds.map(b => process_ExpressionAST(b))) ?? null,
		process_Token(input[1]),
		new RangeArray<Token>([process_Token(input[1])]) //SPECNULL
	);
}

export function process_ExpressionASTRangeTypeNode(input:_ExpressionASTRangeTypeNode):ExpressionASTRangeTypeNode {
	return new ExpressionASTRangeTypeNode(
		process_Token(input[0]), process_Token(input[1]),
		new RangeArray<Token>([], [-1, -1]) //SPECNULL
	);
}

export function process_ExpressionASTExt<TIn extends _ExpressionASTExt>(input:TIn):
	TIn extends _ExpressionASTTypeNode ? ExpressionASTTypeNode : StatementNode {
	if(is_ExpressionASTArrayTypeNode(input)) return process_ExpressionASTArrayTypeNode(input) as never;
	if(is_ExpressionASTRangeTypeNode(input)) return process_ExpressionASTRangeTypeNode(input) as never;
	else return (process_ExpressionAST(input) satisfies StatementNode) as never;
}

export function process_ExpressionAST<T extends _ExpressionAST | _Token>(input:T):ProcessedExpr<T>;
export function process_ExpressionAST(input:_ExpressionAST | _Token):ExpressionAST | ExpressionASTTypeNode | Token {
	if(typeof input == "string" || typeof input == "number" || input.length == 2){
		return process_ExpressionASTLeafNodeOrToken(input);
	} else {
		if(Array.isArray(input[1]) && input[1][0] == "array access"){
			return new ExpressionASTArrayAccessNode(
				process_ExpressionAST(input[1][1]),
				new RangeArray(input[2].map(process_ExpressionAST), [-1, -1]),
				new RangeArray([token("name", "_")], [-1, -1]) //SPECNULL
			);
		} else if(Array.isArray(input[1]) && input[1][0] == "function call"){
			const functionName = process_ExpressionAST(input[1][1]);
			if(functionName instanceof ExpressionASTBranchNode || functionName instanceof Token)
				return new ExpressionASTFunctionCallNode(
					functionName,
					new RangeArray(input[2].map(process_ExpressionAST), [-1, -1]),
					new RangeArray([token("name", "_")], [-1, -1]) //SPECNULL
				);
			else crash(`Invalid _ExpressionAST; function name must be an operator branch node or a leaf node`);
		} else if(Array.isArray(input[1]) && input[1][0] == "class instantiation"){
			return new ExpressionASTClassInstantiationNode(
				token("name", input[1][1]),
				new RangeArray(input[2].map(process_ExpressionAST), [-1, -1]),
				new RangeArray([token("name", "_")], [-1, -1]) //SPECNULL
			);
		} else {
			return new ExpressionASTBranchNode(
				operatorTokens[input[1]],
				operators[input[1]],
				new RangeArray(input[2].map(process_ExpressionAST), [-1, -1]),
				new RangeArray<Token>([operatorTokens[input[1]]], [-1, -1]) //SPECNULL
			);
		}
	}
}

export function process_ExpressionASTExtPreferToken<TIn extends _ExpressionASTExt | _Token>(input:TIn):
	TIn extends _ExpressionASTTypeNode ? ExpressionASTTypeNode : StatementNode | Token {
	if(is_ExpressionASTArrayTypeNode(input)) return process_ExpressionASTArrayTypeNode(input);
	if(is_ExpressionASTRangeTypeNode(input)) return process_ExpressionASTRangeTypeNode(input);
	if(typeof input == "string" || typeof input == "number" || input.length == 2) return process_Token(input);
	else return (process_ExpressionAST(input) satisfies StatementNode) as never;
}

export function process_ProgramAST(input:_ProgramAST, program:string = "" /* SPECNULL */):ProgramAST {
	return {
		program,
		nodes: ProgramASTNodeGroup.from(input.map(process_ProgramASTNode))
	};
}

export function process_ProgramASTNode(input:_ProgramASTNode):ProgramASTNode {
	return Array.isArray(input)
		? process_Statement(input)
		: new ProgramASTBranchNode(
			input.type,
			input.controlStatements.map(process_Statement) as never,
			input.nodeGroups.map(block => ProgramASTNodeGroup.from(block.map(process_ProgramASTNode))),
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
	return PrimitiveVariableType.get(input) ?? ["unresolved", input, [-1, -1]];
}
export function fakeStatement(type:typeof Statement):Statement {
	return fakeObject<Statement>({
		type
	});
}

/** Assigns potentially invalid values to a property, if the property has the expected type. */
function assignUnsafeChecked<T extends Record<K, unknown>, K extends PropertyKey>(object:T, key:K, value:jasmine.Expected<T[K]>){
	object[key] = value as never;
}

export const anyRange = [jasmine.any(Number), jasmine.any(Number)] as never as jasmine.AsymmetricMatcher<TextRange>;
/** Mutates input unsafely */
export function applyAnyRange<TIn extends
	StatementNode | Statement | ProgramASTBranchNode | ProgramAST | RangeArray<TextRanged2>
>(input:TIn):jasmine.Expected<TIn> {
	if(input instanceof RangeArray){
		assignUnsafeChecked(input, "range", anyRange);
	} else if(input instanceof Token){
		assignUnsafeChecked(input, "range", anyRange);
	} else if(input instanceof Statement){
		assignUnsafeChecked(input, "range", anyRange);
		applyAnyRange(input.nodes);
		input.nodes.forEach(applyAnyRange);
		forceType<Record<PropertyKey, unknown>>(input);
		for(const k in input){
			if(input[k] instanceof TypedNodeValue){
				assignUnsafeChecked(input[k] as TypedNodeValue, "range", anyRange);
			}
		}
	} else if(input instanceof ExpressionASTBranchNode){
		assignUnsafeChecked(input, "range", anyRange);
		assignUnsafeChecked(input, "allTokens", jasmine.any(Array));
		applyAnyRange(input.operatorToken);
		input.nodes.forEach(applyAnyRange);
	} else if(input instanceof ExpressionASTArrayAccessNode){
		assignUnsafeChecked(input, "range", anyRange);
		assignUnsafeChecked(input, "allTokens", jasmine.any(Array));
		applyAnyRange(input.target);
		input.indices.forEach(applyAnyRange);
	} else if(input instanceof ExpressionASTFunctionCallNode){
		assignUnsafeChecked(input, "range", anyRange);
		assignUnsafeChecked(input, "allTokens", jasmine.any(Array));
		applyAnyRange(input.functionName);
		input.args.forEach(applyAnyRange);
	} else if(input instanceof ExpressionASTClassInstantiationNode){
		assignUnsafeChecked(input, "range", anyRange);
		assignUnsafeChecked(input, "allTokens", jasmine.any(Array));
		applyAnyRange(input.className);
		input.args.forEach(applyAnyRange);
	} else if(input instanceof ExpressionASTArrayTypeNode){
		assignUnsafeChecked(input, "range", anyRange);
		assignUnsafeChecked(input, "allTokens", jasmine.any(Array));
		input.lengthInformation?.flat().forEach(applyAnyRange);
		applyAnyRange(input.elementType);
	} else if(input instanceof ExpressionASTRangeTypeNode){
		assignUnsafeChecked(input, "range", anyRange);
		assignUnsafeChecked(input, "allTokens", jasmine.any(Array));
		assignUnsafeChecked(input.low, "range", anyRange);
		assignUnsafeChecked(input.high, "range", anyRange);
	} else if(input instanceof ProgramASTBranchNode){
		input.controlStatements.forEach(applyAnyRange);
		input.nodeGroups.forEach(block => block.forEach(applyAnyRange));
	} else if("nodes" in input && "program" in input){
		input.nodes.forEach(applyAnyRange);
	} else {
		unreachable(input);
	}
	return input;
}

export function name(text:string):Token {
	return token("name", text);
}
export function num(text:string):Token {
	return token("number.decimal", text);
}

const statementCreators = {
	Declare: (variables:string | string[], type:string | _ExpressionASTArrayTypeNode) => new DeclareStatement(new RangeArray(([
		"keyword.declare",
		...[variables].flat().flatMap(variable => [
			["name", variable],
			"punctuation.comma"
		] satisfies _Token[] as _Token[]).slice(0, -1),
		"punctuation.colon",
		typeof type == "string" ? ["name", type] : type,
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExtPreferToken))),
	Constant: (variable:string, value:_ExpressionASTLeafNode) => new ConstantStatement(new RangeArray(([
		"keyword.constant",
		["name", variable],
		"operator.equal_to",
		value
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	Define: (name:string, values:_ExpressionASTLeafNode[], type:string) => new DefineStatement(new RangeArray(([
		"keyword.define",
		["name", name],
		"parentheses.open",
		...values.flatMap(value => [
			value,
			"punctuation.comma"
		] satisfies _Token[]).slice(0, -1),
		"parentheses.close",
		"punctuation.colon",
		["name", type],
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExtPreferToken))),
	TypePointer: (name:string, type:string | _ExpressionASTArrayTypeNode) => new TypePointerStatement(new RangeArray(([
		"keyword.type",
		["name", name],
		"operator.equal_to",
		"operator.pointer",
		typeof type == "string" ? ["name", type] : type,
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExtPreferToken))),
	TypeEnum: (name:string, values:string[]) => new TypeEnumStatement(new RangeArray(([
		"keyword.type",
		["name", name],
		"operator.equal_to",
		"parentheses.open",
		...values.flatMap(v => [["name", v], "punctuation.comma"] satisfies _Token[]).slice(0, -1),
		"parentheses.close",
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExtPreferToken))),
	TypeSet: (name:string, type:string) => new TypeSetStatement(new RangeArray(([
		"keyword.type",
		["name", name],
		"operator.equal_to",
		"keyword.set",
		"keyword.of",
		["name", type],
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExtPreferToken))),
	TypeRecord: (name:string) => new TypeRecordStatement(new RangeArray(([
		"keyword.type",
		["name", name],
	] satisfies _Token[]).map(process_Token))),
	Assignment: (target:_ExpressionAST, source:_ExpressionAST) => new AssignmentStatement(new RangeArray(([
		target,
		"operator.assignment",
		source,
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt) as never)),
	Output: (...variables:_Token[]) => new OutputStatement(new RangeArray(([
		"keyword.output",
		...variables,
	] satisfies _Token[]).map(process_Token))),
	Input: (variable:_ExpressionAST) => new InputStatement(new RangeArray(([
		"keyword.input",
		variable,
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	Return: (expr:_ExpressionAST) => new ReturnStatement(new RangeArray(([
		"keyword.return",
		expr,
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	Call: (func:_ExpressionAST) => new CallStatement(new RangeArray(([
		"keyword.call",
		func,
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	If: (expr:_ExpressionAST) => new IfStatement(new RangeArray(([
		"keyword.if",
		expr,
		"keyword.then",
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	Else: () => new ElseStatement(new RangeArray(([
		"keyword.else",
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	IfEnd: () => new statements.byType["if.end"](new RangeArray(([
		"keyword.if_end"
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	Switch: (expr:_ExpressionAST) => new SwitchStatement(new RangeArray(([
		"keyword.case",
		"keyword.of",
		expr
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	SwitchEnd: () => new statements.byType["switch.end"](new RangeArray(([
		"keyword.case_end"
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	CaseBranch: (expr:_Token) => new CaseBranchStatement(new RangeArray(([
		expr,
		"punctuation.colon",
	] satisfies _Token[]).map(process_ExpressionASTExt))),
	CaseBranchRange: (from:_Token, to:_Token) => new CaseBranchRangeStatement(new RangeArray(([
		from,
		"keyword.to",
		to,
		"punctuation.colon",
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt) as never)),
	For: (variable:_Token, from:_ExpressionAST, to:_ExpressionAST) => new ForStatement(new RangeArray((([
		"keyword.for",
		variable,
	] satisfies _Token[]).map(process_Token) as ExpressionAST[]).concat(([
		"operator.assignment",
		from,
		"keyword.to",
		to,
	] satisfies _ExpressionAST[]).map(process_ExpressionASTExt) as never))),
	ForStep: (variable:_Token, from:_ExpressionAST, to:_ExpressionAST, step:_ExpressionAST) => new ForStepStatement(new RangeArray((([
		"keyword.for",
		variable,
	] satisfies _Token[]).map(process_Token) as ExpressionAST[]).concat(([
		"operator.assignment",
		from,
		"keyword.to",
		to,
		"keyword.step",
		step
	] satisfies _ExpressionAST[]).map(process_ExpressionASTExt) as never))),
	ForEnd: (variable:string) => new ForEndStatement(new RangeArray(([
		"keyword.for_end",
		["name", variable]
	] satisfies _Token[]).map(process_Token))),
	While: (expr:_ExpressionAST) => new WhileStatement(new RangeArray(([
		"keyword.while",
		expr,
	] satisfies _ExpressionAST[]).map(process_ExpressionASTExt))),
	WhileEnd: () => new statements.byType["while.end"](new RangeArray(([
		"keyword.while_end"
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	DoWhile: () => new statements.byType["do_while"](new RangeArray(([
		"keyword.do_while"
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	DoWhileEnd: (expr:_ExpressionASTNode) => new DoWhileEndStatement(new RangeArray(([
		"keyword.dowhile_end",
		expr
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	Function: (name:string, args:[string, string | _Token[]][], returnType:string | _ExpressionASTArrayTypeNode) => new FunctionStatement(new RangeArray(([
		"keyword.function",
		["name", name],
		"parentheses.open",
		...args.flatMap(([argName, type]) => [
			["name", argName],
			"punctuation.colon",
			...(Array.isArray(type) ? type : [["name", type] as _Token]),
			"punctuation.comma"
		] satisfies _Token[] as _Token[]).slice(0, -1),
		"parentheses.close",
		"keyword.returns",
		returnType
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExtPreferToken) as never)),
	FunctionEnd: () => new statements.byType["function.end"](new RangeArray(([
		"keyword.function_end"
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	Procedure: (name:string, args:[string, string | _Token[]][]) => new ProcedureStatement(new RangeArray(([
		"keyword.procedure",
		["name", name],
		"parentheses.open",
		...args.flatMap(([argName, type]) => [
			["name", argName],
			"punctuation.colon",
			...(Array.isArray(type) ? type : [["name", type] as _Token]),
			"punctuation.comma"
		] satisfies _Token[] as _Token[]).slice(0, -1),
		"parentheses.close",
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExtPreferToken) as never)),
	ProcedureEnd: () => new statements.byType["procedure.end"](new RangeArray(([
		"keyword.procedure_end"
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	TypeEnd: () => new statements.byType["type.end"](new RangeArray(([
		"keyword.type_end"
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	OpenFile: (filename:_ExpressionAST, mode:FileMode) => new OpenFileStatement(new RangeArray(([
		"keyword.open_file",
		filename,
		"keyword.for",
		`keyword.file_mode.${mode.toLowerCase() as Lowercase<FileMode>}` as const satisfies TokenType
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	CloseFile: (filename:_ExpressionAST) => new CloseFileStatement(new RangeArray(([
		"keyword.close_file",
		filename,
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	ReadFile: (filename:_ExpressionAST, variable:_ExpressionAST) => new ReadFileStatement(new RangeArray(([
		"keyword.read_file",
		filename,
		"punctuation.comma",
		variable,
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	WriteFile: (filename:_ExpressionAST, variable:_ExpressionAST) => new WriteFileStatement(new RangeArray(([
		"keyword.write_file",
		filename,
		"punctuation.comma",
		variable,
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	Class: (name:string) => new ClassStatement(new RangeArray(([
		"keyword.class",
		["name", name]
	] satisfies _Token[]).map(process_Token))),
	ClassInherits: (name:string, base:string) => new ClassInheritsStatement(new RangeArray(([
		"keyword.class",
		["name", name],
		"keyword.inherits",
		["name", base]
	] satisfies _Token[]).map(process_Token))),
	ClassEnd: () => new statements.byType["class.end"](new RangeArray(([
		"keyword.class_end"
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	ClassProperty: (accessModifier:"public" | "private", variables:string | string[], type:string | _ExpressionASTArrayTypeNode) => new ClassPropertyStatement(new RangeArray(([
		TokenType("keyword.class_modifier." + accessModifier),
		...[variables].flat().flatMap(variable => [
			["name", variable],
			"punctuation.comma"
		] satisfies _Token[] as _Token[]).slice(0, -1),
		"punctuation.colon",
		typeof type == "string" ? ["name", type] : type,
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExtPreferToken))),
	ClassProcedure: (accessModifier:"public" | "private", name:string, args:[string, string | _Token[]][]) => new ClassProcedureStatement(new RangeArray(([
		TokenType("keyword.class_modifier." + accessModifier),
		"keyword.procedure",
		["name", name],
		"parentheses.open",
		...args.flatMap(([argName, type]) => [
			["name", argName],
			"punctuation.colon",
			...(Array.isArray(type) ? type : [["name", type] as _Token]),
			"punctuation.comma"
		] satisfies _Token[] as _Token[]).slice(0, -1),
		"parentheses.close",
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExtPreferToken) as never)),
	ClassFunction: (accessModifier:"public" | "private", name:string, args:[string, string | _Token[]][], returnType:string | _ExpressionASTArrayTypeNode) => new ClassFunctionStatement(new RangeArray(([
		TokenType("keyword.class_modifier." + accessModifier),
		"keyword.function",
		["name", name],
		"parentheses.open",
		...args.flatMap(([argName, type]) => [
			["name", argName],
			"punctuation.colon",
			...(Array.isArray(type) ? type : [["name", type] as _Token]),
			"punctuation.comma"
		] satisfies _Token[] as _Token[]).slice(0, -1),
		"parentheses.close",
		"keyword.returns",
		returnType
	] satisfies _ExpressionASTExt[]).map(process_ExpressionASTExtPreferToken) as never)),
	ClassProcedureEnd: () => new statements.byType["class_procedure.end"](new RangeArray(([
		"keyword.procedure_end"
	] satisfies _Token[]).map(process_Token))),
	ClassFunctionEnd: () => new statements.byType["class_function.end"](new RangeArray(([
		"keyword.function_end"
	] satisfies _Token[]).map(process_Token))),
};
export function statement<T extends keyof typeof statementCreators>(statementName:T, ...args:Parameters<(typeof statementCreators)[T]>){
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	return (statementCreators[statementName] as any)(...args) as Statement;
}

export function classType(
	statement: ClassStatement,
	properties: Record<string, [VariableType, ClassPropertyStatement]> = {},
	ownMethods: Record<string, _ProgramASTBranchNode> = {},
	allMethods?: Record<string, [ClassVariableType, ClassMethodData]>,
){
	const clazz = new ClassVariableType(
		true,
		statement,
		Object.fromEntries(Object.entries(properties).map(([k, [type, s]]) => [k, [type, s, [-1, -1]]])),
		Object.fromEntries(Object.entries(ownMethods).map(([k, v]) => [k, process_ProgramASTNode(v) as ClassMethodData])),
		allMethods
	);
	if(!allMethods) clazz.allMethods = Object.fromEntries(Object.entries(clazz.ownMethods).map(
		([k, v]) => [k, [clazz, v]]
	));
	return clazz;
}
export function arrayType(
	processedLengthInformation: [low:number, high:number][] | null,
	elementType: VariableType,
	init = true,
){
	const type = new ArrayVariableType(processedLengthInformation?.map(r => r.map(v => eleaf("number.decimal", v.toString()))) ?? null, [-1, -1], elementType, [-1, -1]);
	if(init) type.init(fakeObject<Runtime>({
		evaluateExpr(expr:ExpressionAST, type?:VariableType | "variable" | "function"){
			if(typeof type == "string") impossible();
			if(expr instanceof Token) return Runtime.evaluateExprLeaf(expr, type) as never;
			else impossible();
		}
	}));
	return type;
}

export function typeExtends<A extends B, B>(){
	crash(`Do not call this function`);
}
