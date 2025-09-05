/* @license
Copyright © <BalaM314>, 2025. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the parser, which takes a list of tokens
and processes it into an abstract syntax tree (AST),
which is the preferred representation of the program.
*/


import { Token, TokenizedProgram, tokenTextMapping, TokenType } from "../lexer/index.js";
import { ArrayVariableType, IntegerRangeVariableType, PrimitiveVariableType, UnresolvedVariableType } from "../runtime/runtime-types.js";
import { CaseBranchRangeStatement, CaseBranchStatement, FunctionArgumentDataPartial, FunctionArgumentPassMode, FunctionArguments, Statement, statements } from "../statements/index.js";
import { biasedLevenshtein, crash, errorBoundary, ErrorMessage, f, fail, fakeObject, forceType, impossible, isKey, max, quote, RangeArray, RichErrorMessage, SoodocodeError, tryRun, unreachable } from "../utils/funcs.js";
import { PartialKey, TextRange, TextRangeLike } from "../utils/types.js";
import { closestKeywordToken, displayTokenMatcher, findLastNotInGroup, manageNestLevel, splitTokens, splitTokensOnComma } from "./funcs.js";
import { ExpressionASTArrayAccessNode, ExpressionASTArrayTypeNode, ExpressionASTBranchNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, ExpressionASTLeafNode, ExpressionASTNode, ExpressionASTRangeTypeNode, ExpressionASTTypeNode, expressionLeafNodeTypes, literalTypes, Operator, operators, operatorsByPriority, ProgramAST, ProgramASTBranchNode, ProgramASTBranchNodeType, ProgramASTNodeGroup, TokenMatcher } from "./parser-types.js";


/** Parses function arguments (everything between the parentheses), such as `x:INTEGER, BYREF y, z:DATE` into a Map containing their data */
export const parseFunctionArguments = errorBoundary()(function _parseFunctionArguments(tokens:RangeArray<Token>):FunctionArguments {
	//special case: blank
	if(tokens.length == 0) return new Map();

	//Use state variables to remember the previous pass mode / type
	//to handle things like `BYREF a, b, c, d: INTEGER`
	let passMode:FunctionArgumentPassMode = "value";
	let type:(() => UnresolvedVariableType) | null = null;
	//Split the arguments on commas
	const argumentz = splitTokensOnComma(tokens).map<FunctionArgumentDataPartial>(section => {

		let passMode:FunctionArgumentPassMode | null;
		let type:(() => UnresolvedVariableType) | null;

		//Increase the offset by 1 to ignore the pass mode specifier if present
		let offset = 0;
		if(section[0]?.type == "keyword.pass_mode.by_reference"){
			offset = 1;
			passMode = "reference";
		} else if(section[0]?.type == "keyword.pass_mode.by_value"){
			offset = 1;
			passMode = "value";
		} else passMode = null;

		//There must be a name
		if(section[offset + 0]?.type != "name")
			fail(`Expected a name, got ${quote(section[offset + 0]) ?? "end of function arguments"}`, section[offset + 0] ?? (section[offset - 1] ?? tokens.at(-1)).rangeAfter());

		//If the name is the only thing present, then the type is specified later, leave it as null
		if(section.length == offset + 1){
			type = null;
		} else {
			//Expect a colon
			if(section[offset + 1]?.type != "punctuation.colon")
				fail(`Expected a colon, got ${quote(section[offset + 1]) ?? "end of function arguments"}`, section[offset + 1] ?? (section[offset + 0] ?? tokens.at(-1)).rangeAfter());
			const typeTokens = section.slice(offset + 2);
			if(typeTokens.length == 0)
				fail(`Expected a type, got end of function arguments`, section.at(-1)!.rangeAfter());
			type = () => processTypeData(parseType(typeTokens, tokens));
		}
		return [
			section[offset + 0], //pass the token through so we can use it to generate errors
			{ passMode, type }
		];
	})
		.map<[name:Token, {type:(() => UnresolvedVariableType) | null, passMode:FunctionArgumentPassMode}]>(([name, data]) => [name, {
			passMode: data.passMode ? passMode = data.passMode : passMode,
			type: data.type
		}])
		.reverse()
		.map(([name, data]) => [name, {
			passMode: data.passMode,
			type: (data.type ? type = data.type : type ?? fail(f.quote`Type not specified for function argument ${name}`, name))()
		}] as const)
		.reverse();
	const argumentsMap:FunctionArguments = new Map(argumentz.map(([name, data]) => [name.text, data] as const));
	if(argumentsMap.size != argumentz.length){
		const [duplicateArgument] = argumentz.find((a, i) => argumentz.find((b, j) => a[0].text == b[0].text && i != j)) ??
			crash(f.debug`Unable to find the duplicate function argument in ${tokens}`);
		fail(f.quote`Duplicate function argument ${duplicateArgument}`, duplicateArgument);
	}
	return argumentsMap;
});

