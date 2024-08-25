import { Symbol, SymbolType, Token, TokenType } from "../../build/lexer-types.js";
import { tokenTextMapping } from "../../build/lexer.js";
import { ExpressionAST, ExpressionASTArrayAccessNode, ExpressionASTArrayTypeNode, ExpressionASTBranchNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, ExpressionASTLeafNode, ExpressionASTNodeExt, ExpressionASTRangeTypeNode, ExpressionASTTypeNode, Operator, OperatorType, ProgramAST, ProgramASTBranchNode, ProgramASTBranchNodeType, ProgramASTLeafNode, ProgramASTNode, operators } from "../../build/parser-types.js";
import { ArrayVariableType, ClassMethodData, ClassVariableType, TypedNodeValue, PrimitiveVariableType, PrimitiveVariableTypeName, UnresolvedVariableType, VariableType } from "../../build/runtime-types.js";
import { Runtime } from "../../build/runtime.js";
import { ClassFunctionStatement, ClassInheritsStatement, ClassProcedureStatement, ClassPropertyStatement, ClassStatement, DeclareStatement, DoWhileEndStatement, ForEndStatement, FunctionStatement, OutputStatement, ProcedureStatement, Statement, SwitchStatement, statements } from "../../build/statements.js";
import type { TextRange, TextRanged2 } from "../../build/types.js";
import { RangeArray, crash, fakeObject, forceType, impossible } from "../../build/utils.js";


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

export type _Operator = OperatorType;

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

export type Processed<T> =
	T extends _Symbol ? Symbol :
	T extends _Token ? Token :
	T extends _ExpressionAST ? ExpressionAST :
	T extends _ExpressionASTLeafNode ? ExpressionASTLeafNode :
	T extends _ExpressionASTOperatorBranchNode ? ExpressionASTBranchNode :
	T extends _ExpressionASTBranchNode ? ExpressionASTBranchNode | ExpressionASTArrayAccessNode | ExpressionASTFunctionCallNode | ExpressionASTClassInstantiationNode :
	T extends _ExpressionASTArrayTypeNode ? ExpressionASTArrayTypeNode :
	T extends _ExpressionASTRangeTypeNode ? ExpressionASTRangeTypeNode :
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

