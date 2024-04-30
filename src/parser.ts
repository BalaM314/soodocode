/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the parser, which takes a list of tokens
and processes it into an abstract syntax tree (AST),
which is the preferred representation of the program.
*/


import { TextRange, Token, TokenizedProgram, TokenType } from "./lexer-types.js";
import { tokenTextMapping } from "./lexer.js";
import { ExpressionASTArrayAccessNode, ExpressionASTArrayTypeNode, ExpressionASTBranchNode, ExpressionASTClassInstantiationNode, ExpressionASTFunctionCallNode, ExpressionASTLeafNode, ExpressionASTNode, ExpressionASTTypeNode, Operator, operators, operatorsByPriority, ProgramAST, ProgramASTBranchNode, ProgramASTBranchNodeType, ProgramASTNode, TokenMatcher } from "./parser-types.js";
import { ArrayVariableType, PrimitiveVariableType, UnresolvedVariableType } from "./runtime-types.js";
import { CaseBranchRangeStatement, CaseBranchStatement, FunctionArgumentDataPartial, FunctionArguments, PassMode, Statement, statements } from "./statements.js";
import { crash, displayTokenMatcher, errorBoundary, f, fail, findLastNotInGroup, forceType, impossible, isKey, SoodocodeError, splitTokens, splitTokensOnComma, splitTokensWithSplitter } from "./utils.js";

//TODO add a way to specify the range for an empty list of tokens