/** Processes an ExpressionASTTypeNode into an UnresolvedVariableType. */
export const processTypeData = errorBoundary()(function _processTypeData(typeNode:ExpressionASTTypeNode):UnresolvedVariableType {
	if(typeNode instanceof Token){
		return PrimitiveVariableType.resolve(typeNode);
	} else if(typeNode instanceof ExpressionASTArrayTypeNode){
		return ArrayVariableType.from(typeNode);
	} else if(typeNode instanceof ExpressionASTRangeTypeNode){
		return IntegerRangeVariableType.from(typeNode);
	} else unreachable(typeNode);
});

/** Parses an ExpressionASTTypeNode from a list of tokens. */
export function parseType(tokens:RangeArray<Token>, gRange:TextRangeLike):ExpressionASTTypeNode {
	if(tokens.length == 0) crash(`Cannot parse empty type`);

	function _fail(message:PartialKey<RichErrorMessage, "summary">, range:TextRangeLike = tokens):never {
		fail({
			summary: f.quoteRange`${tokens} is not a valid type`,
			...message
		}, range, gRange);
	}

	//Builtin or reference to user defined type
	if(checkTokens(tokens, ["name"])) return tokens[0];

	//Range type
	if(checkTokens(tokens, ["number.decimal", "operator.range", "number.decimal"]))
		return new ExpressionASTRangeTypeNode(
			tokens[0], tokens[2], tokens
		);

	//Array type
	if(checkTokens(tokens, ["keyword.array", "keyword.of", "name"])) return new ExpressionASTArrayTypeNode(null, tokens.at(-1)!, tokens);
	if(checkTokens(tokens, ["keyword.array", "bracket.open", ".+", "bracket.close", "keyword.of", "name"]))
		return new ExpressionASTArrayTypeNode(
			splitTokensOnComma(tokens.slice(2, -3)).map((group) => {
				const groups = splitTokens(group, "punctuation.colon");
				if(groups.length != 2) fail({
					summary: f.quoteRange`Invalid array range specifier ${group}`,
					elaboration: `must consist of two expressions separated by a colon`
				}, group, gRange);
				return (groups as [RangeArray<Token>, RangeArray<Token>]).map(a => parseExpression(a));
			}),
			tokens.at(-1)!,
			tokens
		);
	
	//Invalid, find the best error message
	if(checkTokens(tokens, ["keyword.array"])) _fail({
		help: `specify the type of the array, like this: "ARRAY[1:10] OF STRING"`
	});
	if(tokens.length <= 1) _fail({
		elaboration: f.quote`expected the name of a builtin or user-defined type, or an array type definition, like "ARRAY[1:10] OF STRING"`
	});
	if(checkTokens(tokens, ["keyword.array", "bracket.open", ".+", "bracket.close", ".*"]))
		_fail({help: `specify the type of the array, like this: "ARRAY[1:10] OF STRING"`});
	if(checkTokens(tokens, ["keyword.array", "parentheses.open", ".+", "parentheses.close", "keyword.of", "name"])) _fail({
		help: `array range specifiers use square brackets, like this: "ARRAY[1:10] OF STRING"`
	});
	if(checkTokens(tokens, ["keyword.set"])) _fail({
		help: `Please specify the type of the set, like this: "SET OF STRING"`
	});
	if(checkTokens(tokens, ["keyword.set", "keyword.of", "name"])) _fail({
		elaboration: `Set types cannot be specified inline`,
		help: [f.range`please create a type alias first, like this: TYPE yournamehere = SET OF ${tokens[2]}`]
	});
	if(checkTokens(tokens, ["operator.pointer", "name"])) _fail({
		elaboration: `Pointer types cannot be specified inline`,
		help: [f.range`please create a type alias first, like this: TYPE p${tokens[1].text} = ^${tokens[1].text}`]
	});
	_fail({});
}