export const operatorTokens: Record<OperatorType, Token> = {
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
	return new Token(type, text, [-1, -1]);
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
//\[("operator\.and"|"keyword\.file_mode\.append"|"keyword\.array"|"keyword\.pass_mode\.by_reference"|"keyword\.pass_mode\.by_value"|"keyword\.call"|"keyword\.case"|"keyword\.class"|"keyword\.close_file"|"keyword\.constant"|"keyword\.declare"|"keyword\.define"|"operator\.integer_divide"|"keyword\.else"|"keyword\.case_end"|"keyword\.class_end"|"keyword\.function_end"|"keyword\.if_end"|"keyword\.procedure_end"|"keyword\.type_end"|"keyword\.while_end"|"boolean\.false"|"keyword\.for"|"keyword\.function"|"keyword\.get_record"|"keyword\.if"|"keyword\.inherits"|"keyword\.input"|"operator\.mod"|"keyword\.new"|"keyword\.for_end"|"operator\.not"|"keyword\.of"|"keyword\.open_file"|"operator\.or"|"keyword\.otherwise"|"keyword\.output"|"keyword\.class_modifier\.private"|"keyword\.procedure"|"keyword\.class_modifier\.public"|"keyword\.put_record"|"keyword\.file_mode\.random"|"keyword\.file_mode\.read"|"keyword\.read_file"|"keyword\.dowhile"|"keyword\.return"|"keyword\.returns"|"keyword\.seek"|"keyword\.set"|"keyword\.step"|"keyword\.super"|"keyword\.then"|"keyword\.to"|"boolean\.true"|"keyword\.type"|"keyword\.dowhile_end"|"keyword\.while"|"keyword\.file_mode\.write"|"keyword\.write_file"|"operator\.assignment"|"operator\.greater_than_equal"|"operator\.less_than_equal"|"operator\.not_equal_to"|"operator\.equal_to"|"operator\.greater_than"|"operator\.less_than"|"operator\.add"|"operator\.minus"|"operator\.multiply"|"operator\.divide"|"operator\.pointer"|"operator\.string_concatenate"|"parentheses\.open"|"parentheses\.close"|"bracket\.open"|"bracket\.close"|"brace\.open"|"brace\.close"|"punctuation\.colon"|"punctuation\.semicolon"|"punctuation\.comma"|"punctuation\.period"|"newline"),( ?)".+?"\]


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
	TIn extends _ExpressionASTTypeNode ? ExpressionASTTypeNode : ExpressionASTNodeExt {
	if(is_ExpressionASTArrayTypeNode(input)) return process_ExpressionASTArrayTypeNode(input) as never;
	if(is_ExpressionASTRangeTypeNode(input)) return process_ExpressionASTRangeTypeNode(input) as never;
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
	ExpressionASTNodeExt | Statement | ProgramASTBranchNode | ProgramAST | RangeArray<TextRanged2>
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

const statementCreators = {
	Declare: (variables:string | string[], type:string | _ExpressionASTArrayTypeNode) => new DeclareStatement(new RangeArray(([
		"keyword.declare",
		...[variables].flat().flatMap(variable => [
			["name", variable],
			"punctuation.comma"
		] satisfies _Token[] as _Token[]).slice(0, -1),
		"punctuation.colon",
		typeof type == "string" ? ["name", type] : type,
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt) as never)),
	Output: (...variables:_Token[]) => new OutputStatement(new RangeArray(([
		"keyword.output",
		...variables,
	] satisfies _Token[] as _Token[]).map(process_ExpressionASTExt) as never)),
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
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt) as never)),
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
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt) as never)),
	FunctionEnd: () => new statements.byType["function.end"](new RangeArray(([
		"keyword.function_end"
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	ProcedureEnd: () => new statements.byType["procedure.end"](new RangeArray(([
		"keyword.procedure_end"
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	TypeEnd: () => new statements.byType["type.end"](new RangeArray(([
		"keyword.type_end"
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	IfEnd: () => new statements.byType["if.end"](new RangeArray(([
		"keyword.if_end"
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	Switch: (expr:_ExpressionAST) => new SwitchStatement(new RangeArray(([
		"keyword.case",
		"keyword.of",
		expr
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt) as never)),
	SwitchEnd: () => new statements.byType["switch.end"](new RangeArray(([
		"keyword.case_end"
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	ForEnd: (variable:string) => new ForEndStatement(new RangeArray(([
		"keyword.for_end",
		["name", variable]
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt) as never)),
	WhileEnd: () => new statements.byType["while.end"](new RangeArray(([
		"keyword.while_end"
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	DoWhile: () => new statements.byType["dowhile"](new RangeArray(([
		"keyword.dowhile"
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	DoWhileEnd: (expr:_ExpressionASTNode) => new DoWhileEndStatement(new RangeArray(([
		"keyword.dowhile_end",
		expr
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt) as never)),
	Class: (name:string) => new ClassStatement(new RangeArray(([
		"keyword.class",
		["name", name]
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt) as never)),
	ClassInherits: (name:string, base:string) => new ClassInheritsStatement(new RangeArray(([
		"keyword.class",
		["name", name],
		"keyword.inherits",
		["name", base]
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt) as never)),
	ClassEnd: () => new statements.byType["class.end"](new RangeArray(([
		"keyword.class_end"
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	ClassProperty: (accessModifier:"public" | "private", variables:string | string[], type:string | _ExpressionASTArrayTypeNode) => new ClassPropertyStatement(new RangeArray(([
		TokenType("keyword.class_modifier." + accessModifier),
		...[variables].flat().flatMap(variable => [
			["name", variable],
			"punctuation.comma"
		] satisfies _Token[] as _Token[]).slice(0, -1),
		"punctuation.colon",
		typeof type == "string" ? ["name", type] : type,
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt) as never)),
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
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt) as never)),
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
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt) as never)),
	ClassProcedureEnd: () => new statements.byType["class_procedure.end"](new RangeArray(([
		"keyword.procedure_end"
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt))),
	ClassFunctionEnd: () => new statements.byType["class_function.end"](new RangeArray(([
		"keyword.function_end"
	] satisfies _ExpressionASTExt[] as _ExpressionASTExt[]).map(process_ExpressionASTExt))),
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
		properties,
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
){
	const type = new ArrayVariableType(processedLengthInformation?.map(r => r.map(v => token("number.decimal", v.toString()))) ?? null, [-1, -1], elementType, [-1, -1]);
	type.init(fakeObject<Runtime>({
		evaluateExpr(expr:ExpressionAST, type?:VariableType | "variable" | "function"){
			if(typeof type == "string") impossible();
			if(expr instanceof Token) return Runtime.evaluateToken(expr, type) as never;
			else impossible();
		}
	}));
	return type;
}

export function typeExtends<A extends B, B>(){
	crash(`Do not call this function`);
}
