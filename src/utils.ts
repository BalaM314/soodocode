/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains utility functions.
*/

import { Token } from "./lexer-types.js";
import type { ExpressionASTArrayTypeNode, ExpressionASTNode } from "./parser-types.js";
import type { StringVariableType, VariableType } from "./runtime.js";

export function stringifyExpressionASTArrayTypeNode(input:ExpressionASTArrayTypeNode){
	return `ARRAY[${input.lengthInformation.map(([l, h]) => `${l.text}:${h.text}`).join(", ")}] OF ${input.type.text}`;
}

export function displayExpression(node:ExpressionASTNode | ExpressionASTArrayTypeNode, expand = false, html = false):string {
	if(node instanceof Token){
		return escapeHTML(node.text);
	} else if("lengthInformation" in node){ //TODO rm in check
		return escapeHTML(stringifyExpressionASTArrayTypeNode(node));
	} else if(node.operator == "function call"){
		const text = `${node.operatorToken.text}(${node.nodes.map(n => displayExpression(n, expand, html)).join(", ")})`;
		return html ? `<span class="expression-display-block">${text}</span>` : text;
	} else if(node.operator == "array access"){
		const text = `${node.operatorToken.text}[${node.nodes.map(n => displayExpression(n, expand, html)).join(", ")}]`;
		return html ? `<span class="expression-display-block">${text}</span>` : text;
	} else if(!node.operator.unary && (!expand || node.nodes.every(n => n instanceof Token))){
		//Not a unary operator and, argument says don't expand or all child nodes are leaf nodes.
		const text = `(${displayExpression(node.nodes[0], expand, html)} ${node.operatorToken.text} ${displayExpression(node.nodes[1], expand, html)})`;
		return html ? `<span class="expression-display-block">${text}</span>` : text;
	} else if(node.operator.unary && (!expand || node.nodes[0] instanceof Token)){
		//Is a unary operator and, argument says don't expand or all child nodes are leaf nodes.
		const text = `(${node.operatorToken.text} ${displayExpression(node.nodes[0], expand, html)})`;
		return html ? `<span class="expression-display-block">${text}</span>` : text;
	} else {
		return (
`(
${displayExpression(node.nodes[0], expand).split("\n").map((l, i, a) => (i == a.length - 1 ? "↱ " : "\t") + l).join("\n")}
${node.operatorToken.text}
${displayExpression(node.nodes[1], expand).split("\n").map((l, i) => (i == 0 ? "↳ " : "\t") + l).join("\n")}
)`
		);
	}
}

export function getText(tokens:Token[]){
	return tokens.map(t => t.text).join(" ");
}

//TODO refactor for token specific
export function splitArray<T>(arr:T[], split:[T] | ((func:T, index:number) => boolean)):T[][]{
	const output:T[][] = [[]];
	if(typeof split == "function"){
		for(let i = 0; i < arr.length; i ++){
			if(split(arr[i], i)) output.push([]);
			else output.at(-1)!.push(arr[i]);
		}
	} else {
		for(const el of arr){
			if(el == split[0]) output.push([]);
			else output.at(-1)!.push(el);
		}
	}
	return output;
}

export class SoodocodeError extends Error {}

export function fail(message:string):never {
	throw new SoodocodeError(message);
}
export function crash(message:string):never {
	throw new Error(message);
}
export function impossible():never {
	throw new Error(`this shouldn't be possible...`);
}
export function escapeHTML(input:string):string {
	return input.replaceAll(/&(?!(amp;)|(lt;)|(gt;))/g, "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Makes the property K of T optional. */
export type PartialKey<T, O extends keyof T> = Partial<T> & Omit<T, O>;

//TODO move to runtime, user defined types
export function isVarType(input:string):input is StringVariableType {
	return input == "INTEGER" || input == "REAL" || input == "STRING" || input == "CHAR" || input == "BOOLEAN" || input == "DATE";
}

export function parseError(thing:unknown):string {
	if(thing instanceof Error){
		return thing.toString();
	} else if(typeof thing == "string"){
		return thing;
	} else if(thing != null && typeof thing == "object" && "toString" in thing && typeof thing.toString == "function"){
		return thing.toString();
	} else {
		console.log("[[FINDTAG]] Unable to parse the following error object");
		console.log(thing as any);
		return "Unable to parse error object";
	}
}

export function forceType<T>(input:unknown):asserts input is T {}