/** Determines statement boundaries given a token list. Usually splits on newlines, with a few special cases. */
export function splitTokensToStatements(tokens:RangeArray<Token>):RangeArray<Token>[] {
	const statementData:[statement:typeof Statement, length:number][] = [
		[CaseBranchStatement, 2],
		[CaseBranchStatement, 3],
		[CaseBranchRangeStatement, 4],
		[CaseBranchRangeStatement, 5],
		[CaseBranchRangeStatement, 6],
	];
	return splitTokens(tokens.select((token, i) => !(
		//Delete newlines immediately preceding a THEN
		token.type == "newline" && tokens[i + 1]?.type == "keyword.then"
	)), "newline").map(ts => {
		for(const [statement, length] of statementData){
			if(ts.length > length && Array.isArray(checkStatement(statement, ts.slice(0, length), false)))
				return [ts.slice(0, length), ts.slice(length)];
		}
		return [ts];
	}).flat(1).filter(ts => ts.length > 0); //remove blank lines
}

/**
 * Main parser function.
 * Converts a list of tokens into a fully parsed AST.
 */
export function parse({program, tokens}:TokenizedProgram):ProgramAST {
	const lines:RangeArray<Token>[] = splitTokensToStatements(tokens);
	const programNodes = new ProgramASTNodeGroup();
	function getActiveBuffer(){
		if(blockStack.length == 0) return programNodes;
		else return blockStack.at(-1)!.nodeGroups.at(-1)!;
	}
	const blockStack:ProgramASTBranchNode[] = [];
	for(const line of lines){
		const statement = parseStatement(line, blockStack.at(-1) ?? null, true);
		if(statement.category == "normal"){
			getActiveBuffer().push(statement);
		} else if(statement.category == "block"){
			const node = new ProgramASTBranchNode(
				ProgramASTBranchNodeType(statement.type.branchNodeType),
				[statement] as never, //will be mutated later
				[new ProgramASTNodeGroup()]
			);
			getActiveBuffer().push(node);
			blockStack.push(node);
		} else if(statement.category == "block_end"){
			const lastNode = blockStack.at(-1);
			if(!lastNode) fail(`Unexpected statement: no open blocks`, statement);
			else if(statement instanceof lastNode.controlStatements[0].type.blockEndStatement<Function>()){
				lastNode.controlStatements_().push(statement);
				lastNode.controlStatements[0].type.checkBlock(lastNode);
				blockStack.pop();
			} else fail(f.quote`Unexpected statement: current block is of type ${lastNode.typeName()}`, statement, null);
		} else if(statement.category == "block_multi_split"){
			const lastNode = blockStack.at(-1);
			if(!lastNode) fail(`Unexpected statement: ${statement.stype} statements must be inside a block`, statement, null);
			let errorMessage:true | string;
			if((errorMessage = lastNode.controlStatements[0].type.supportsSplit(lastNode, statement)) !== true)
				fail(`Unexpected statement: ${errorMessage}`, statement, null);
			lastNode.controlStatements_().push(statement);
			lastNode.nodeGroups.push(new ProgramASTNodeGroup());
		} else unreachable(statement.category);
	}
	if(blockStack.length)
		fail(f.quote`There were unclosed blocks: ${blockStack.at(-1)!.controlStatements[0]} requires a matching ${blockStack.at(-1)!.controlStatements[0].type.blockEndStatement().type} statement`, blockStack.at(-1)!.controlStatements[0], null);
	return {
		program,
		nodes: programNodes
	};
}

/**
 * Decides which statement definitions should be checked against, given a list of tokens.
 * Only checking a subset of statement definitions helps improve error accuracy and performance.
 * May return a deferred error function, which should be called if any of the statements parse successfully.
 */
