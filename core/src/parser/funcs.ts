/* @license
Copyright © <BalaM314>, 2025. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains functions used by the parser.
*/

import { Token, TokenType, tokenNameTypeData, tokenTextMapping } from "../lexer/index.js";
import { biasedLevenshtein, crash, f, fail, impossible, isKey, isRange, match, min, RangeArray } from "../utils/funcs.js";
import type { TextRange } from "../utils/types.js";
import type { TokenMatcher } from "./parser-types.js";


/**
 * Helper function for handling checks for paren and bracket nest level.
 * Call update() once per iter, and done() after finishing iteration.
 */
export function manageNestLevel(reversed = false, validate = true){
	let paren = 0;
	let bracket = 0;
	const sign = reversed ? -1 : +1;
	return {
		update(token:Token){
			if(token.type == "parentheses.open") paren += sign;
			else if(token.type == "parentheses.close") paren -= sign;
			else if(token.type == "bracket.open") bracket += sign;
			else if(token.type == "bracket.close") bracket -= sign;
			if(validate){
				if(paren < 0) fail(reversed ? `Unclosed parenthesis group` : `No parenthesis group to close`, token);
				if(bracket < 0) fail(reversed ? `Unclosed square bracket group` : `No square bracket group to close`, token);
			}
		},
		/** Whether the iteration is NOT inside a paren or bracket pair. */
		out(){
			return paren == 0 && bracket == 0;
		},
		/** Whether the iteration is currently inside a paren or bracket pair. */
		in(){
			return paren != 0 || bracket != 0;
		},
		/** Pass input in left-to-right order, even if the previous iteration was right to left. */
		done(input:Token[] | TextRange){
			if(isRange(input)){
				//No more detailed information, just fail
				if(paren != 0) fail(reversed ? `No square bracket group to close` : `Unclosed square bracket group`, input);
				if(bracket != 0) fail(reversed ? `No parenthesis group to close` : `Unclosed parenthesis group`, input);
			} else {
				if(paren != 0 || bracket != 0){
					//Iterate through the tokens in the other order to find the unmatched paren
					const reverse = !reversed;
					const reverseIter = manageNestLevel(reverse, true);
					for(const token of (reverse ? input.slice().reverse() : input))
						reverseIter.update(token);
					impossible();
				}
			}
		}
	};
}

export function displayTokenMatcher(input:TokenMatcher):string {
	if(isKey(tokenTextMapping, input)){
		return `the ${
			input.startsWith("keyword.") ? "keyword" :
			input.startsWith("operator.") ? "operator" :
			"character"
		} "${tokenTextMapping[input]}"`;
	} else return match(input, {
		".": "one token",
		".*": "anything",
		".+": "something",
		"class_modifier": `"PRIVATE" or "PUBLIC"`,
		"expr+": "an expression",
		"file_mode": `"READ", "WRITE", "APPEND", or "RANDOM"`,
		"literal": "a literal",
		"literal|otherwise": `a literal or "OTHERWISE"`,
		"type+": "a type",
		"char": "a character literal",
		"string": "a string literal",
		"number.decimal": "a number",
		"name": "an identifier"
	});
}
export function splitTokens(arr:RangeArray<Token>, split:TokenType):RangeArray<Token>[] {
	const output:RangeArray<Token>[] = [];
	let lastBoundary = 0;
	for(let i = 0; i <= arr.length; i ++){
		if(i == arr.length || arr[i].type == split){
			output.push(arr.slice(lastBoundary, i));
			lastBoundary = i + 1;
		}
	}
	return output;
}

export function splitTokensOnComma(arr:RangeArray<Token>):RangeArray<Token>[] {
	const output:RangeArray<Token>[] = [];
	let lastBoundary = 0;
	const nestLevel = manageNestLevel();
	for(const [i, token] of arr.entries()){
		nestLevel.update(token);
		if(nestLevel.out() && token.type == "punctuation.comma"){
			output.push(arr.slice(lastBoundary, i));
			lastBoundary = i + 1;
		}
	}
	nestLevel.done(arr);
	output.push(arr.slice(lastBoundary));
	return output;
}

export function findLastNotInGroup(arr:RangeArray<Token>, target:TokenType):number | null {
	const nestLevel = manageNestLevel(true);
	for(const [i, token] of [...arr.entries()].reverse()){
		nestLevel.update(token);
		if(nestLevel.out() && token.type == target)
			return i;
	}
	return null;
}

export function getUniqueNamesFromCommaSeparatedTokenList<Tk extends Token>(tokens:RangeArray<Tk>, nextToken?:Token, validNames:TokenType[] = ["name"]):RangeArray<Tk> {
	if(tokens.length == 0) return tokens;

	const names:Tk[] = [];
	let expected:"name" | "comma" = "name";
	for(const token of tokens){
		if(expected == "name"){
			if(validNames.includes(token.type)){
				names.push(token);
				expected = "comma";
			} else fail(f.quote`Expected a name, got ${token}`, token);
		} else {
			if(token.type == "punctuation.comma"){
				expected = "name";
			} else fail(f.quote`Expected a comma, got ${token}`, token);
		}
	}
	if(expected == "name") fail(`Expected a name, found ${nextToken?.text ?? "end of input"}`, nextToken);
	if(new Set(names.map(t => t.text)).size !== names.length){
		//duplicate value
		const duplicateToken = names.find((a, i) => names.find((b, j) => a.text == b.text && i != j)) ?? crash(`Unable to find the duplicate name in ${names.join(" ")}`);
		fail(f.quote`Duplicate name ${duplicateToken} in list`, duplicateToken, tokens);
	}
	return new RangeArray<Tk>(names);
}

export function closestKeywordToken(input:string, threshold = 2.01):TokenType | undefined {
	const keywordTokens = Object.entries(tokenNameTypeData);
	if(input.toUpperCase() in tokenNameTypeData){
		return tokenNameTypeData[input.toUpperCase() as keyof typeof tokenNameTypeData];
	}
	return min(keywordTokens, ([expected, type]) => biasedLevenshtein(expected, input), threshold)?.[1];
}