/** Parses function arguments, such as `x:INTEGER, BYREF y, z:DATE` into a Map containing their data */
export const parseFunctionArguments = errorBoundary()((tokens:Token[]):FunctionArguments => {
	//special case: blank
	if(tokens.length == 0) return new Map();

	let passMode:PassMode = "value";
	let type:UnresolvedVariableType | null = null;
	//Split the array on commas (no paren handling necessary)
	const argumentz = splitTokensOnComma(tokens).map<FunctionArgumentDataPartial>(section => {

		let passMode:PassMode | null;
		let type:UnresolvedVariableType | null;

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
			fail(f.quote`Expected a name, got ${section[offset + 0] ?? "end of function arguments"}`, section[offset + 0] ?? (section[offset - 1] ?? tokens.at(-1)).rangeAfter());

		//If the name is the only thing present, then the type is specified later, leave it as null
		if(section.length == offset + 1){
			type = null;
		} else {
			//Expect a colon
			if(section[offset + 1]?.type != "punctuation.colon")
				fail(f.quote`Expected a colon, got ${section[offset + 1] ?? "end of function arguments"}`, section[offset + 1] ?? (section[offset + 0] ?? tokens.at(-1)).rangeAfter());
			type = processTypeData(parseType(section.slice(offset + 2)));
		}
		return [
			section[offset + 0], //pass the token through so we can use it to generate errors
			{ passMode, type }
		];
	})
		.map<[name:Token, {type:UnresolvedVariableType | null, passMode:PassMode}]>(([name, data]) => [name, {
			passMode: data.passMode ? passMode = data.passMode : passMode,
			type: data.type
		}])
		.reverse()
		.map(([name, data]) => [name, {
			passMode: data.passMode,
			type: data.type ? type = data.type : type ?? fail(f.quote`Type not specified for function argument ${name}`, name)
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

export const processTypeData = errorBoundary()((typeNode:ExpressionASTTypeNode):UnresolvedVariableType => {
	if(typeNode instanceof Token){
		return PrimitiveVariableType.resolve(typeNode);
	} else return ArrayVariableType.from(typeNode);
});

export const parseType = errorBoundary()((tokens:Token[]):ExpressionASTTypeNode => {
	if(tokens.length == 1){
		if(tokens[0].type == "name") return tokens[0];
		else fail(f.quote`Cannot parse type from ${tokens}`);
	}

	//Array type
	if(!(
		tokens[0]?.type == "keyword.array" &&
		tokens.at(-2)?.type == "keyword.of" &&
		tokens.at(-1)?.type == "name"
	)) fail(f.quote`Cannot parse type from ${tokens}`);
	if(tokens.length == 3) return new ExpressionASTArrayTypeNode(null, tokens.at(-1)!, tokens);
	if(!(
		tokens[1]?.type == "bracket.open" &&
		tokens.at(-3)?.type == "bracket.close"
	)) fail(f.quote`Cannot parse type from ${tokens}`);
	return new ExpressionASTArrayTypeNode(
		splitTokensWithSplitter(tokens.slice(2, -3), "punctuation.comma").map(({group, splitter}) => {
			if(group.length != 3) fail(
				f.quote`Invalid array range specifier ${group}`,
				group.length ? group : splitter
			);
			if(group[0].type != "number.decimal") fail(f.quote`Expected a number, got ${group[0]}`, group[0]);
			if(group[1].type != "punctuation.colon") fail(f.quote`Expected a colon, got ${group[1]}`, group[1]);
			if(group[2].type != "number.decimal") fail(f.quote`Expected a number, got ${group[2]}`, group[2]);
			return [group[0], group[2]] as [Token, Token];
		}),
		tokens.at(-1)!,
		tokens
	);
});

export function splitTokensToStatements(tokens:Token[]):Token[][] {
	const statementData:[statement:typeof Statement, length:number][] = [
		[CaseBranchStatement, 2],
		[CaseBranchStatement, 3],
		[CaseBranchRangeStatement, 4],
		[CaseBranchRangeStatement, 5],
		[CaseBranchRangeStatement, 6],
	];
	return splitTokens(tokens, "newline").map(ts => {
		for(const [statement, length] of statementData){
			if(ts.length > length && Array.isArray(checkStatement(statement, ts.slice(0, length))))
				return [ts.slice(0, length), ts.slice(length)];
		}
		return [ts];
	}).flat(1).filter(ts => ts.length > 0); //remove blank lines
}

export function parse({program, tokens}:TokenizedProgram):ProgramAST {
	const lines:Token[][] = splitTokensToStatements(tokens);
	const programNodes:ProgramASTNode[] = [];
	function getActiveBuffer(){
		if(blockStack.length == 0) return programNodes;
		else return blockStack.at(-1)!.nodeGroups.at(-1)!;
	}
	const blockStack:ProgramASTBranchNode[] = [];
	for(const line of lines){
		const statement = parseStatement(line, blockStack.at(-1) ?? null);
		if(statement.category == "normal"){
			getActiveBuffer().push(statement);
		} else if(statement.category == "block"){
			const node = new ProgramASTBranchNode(
				ProgramASTBranchNodeType(statement.stype),
				[statement],
				[[]]
			);
			getActiveBuffer().push(node);
			blockStack.push(node);
		} else if(statement.category == "block_end"){
			const lastNode = blockStack.at(-1);
			if(!lastNode) fail(`Unexpected statement: no open blocks`, statement);
			else if(statement instanceof lastNode.controlStatements[0].type.blockEndStatement<Function>()){
				lastNode.controlStatements.push(statement);
				lastNode.controlStatements[0].type.checkBlock(lastNode);
				blockStack.pop();
			} else fail(f.quote`Unexpected statement: current block is of type ${lastNode.typeName()}`, statement, null);
		} else if(statement.category == "block_multi_split"){
			const lastNode = blockStack.at(-1);
			if(!lastNode) fail(`Unexpected statement: ${statement.stype} statements must be inside a block`, statement, null);
			let errorMessage:true | string;
			if((errorMessage = lastNode.controlStatements[0].type.supportsSplit(lastNode, statement)) !== true)
				fail(`Unexpected statement: ${errorMessage}`, statement, null);
			lastNode.controlStatements.push(statement);
			lastNode.nodeGroups.push([]);
		} else statement.category satisfies never;
	}
	if(blockStack.length)
		fail(f.quote`There were unclosed blocks: ${blockStack.at(-1)!.controlStatements[0]} requires a matching ${blockStack.at(-1)!.controlStatements[0].type.blockEndStatement().type} statement`, blockStack.at(-1)!.controlStatements[0], null);
	return {
		program,
		nodes: programNodes
	};
}

export function getPossibleStatements(tokens:Token[], context:ProgramASTBranchNode | null):(typeof Statement)[] {
	//TODO improve error messages here, its quite bad
	const ctx = context?.controlStatements[0].type;
	let validStatements = (tokens[0].type in statements.byStartKeyword
		? statements.byStartKeyword[tokens[0].type]!
		: statements.irregular);
	if(ctx?.allowOnly){
		const allowedValidStatements = validStatements.filter(s => ctx.allowOnly?.has(s.type));
		if(allowedValidStatements.length == 0){
			fail(`No valid statement definitions\nInput could have been ${validStatements.map(s => `"${s.type}"`).join(" or ")}, but the only statements allowed in block ${context!.type} are ${[...ctx.allowOnly].map(s => `"${s}"`).join(" or ")}`);
		} else validStatements = allowedValidStatements;
	}
	validStatements = validStatements.filter(s => !s.blockType || s.blockType == context?.type.split(".")[0]);
	if(validStatements.length == 0){
		fail(`No valid statement definitions`);
	}
	return validStatements;
}

/**
 * Parses a string of tokens into a Statement.
 * @argument tokens must not contain any newlines.
 **/
export const parseStatement = errorBoundary()((tokens:Token[], context:ProgramASTBranchNode | null):Statement => {
	if(tokens.length < 1) crash("Empty statement");
	const possibleStatements = getPossibleStatements(tokens, context);
	const errors:(StatementCheckFailResult & {err?:SoodocodeError;})[] = [];
	for(const possibleStatement of possibleStatements){
		const result = checkStatement(possibleStatement, tokens);
		if(Array.isArray(result)){
			try {
				return new possibleStatement(result.map(x =>
					x instanceof Token
						? x
						: (x.type == "expression" ? parseExpression : parseType)(tokens.slice(x.start, x.end + 1))
				));
			} catch(err){
				if(err instanceof SoodocodeError) errors.push({
					message: err.message,
					priority: 10,
					range: err.rangeSpecific ?? null,
					err
				});
				else throw err;
			}
		} else {
			if(possibleStatement.suppressErrors) result.priority = 0;
			errors.push(result);
		}
	}
	let maxError = errors[0];
	for(const error of errors){
		if(error.priority >= maxError.priority) maxError = error;
	}
	if(maxError.err) throw maxError.err;
	else fail(maxError.message, maxError.range, tokens);
});

export function isLiteral(type:TokenType){
	switch(type){
		case "boolean.false": case "boolean.true":
		case "number.decimal":
		case "string": case "char":
			return true;
		default: return false;
	}
}

/** start and end are inclusive */
type StatementCheckTokenRange = (Token | {type:"expression" | "type"; start:number; end:number});
type StatementCheckFailResult = { message: string; priority: number; range: TextRange | null; };
/**
 * Checks if a Token[] is valid for a statement type. If it is, it returns the information needed to construct the statement.
 * This is to avoid duplicating the expression parsing logic.
 * `input` must not be empty.
 */
export const checkStatement = errorBoundary()((statement:typeof Statement, input:Token[]):
	StatementCheckFailResult | StatementCheckTokenRange[] => {

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
			while(statement.tokens[i + 1] != input[j].type){ //Repeat until the current token in input is the next token
				anyTokensSkipped = true;
				j ++;
				if(j >= input.length){ //end reached
					if(i == statement.tokens.length - 1) break; //Consumed all tokens
					return { message: `Expected ${displayTokenMatcher(statement.tokens[i + 1])}, found end of line`, priority: 4, range: input.at(-1)!.rangeAfter() };
				}
			}
			const end = j - 1;
			if(!anyTokensSkipped && !allowEmpty) //this triggers on input like `IF THEN`, where the expression is missing
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
			if(j >= input.length) return { message: `Expected ${displayTokenMatcher(statement.tokens[i])}, found end of line`, priority: 4, range: input.at(-1)!.rangeAfter() };
			if(statement.tokens[i] as string == "#") impossible();
			else if(statement.tokens[i] == "." || statement.tokens[i] == input[j].type || (
				statement.tokens[i] == "file_mode" && input[j].type.startsWith("keyword.file_mode.")
			) || (
				statement.tokens[i] == "class_modifier" && input[j].type.startsWith("keyword.class_modifier.")
			) || (
				statement.tokens[i] == "name" && input[j].type == "keyword.new"
			)){
				output.push(input[j]);
				j++; //Token matches, move to next one
			} else if(statement.tokens[i] == "literal" || statement.tokens[i] == "literal|otherwise"){
				if(isLiteral(input[j].type) || (statement.tokens[i] == "literal|otherwise" && input[j].type == "keyword.otherwise"))
					output.push(input[j++]); //The current token is a valid literal or it's "otherwise" and that's allowed
				else if(input[j].type == "operator.minus" && j + 1 < input.length && input[j + 1].type == "number.decimal"){
					//Replace the number token with a negative number, and drop the minus operator
					const negativeNumber = input[j + 1].clone();
					negativeNumber.extendRange(input[j]);
					negativeNumber.text = input[j].text + negativeNumber.text;
					output.push(negativeNumber);
					j += 2;
				} else return { message: getMessage(statement.tokens[i], input[j]), priority: 8, range: input[j].range };
			} else return { message: getMessage(statement.tokens[i], input[j]), priority: 5, range: input[j].range };
		}
	}
	if(j != input.length){
		//Extra tokens found
		//Note: j is pointing to the first unused token
		if(j > 0){
			try {
				//Check if the rest of the line is valid
				parseStatement(input.slice(j), null);
				return { message: f.quote`Expected end of line, found beginning of new statement\nhelp: add a newline here`, priority: 20, range: input[j].range };
			} catch(err){void err;}
		}
		return { message: f.quote`Expected end of line, found ${input[j]}`, priority: 7, range: input[j].range };
	}
	return output;
});

function getMessage(expected:TokenMatcher, found:Token){
	if(isKey(tokenTextMapping, expected) && tokenTextMapping[expected].toLowerCase() == found.text.toLowerCase())
		return f.text`Expected ${displayTokenMatcher(expected)}, got \`${found}\`\nhelp: keywords are case sensitive`;

	return f.text`Expected ${displayTokenMatcher(expected)}, got \`${found}\``;
}

function cannotEndExpression(token:Token){
	//TODO is this the best way?
	return token.type.startsWith("operator.") || token.type == "parentheses.open" || token.type == "bracket.open";
}
function canBeUnaryOperator(token:Token){
	return Object.values(operators).find(o => o.type.startsWith("unary_prefix") && o.token == token.type);
}

export const expressionLeafNodeTypes:TokenType[] = ["number.decimal", "name", "string", "char", "boolean.false", "boolean.true", "keyword.super", "keyword.new"]; //TODO refactor this with methods on Token

export const parseExpressionLeafNode = errorBoundary()((token:Token):ExpressionASTLeafNode => {
	//Number, string, char, boolean, and variables can be parsed as-is
	if(expressionLeafNodeTypes.includes(token.type))
		return token;
	else
		fail(`Invalid expression leaf node`);
});

export const parseExpression = errorBoundary({
	predicate: (_input, recursive) => !recursive,
	message: () => `Cannot parse expression "$rc": `
})((input:Token[], recursive = false):ExpressionASTNode => {
	if(!Array.isArray(input)) crash(`parseExpression(): expected array of tokens, got ${input}`); // eslint-disable-line @typescript-eslint/restrict-template-expressions
	//If there is only one token
	if(input.length == 1) return parseExpressionLeafNode(input[0]);

	let error: typeof impossible | null = null;
	//Go through P E M-D A-S in reverse order to find the operator with the lowest priority
	for(const operatorsOfCurrentPriority of operatorsByPriority){
		let parenNestLevel = 0, bracketNestLevel = 0;
		//Find the index of the last (lowest priority) operator of the current priority
		//Iterate through token list backwards
		for(let i = input.length - 1; i >= 0; i --){
			//Handle parentheses
			//The token list is being iterated through backwards, so ) means go up a level and ( means go down a level
			if(input[i].type == "parentheses.close") parenNestLevel ++;
			else if(input[i].type == "parentheses.open") parenNestLevel --;
			else if(input[i].type == "bracket.close") bracketNestLevel ++;
			else if(input[i].type == "bracket.open") bracketNestLevel --;
			if(parenNestLevel < 0)
				//nest level going below 0 means too many (
				fail(`Unclosed parentheses`, input[i]);
			if(bracketNestLevel < 0)
				//nest level going below 0 means too many [
				fail(`Unclosed square bracket`, input[i]);

			let operator!:Operator; //assignment assertion goes brrrrr
			if(
				parenNestLevel == 0 && bracketNestLevel == 0 && //the operator is not inside parentheses and
				operatorsOfCurrentPriority.find(o => (operator = o).token == input[i].type) //it is currently being searched for
			){
				//this is the lowest priority operator in the expression and should become the root node
				if(operator.type.startsWith("unary_prefix")){
					//Make sure there is only something on right side of the operator
					const right = input.slice(i + 1);
					if(i != 0){ //if there are tokens to the left of a unary prefix operator
						if(operator.type == "unary_prefix_o_postfix" && (
							//"^ x ^ ^"
							//     ⬆: this should be allowed
							//x^.prop"
							// ⬆: this should NOT be allowed
							//Make sure everything to the right is unary postfix operators of the same priority
							right.every(n => operatorsOfCurrentPriority.some(o => o.token == n.type && o.type == "unary_postfix_o_prefix" || o.type == "unary_prefix_o_postfix"))
						)) continue; //this is the postfix operator
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
						if(canBeUnaryOperator(input[i - 1])) continue; //Operator priority assumption is wrong, try again!
						fail(f.text`Unexpected expression on left side of operator ${input[i]}`, input[i]);
					}
					if(right.length == 0) fail(f.text`Expected expression on right side of operator ${input[i]}`, input[i].rangeAfter());
					if(right.length == 1 && operator.name == "operator.negate" && right[0].type == "number.decimal"){
						//Special handling for negative numbers:
						//Do not create an expression, instead mutate the number token into a negative number
						//Very cursed
						const negativeNumber = right[0].clone();
						negativeNumber.extendRange(input[i]);
						negativeNumber.text = input[i].text + negativeNumber.text;
						return negativeNumber;
					}
					return new ExpressionASTBranchNode(
						input[i],
						operator,
						[parseExpression(right, true)],
						input
					);
				} else if(operator.type.startsWith("unary_postfix")){
					//Make sure there is only something on left side of the operator
					const left = input.slice(0, i);
					if(i != input.length - 1){ //if there are tokens to the right of a unary postfix operator
						if(operator.type == "unary_postfix_o_prefix" && left.length == 0) continue; //this is the prefix operator
						//No need to worry about operator priority changing for postfix
						fail(f.text`Unexpected expression on left side of operator ${input[i]}`, input[i]);
					}
					if(left.length == 0) fail(f.text`Expected expression on left side of operator ${input[i]}`, input[i].rangeBefore());
					return new ExpressionASTBranchNode(
						input[i],
						operator,
						[parseExpression(left, true)],
						input
					);
				} else {
					//Make sure there is something on left and right of the operator
					const left = input.slice(0, i);
					const right = input.slice(i + 1);
					if(left.length == 0){
						if(operator.type == "binary_o_unary_prefix") continue; //this is the unary operator, try again
						else fail(f.text`Expected expression on left side of operator ${input[i]}`, input[i].rangeBefore());
					}
					if(right.length == 0) fail(f.text`Expected expression on right side of operator ${input[i]}`, input[i].rangeAfter());
					if(operator.type == "binary_o_unary_prefix"){
						if(cannotEndExpression(input[i - 1])) continue; //Binary operator can't fit here, this must be the unary operator
					}
					if(operator == operators.access){
						if(!(right.length == 1 && (right[0].type == "name" || right[0].type == "keyword.new"))){ //TODO properly handle keywords being names, everywhere
							error = () => fail(`Access operator can only have a single token to the right, which must be a property name`, right);
							continue;
						}
					} 
					return new ExpressionASTBranchNode(
						input[i],
						operator,
						[parseExpression(left, true), parseExpression(right, true)],
						input
					);
				}
			}
		}
		//Nest level being above zero at the beginning of the token list means too many )
		if(parenNestLevel != 0){
			//Iterate through the tokens left-to-right to find the unmatched paren
			input.reduce((acc, item) => {
				if(item.type == "parentheses.open") acc ++;
				else if(item.type == "parentheses.close") acc --;
				if(acc < 0) //found the extra )
					fail(`No parentheses group to close`, item);
				return acc;
			}, 0);
			impossible();
		}
		if(bracketNestLevel != 0){
			//Iterate through the tokens left-to-right to find the unmatched bracket
			input.reduce((acc, item) => {
				if(item.type == "bracket.open") acc ++;
				else if(item.type == "bracket.close") acc --;
				if(acc < 0) //found the extra ]
					fail(`No bracket group to close`, item);
				return acc;
			}, 0);
			impossible();
		}

		//No operators of the current priority found, look for operator with the next level higher priority
	}

	//Special case: Class instantiation expression
	if(input[0]?.type == "keyword.new" && input[1]?.type == "name" && input[2]?.type == "parentheses.open" && input.at(-1)?.type == "parentheses.close"){
		return new ExpressionASTClassInstantiationNode(
			input[1],
			input.length == 4
				? [] //If there are no arguments, don't generate a blank argument group
				: splitTokensOnComma(input.slice(3, -1)).map(e => parseExpression(e, true)),
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
				indicesTokens.length == 0
					? [] //If there are no arguments, don't generate a blank argument group
					: splitTokensOnComma(indicesTokens).map(e => parseExpression(e, true)),
				input
			);
		else fail(f.quote`${parsedTarget} is not a valid function name, function names must be a single word, or the result of a property access`);
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
		if(target.length == 0) fail(`Missing target in array index expression`);
		if(indicesTokens.length == 0) fail(`Missing indices in array index expression`);
		const parsedTarget = parseExpression(target, true);
		return new ExpressionASTArrayAccessNode(
			parsedTarget,
			splitTokensOnComma(indicesTokens).map(e => parseExpression(e, true)),
			input
		);
	}

	//No operators found at all, something went wrong
	if(error) error();
	fail(`No operators found`);
});