export function getPossibleStatements(tokens:RangeArray<Token>, context:ProgramASTBranchNode | null | "any"):[
	definitions: (typeof Statement)[],
	error: ((valid:typeof Statement) => never) | null,
]{
	let validStatements =
	//Try to use the list of statements that start with the first token, if any exist.
	statements.byStartKeyword[tokens[0].type]
	?? (() => {
		const closest = closestKeywordToken(tokens[0].text);
		//Check if there are statements that start with a keyword that is close to the first token
		//eg if the statement is "OUTPUY 5"
		//Add those statements into the pool
		if(closest && statements.byStartKeyword[closest]){
			return [...statements.irregular, ...statements.byStartKeyword[closest]];
		} else {
			//Otherwise, just return the irregular statements
			return statements.irregular;
		}
	})();
	
	//If the current block only allows certain statements
	if(context != "any"){
		const ctx = context?.controlStatements[0].type;
		if(ctx?.allowOnly){
			const allowedValidStatements = validStatements.filter(s => ctx.allowOnly!.has(s.type) || (ctx.category == "block" && ctx.blockEndStatement() == s));
			if(allowedValidStatements.length == 0){
				//None of the possible statements are allowed
				//Return them anyway, and throw the error later
				return [
					validStatements,
					statement => fail(`${statement.typeName()} statement is not valid here: the only statements allowed in ${context!.type} blocks are ${[...ctx.allowOnly!].map(s => `"${Statement.typeName(s)}"`).join(", ")}`, tokens)
				];
			} else validStatements = allowedValidStatements;
		}
	}

	if(validStatements.length == 0) fail(`No valid statement definitions`, tokens);

	//Remove all statements that require a different block type
	const allowedValidStatements = validStatements.filter(s => context == "any" || !(
		s.blockType && s.blockType != context?.type.split(".")[0]
	));
	if(allowedValidStatements.length == 0){
		//Return them anyway, and throw the error later
		//None of the possible statements are allowed
		return [
			validStatements,
			statement => fail(`${statement.typeName()} statement is only valid in ${ProgramASTBranchNode.typeName(statement.blockType!)} blocks`, tokens)
		];
	} else validStatements = allowedValidStatements;

	return [validStatements, null];
}

/**
 * Parses a string of tokens into a Statement.
 * @argument tokens must not contain any newlines.
 **/
export const parseStatement = errorBoundary()(function _parseStatement(tokens:RangeArray<Token>, context:ProgramASTBranchNode | null | "any", allowRecursiveCall:boolean):Statement {
	if(tokens.length <= 0) crash("Empty statement");

	const [possibleStatements, statementError] = getPossibleStatements(tokens, context);
	
	const errors:(StatementCheckFailResult & {err?:SoodocodeError;})[] = [];
	for(const possibleStatement of possibleStatements){
		const result = checkStatement(possibleStatement, tokens, allowRecursiveCall);
		if(Array.isArray(result)){ //if the statement is valid
			if(possibleStatement.invalidMessage){
				if(typeof possibleStatement.invalidMessage == "function"){
					if(context == "any") context = null;
					const [message, range] = possibleStatement.invalidMessage(result, context);
					fail(message, range ?? tokens);
				} else {
					fail(possibleStatement.invalidMessage, tokens);
				}
			}
			const [out, err] = tryRun(() => new possibleStatement(new RangeArray(result.map(part => {
				if(part instanceof Token) return part;
				if(part.type == "token"){
					const negativeNumber = tokens[part.end].clone();
					negativeNumber.extendRange(tokens[part.start]);
					negativeNumber.text = tokens[part.start].text + negativeNumber.text;
					return parseExpressionLeafNode(negativeNumber);
				}
				const tks = tokens.slice(part.start, part.end + 1);
				if(part.type == "expression") return parseExpression(tks);
				return parseType(tks, tokens);
			}))));
			if(out){
				if(statementError)
					statementError(possibleStatement);
				else return out;
			} else errors.push({
				message: err.message,
				priority: 10,
				range: err.rangeSpecific ?? null,
				err
			});
		} else {
			if(possibleStatement.suppressErrors) result.priority = 0;
			errors.push(result);
		}
	}
	//Statement is invalid, choose the most relevant error message
	//Check if it's a valid expression
	const [expr] = tryRun(() => parseExpression(tokens));
	if(expr){
		if(expr instanceof ExpressionASTLeafNode && expr.type == "name"){
			//Expression is a single identifier, so it probably wasn't meant to be an expression
			if(expr.text.toLowerCase().includes("help")) fail({
				summary: `Expected a statement, not an expression`,
				help: [
					{
						text: `for the language specification, see https://www.cambridgeinternational.org/Images/697401-2026-pseudocode-guide-for-teachers.pdf`,
						html: `for the language specification, <a href="https://www.cambridgeinternational.org/Images/697401-2026-pseudocode-guide-for-teachers.pdf">click here</a>`,
					},{
						text: `for a small example program, write \`OUTPUT "Hello, world!"\``,
						html: `<span class="error-message-help-clickable" onclick='document.getElementById("soodocode-input").value = \`OUTPUT "Hello, world!"\`'>for a small example program, click here</span>`
					},{
						text: `for a list of sample programs, see https://github.com/BalaM314/soodocode/tree/master/programs/programs`,
						html: `<span class="error-message-help-clickable" onclick='document.getElementById("sample-programs-dialog").showModal()'>for a list of sample programs, click here</span>`
					}
				],
			}, tokens);
			else {
				let help = undefined;
				const keyword = closestKeywordToken(expr.text);
				if(keyword) help = [
					`did you mean "${tokenTextMapping[keyword as keyof typeof tokenTextMapping]}"`
				];
				fail({
					summary: `Invalid statement`,
					help
				}, tokens);
			}
		} else if(expr instanceof ExpressionASTFunctionCallNode)
			fail({
				summary: `Expected a statement, not an expression`,
				help: [f.range`use the CALL statement to evaluate this expression, by changing the line to "CALL ${tokens}"`],
			}, tokens);
		else fail(`Expected a statement, not an expression`, tokens);
	}

	//Fail with the highest priority error
	const maxError = max(errors, e => e.priority) ?? crash(`must have been at least one error`);
	if(maxError.err) throw maxError.err;
	else fail(maxError.message, maxError.range, tokens);
});

export function isLiteral(type:TokenType){
	return literalTypes.includes(type);
}

/** start and end are inclusive */
export type StatementCheckTokenRange = Token | {type:"expression" | "type" | "token"; start:number; end:number};
type StatementCheckFailResult = { message: ErrorMessage; priority: number; range: TextRange | null; };
/**
 * Checks if a RangeArray<Token> is valid for a statement type. If it is, it returns the information needed to construct the statement.
 * This is to avoid duplicating the expression parsing logic.
 * `input` must not be empty. TODO rm
 */
export function checkStatement(statement:typeof Statement, input:RangeArray<Token>, allowRecursiveCall:boolean):
	StatementCheckFailResult | StatementCheckTokenRange[] {

	if(input.length == 0) crash(`checkStatement() called with empty input`);
	if(statement.category == "block_multi_split" && !statement.blockType) crash(`block_multi_split statements must have a block type specified.`);

	const output:StatementCheckTokenRange[] = [];
	let i, j;
	for(i = (statement.tokens[0] == "#") ? 1 : 0, j = 0; i < statement.tokens.length; i ++){
		forceType<TokenMatcher[]>(statement.tokens);
		if(statement.tokens[i] == ".+" || statement.tokens[i] == ".*" || statement.tokens[i] == "expr+" || statement.tokens[i] == "type+"){
			const allowEmpty = statement.tokens[i] == ".*";
			const start = j;
			if(j >= input.length){
				if(allowEmpty) continue; //Consumed all tokens
				else return {
					message: `Expected ${displayTokenMatcher(statement.tokens[i])}, found end of line`,
					priority: 4,
					range: input.at(-1)!.rangeAfter()
				};
			}
			let anyTokensSkipped = false;
			const nestLevel = manageNestLevel();
			while(statement.tokens[i + 1] != input[j].type || nestLevel.in()){ //Repeat until the current token in input is the next token
				nestLevel.update(input[j]);
				anyTokensSkipped = true;
				
				j ++;
				if(j >= input.length){ //end reached
					if(i == statement.tokens.length - 1) break; //Consumed all tokens
					//End was reached but there are still matchers left, error
					//Check for typos
					const expectedType = statement.tokens[i + 1];
					if(isKey(tokenTextMapping, expectedType)){
						const nestLevel = manageNestLevel();
						const err = max(input.slice(start).map(token => {
							nestLevel.update(token);
							return nestLevel.out() && getMessage(expectedType, token, 10);
						}).filter(Boolean), m => m.priority, 49);
						if(err) return err;
					}
					return {
						message: `Expected ${displayTokenMatcher(statement.tokens[i + 1])}, found end of line`,
						priority: 4,
						range: input.at(-1)!.rangeAfter()
					};
				}
			}
			/** Inclusive */
			const end = j - 1;
			if(end < start && !allowEmpty) //this triggers on input like `IF THEN`, where the expression is missing
				return {
					message: `Expected ${displayTokenMatcher(statement.tokens[i])} before this token`,
					priority: 6,
					range: input[j].range
				};
			if(statement.tokens[i] == "expr+")
				output.push({type: "expression", start, end});
			else if(statement.tokens[i] == "type+")
				output.push({type: "type", start, end});
			else
				output.push(...input.slice(start, end + 1));
		} else {
			if(j >= input.length) return {
				message: `Expected ${displayTokenMatcher(statement.tokens[i])}, found end of line`,
				priority: 4,
				range: input.at(-1)!.rangeAfter()
			};
			if(statement.tokens[i] as any == "#") impossible();
			else if(statement.tokens[i] == "." || statement.tokens[i] == input[j].type || (
				statement.tokens[i] == "file_mode" && input[j].type.startsWith("keyword.file_mode.")
			) || (
				statement.tokens[i] == "class_modifier" && input[j].type.startsWith("keyword.class_modifier.")
			) || (
				statement.tokens[i] == "name" && input[j].type == "keyword.new"
			)){
				output.push(input[j]);
				j ++; //Token matches, move to next one
			} else if(statement.tokens[i] == "literal" || statement.tokens[i] == "literal|otherwise"){
				if(isLiteral(input[j].type) || (statement.tokens[i] == "literal|otherwise" && input[j].type == "keyword.otherwise")){
					//The current token is a valid literal or it's "otherwise" and that's allowed
					const outToken = input[j];
					output.push(outToken.type == "keyword.otherwise" ? outToken : { type: "expression", start: j, end: j });
					j ++;
				} else if(input[j].type == "operator.minus" && j + 1 < input.length && input[j + 1].type == "number.decimal"){
					//Replace the number token with a negative number, and drop the minus operator
					output.push({ type: "token", start: j, end: j + 1 });
					j += 2;
				} else return getMessage(statement.tokens[i], input[j], 5);
			} else return getMessage(statement.tokens[i], input[j], 5);

		}
	}
	if(j != input.length){
		//Extra tokens found
		//Note: j is pointing to the first unused token
		if(j > 0 && allowRecursiveCall){
			try {
				//Check if the rest of the line is valid
				void parseStatement(input.slice(j), "any", false);
				return {
					message: {
						summary: f.quote`Expected end of line, found beginning of new statement`,
						help: [f.quoteRange`add a newline or semicolon before ${input[j]}`],
					},
					priority: 20,
					range: input[j].range
				};
			} catch { /* ignore */ }
		}
		return { message: f.quote`Expected end of line, found ${input[j]}`, priority: 7, range: input[j].range };
	}
	return output;
}
/** Computes the best error message, given a token matcher and the token that failed to match it. */
function getMessage(expected:TokenMatcher, found:Token, priority:number):StatementCheckFailResult {
	//FIXME: is this function being used correctly? `IF FALSE THEn` does not call it
	const message = f.text`Expected ${displayTokenMatcher(expected)}, got \`${found}\``;
	const range = found.range;
	if(isKey(tokenTextMapping, expected)){
		if(tokenTextMapping[expected].toLowerCase() == found.text.toLowerCase()) return {
			message: {
				summary: message,
				elaboration: `keywords are case sensitive`,
			},
			priority: 50,
			range
		};
		if(biasedLevenshtein(tokenTextMapping[expected], found.text) < 2)
			priority = 50;
	}

	return { message, priority, range };
}

/** Crashes if the checkStatement function attempts to read unknown properties from the fake statement definition. */
export function checkTokens(tokens:RangeArray<Token>, input:TokenMatcher[]):boolean {
	return Array.isArray(checkStatement(fakeObject<typeof Statement>({
		tokens: input,
		category: undefined,
		blockType: null,
	}), tokens, false));
}



//#region expression parser

function cannotEndExpression(token:Token){
	return token.type.startsWith("operator.") || token.type == "parentheses.open" || token.type == "bracket.open";
}
function canBeOperator(token:Token){ //TODO use a better data structure here
	return Object.values(operators).find(o => o.token == token.type);
}
function canBeUnaryOperator(token:Token){
	return Object.values(operators).find(o => o.fix.startsWith("unary_prefix") && o.token == token.type);
}

/** Parses the provided token as an expression leaf node. Examples: number, string, variable name */
export function parseExpressionLeafNode(token:Token, allowSuper = false, allowNew = false):ExpressionASTLeafNode {
	//Number, string, char, boolean, and variables can be parsed as-is
	if(
		(token.type != "keyword.super" && token.type != "keyword.new" && expressionLeafNodeTypes.includes(token.type)) ||
		(allowSuper && token.type == "keyword.super") ||
		(allowNew && token.type == "keyword.new")
	) return ExpressionASTLeafNode.from(token);
	else fail(`Invalid expression leaf node`, token);
};

/** Parses an expression from a list of tokens. */
export const parseExpression = errorBoundary({
	predicate: (_input, recursive) => !recursive,
	message: () => `Expected "$rc" to be an expression, but it was invalid: `
})(function _parseExpression(
	input:RangeArray<Token>,
	/** Used to set the general range for errors to be the outermost expression (which is the only one where recursive is false). */
	recursive:boolean = false, //This is not unused!
	allowSuper:boolean = false,
	allowNew:boolean = false,
):ExpressionASTNode {
	if(!Array.isArray(input)) crash(`parseExpression(): expected array of tokens, got ${input as any}`);
	//If there is only one token, parse it as a leaf node
	if(input.length == 1) return parseExpressionLeafNode(input[0], allowSuper, allowNew);

	/** Some logic in this function handles cases where the input might be valid, or there is a specifc error message to explain why is is not valid. */
	let deferredError: [string[], TextRangeLike | undefined] = [[`No operators found`], input.length > 0 ? input : undefined];

	//Recursive descent parser, modified with a lot of extra cases.

	//Go through P E M-D A-S in reverse order to find the operator with the lowest priority
	for(const operatorsOfCurrentPriority of operatorsByPriority){
		const nestLevel = manageNestLevel(true);
		//Find the index of the last (lowest priority) operator of the current priority
		//Iterate through token list backwards
		for(let i = input.length - 1; i >= 0; i --){
			nestLevel.update(input[i]);

			let operator!:Operator; //assignment assertion: within the find() call
			if(
				nestLevel.out() && //the operator is not inside parentheses and
				operatorsOfCurrentPriority.find(o => (operator = o).token == input[i].type) //it is currently being searched for, TODO optimize triple nested loop
			){
				//this is the lowest priority operator in the expression and should become the root node
				if(operator.fix.startsWith("unary_prefix")){
					//Make sure there is only something on right side of the operator
					const right = input.slice(i + 1);
					if(i != 0){ //if there are tokens to the left of a unary prefix operator
						if(operator.fix == "unary_prefix_o_postfix"){
							if(
								//"^ x ^ ^"
								//     ⬆: this should be allowed
								//Make sure everything to the right is unary postfix operators of the same priority
								right.every(n => operatorsOfCurrentPriority.some(o => o.token == n.type && o.fix == "unary_postfix_o_prefix" || o.fix == "unary_prefix_o_postfix"))
							) continue; //this is the postfix operator
							//x^.prop"
							// ⬆: this should also be allowed
							//If the operator on the right was of lower priority, it would have already been selected for recursion
							//so it must be a higher priority operator
							if(right[0] && canBeOperator(right[0])){
								deferredError = [[f.text`Unexpected expression on right side of operator ${input[i]}`, `this is a unary postfix operator, it should come after an expression`], input[i]];
								continue;
							}
						}
						//Binary operators
						//  1 / 2 / 3
						// (1 / 2)/ 3
						// ^
						// lowest priority is rightmost
						//Unary operators
						// - - 2
						// -(- 2)
						// ^
						// lowest priority is leftmost

						//If the operator on the left is a unary operator,
						if(canBeUnaryOperator(input[i - 1])) continue; //Operator priority assumption is wrong, try again!
						fail(f.text`Unexpected expression on left side of operator ${input[i]}`, input[i]);
					}
					if(right.length == 0) fail(f.text`Expected expression on right side of operator ${input[i]}`, input[i].rangeAfter());
					if(right.length == 1 && operator.id == "operator.negate" && right[0].type == "number.decimal"){
						//Special handling for negative numbers:
						//Do not create an expression, instead create a negative number token
						const negativeNumber = right[0].clone();
						negativeNumber.extendRange(input[i]);
						negativeNumber.text = input[i].text + negativeNumber.text;
						return parseExpressionLeafNode(negativeNumber);
					}
					return new ExpressionASTBranchNode(
						input[i],
						operator,
						new RangeArray([parseExpression(right, true)]),
						input
					);
				} else if(operator.fix.startsWith("unary_postfix")){
					//Make sure there is only something on left side of the operator
					const left = input.slice(0, i);
					if(i != input.length - 1){ //if there are tokens to the right of a unary postfix operator
						if(operator.fix == "unary_postfix_o_prefix" && left.length == 0) continue; //this is the prefix operator
						if(input[i + 1] && canBeOperator(input[i + 1])){
							deferredError = [[
								f.quote`Unexpected expression on right side of operator ${input[i]}`,
								`this is a unary postfix operator, it should come after an expression`
							], input[i]];
							continue;
						}
						//No need to worry about operator priority changing for postfix
						fail({
							summary: f.text`Unexpected expression on right side of operator ${input[i]}`,
							elaboration: `this is a unary postfix operator, it should come after an expression`
						}, input[i]);
					}
					if(left.length == 0) fail(f.text`Expected expression on left side of operator ${input[i]}`, input[i].rangeBefore());
					return new ExpressionASTBranchNode(
						input[i],
						operator,
						new RangeArray([parseExpression(left, true)]),
						input
					);
				} else {
					//Make sure there is something on left and right of the operator
					const left = input.slice(0, i);
					const right = input.slice(i + 1);
					if(left.length == 0){
						if(operator.fix == "binary_o_unary_prefix") continue; //this is the unary operator, try again
						else fail(f.text`Expected expression on left side of operator ${input[i]}`, input[i].rangeBefore());
					}
					if(right.length == 0) fail(f.text`Expected expression on right side of operator ${input[i]}`, input[i].rangeAfter());
					if(operator.fix == "binary_o_unary_prefix"){
						if(cannotEndExpression(input[i - 1])) continue; //Binary operator can't fit here, this must be the unary operator
					}
					if(operator == operators.access){
						if(!(right.length == 1 && (right[0].type == "name" || right[0].type == "keyword.new"))){ //TODO properly handle keywords being names, everywhere
							deferredError = [[`Access operator can only have a single token to the right, which must be a property name`], right];
							continue;
						}
					}
					return new ExpressionASTBranchNode(
						input[i],
						operator,
						new RangeArray([parseExpression(left, true, operator == operators.access), parseExpression(right, true, false, operator == operators.access)]),
						input
					);
				}
			}
		}
		nestLevel.done(input);

		//No operators of the current priority found, look for operator with the next level higher priority
	}

	//Special case: Class instantiation expression
	if(input[0]?.type == "keyword.new" && input[1]?.type == "name" && input[2]?.type == "parentheses.open" && input.at(-1)?.type == "parentheses.close"){
		return new ExpressionASTClassInstantiationNode(
			input[1],
			new RangeArray(
				input.length == 4
					? [] //If there are no arguments, don't generate a blank argument group
					: splitTokensOnComma(input.slice(3, -1)).map(e => parseExpression(e, true)),
				input.length == 4 ? input.slice(3, -1).range : undefined
			),
			input
		);
	}

	//Special case: function call
	const parenIndex = findLastNotInGroup(input, "parentheses.open");
	if(parenIndex != null && parenIndex > 0 && input.at(-1)?.type == "parentheses.close"){
		const target = input.slice(0, parenIndex);
		const indicesTokens = input.slice(parenIndex + 1, -1);
		if(target.length == 0) crash(`Missing function in function call expression`);
		const parsedTarget = parseExpression(target, true);
		if(parsedTarget instanceof Token || parsedTarget instanceof ExpressionASTBranchNode)
			return new ExpressionASTFunctionCallNode(
				parsedTarget,
				new RangeArray(
					indicesTokens.length == 0
						? [] //If there are no arguments, don't generate a blank argument group
						: splitTokensOnComma(indicesTokens).map(e => parseExpression(e, true)),
					indicesTokens.length == 0 ? indicesTokens.range : undefined
				),
				input
			);
		else fail({
			summary: f.quote`${parsedTarget} is not a valid function name`,
			elaboration: `function names must be a single token, or the result of a property access`
		}, parsedTarget);
	}

	//If the whole expression is surrounded by parentheses, parse the inner expression
	//Must be after the main loop to avoid triggering on ( 2)+(2 )
	//Possible optimization: allow this to run before the loop if token length is <= 3
	if(input[0]?.type == "parentheses.open" && input.at(-1)?.type == "parentheses.close")
		return parseExpression(input.slice(1, -1), true);

	//Special case: array access
	const bracketIndex = findLastNotInGroup(input, "bracket.open");
	if(bracketIndex != null && input.at(-1)?.type == "bracket.close"){
		const target = input.slice(0, bracketIndex);
		const indicesTokens = input.slice(bracketIndex + 1, -1);
		if(target.length == 0) fail({
			summary: `Missing target in array index expression`,
			help: `are you trying to use an array literal? Soodocode does not have array literals, you must declare an array and manually set each slot.`,
		}, input[0].rangeBefore());
		if(indicesTokens.length == 0) fail({
			summary: `Missing indices in array index expression`,
			elaboration: [
				`This looks like an array index expression, of the form "array[1]" or "variable[a, b]"`,
				`but there are no indices between the square brackets`
			]
		}, input[0].rangeAfter());
		const parsedTarget = parseExpression(target, true);
		return new ExpressionASTArrayAccessNode(
			parsedTarget,
			new RangeArray(splitTokensOnComma(indicesTokens).map(e => parseExpression(e, true))),
			input
		);
	}

	//No operators found at all, invalid input
	fail({
		summary: `Invalid expression`,
		elaboration: deferredError[0],
	}, deferredError[1]);
});
