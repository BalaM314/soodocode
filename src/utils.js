/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains utility functions.
*/
import { Token } from "./lexer-types.js";
export function stringifyExpressionASTArrayTypeNode(input) {
    return `ARRAY[${input.lengthInformation.map(([l, h]) => `${l.text}:${h.text}`).join(", ")}] OF ${input.type.text}`;
}
export function displayExpression(node, expand = false, html = false) {
    if (node instanceof Token) {
        return escapeHTML(node.text);
    }
    else if ("lengthInformation" in node) { //TODO rm in check
        return escapeHTML(stringifyExpressionASTArrayTypeNode(node));
    }
    else if (node.operator == "function call") {
        const text = `${node.operatorToken.text}(${node.nodes.map(n => displayExpression(n, expand, html)).join(", ")})`;
        return html ? `<span class="expression-display-block">${text}</span>` : text;
    }
    else if (node.operator == "array access") {
        const text = `${node.operatorToken.text}[${node.nodes.map(n => displayExpression(n, expand, html)).join(", ")}]`;
        return html ? `<span class="expression-display-block">${text}</span>` : text;
    }
    else if (!node.operator.unary && (!expand || node.nodes.every(n => n instanceof Token))) {
        //Not a unary operator and, argument says don't expand or all child nodes are leaf nodes.
        const text = `(${displayExpression(node.nodes[0], expand, html)} ${node.operatorToken.text} ${displayExpression(node.nodes[1], expand, html)})`;
        return html ? `<span class="expression-display-block">${text}</span>` : text;
    }
    else if (node.operator.unary && (!expand || node.nodes[0] instanceof Token)) {
        //Is a unary operator and, argument says don't expand or all child nodes are leaf nodes.
        const text = `(${node.operatorToken.text} ${displayExpression(node.nodes[0], expand, html)})`;
        return html ? `<span class="expression-display-block">${text}</span>` : text;
    }
    else {
        return (`(
${displayExpression(node.nodes[0], expand).split("\n").map((l, i, a) => (i == a.length - 1 ? "↱ " : "\t") + l).join("\n")}
${node.operatorToken.text}
${displayExpression(node.nodes[1], expand).split("\n").map((l, i) => (i == 0 ? "↳ " : "\t") + l).join("\n")}
)`);
    }
}
export function getText(tokens) {
    return tokens.map(t => t.text).join(" ");
}
export function splitArray(arr, split) {
    const output = [[]];
    if (typeof split == "function") {
        for (let i = 0; i < arr.length; i++) {
            if (split(arr[i], i))
                output.push([]);
            else
                output.at(-1).push(arr[i]);
        }
    }
    else {
        for (const el of arr) {
            if (el == split[0])
                output.push([]);
            else
                output.at(-1).push(el);
        }
    }
    return output;
}
export function splitTokens(arr, split) {
    const output = [[]];
    for (const el of arr) {
        if (el.type == split)
            output.push([]);
        else
            output.at(-1).push(el);
    }
    return output;
}
export function splitTokensOnComma(arr) {
    const output = [[]];
    let parenNestLevel = 0, bracketNestLevel = 0;
    for (const token of arr) {
        if (token.type == "parentheses.open")
            parenNestLevel++;
        else if (token.type == "parentheses.close")
            parenNestLevel--;
        else if (token.type == "bracket.open")
            bracketNestLevel++;
        else if (token.type == "bracket.close")
            bracketNestLevel--;
        if (parenNestLevel == 0 && bracketNestLevel == 0 && token.type == "punctuation.comma")
            output.push([]);
        else
            output.at(-1).push(token);
    }
    return output;
}
export function getTotalRange(tokens) {
    return tokens.map(t => Array.isArray(t) ? t : t.range).reduce((acc, t) => [Math.min(acc[0], t[0]), Math.max(acc[1], t[1])], [0, 0]);
}
export class SoodocodeError extends Error {
    constructor(message, range) {
        super(message);
        this.range = range;
    }
}
export function fail(message, range) {
    throw new SoodocodeError(message, Array.isArray(range) ? range : range?.range);
}
export function crash(message) {
    throw new Error(message);
}
export function impossible() {
    throw new Error(`this shouldn't be possible...`);
}
function isRange(input) {
    return Array.isArray(input) && input.length == 2 && typeof input[0] == "number" && typeof input[1] == "number";
}
export function findRange(args) {
    for (const arg of args) {
        if (typeof arg == "object" && arg != null && "range" in arg && isRange(arg.range))
            return arg.range;
        if (Array.isArray(arg) && isRange(arg[0]))
            return getTotalRange(arg);
        if (Array.isArray(arg) && isRange(arg[0].range))
            return getTotalRange(arg);
    }
    return undefined;
}
export function errorBoundary(func) {
    return function (...args) {
        try {
            return func(...args);
        }
        catch (err) {
            if (err instanceof SoodocodeError && !err.range) {
                //Try to find the range
                err.range = findRange(args);
                throw err;
            }
            else
                throw err;
        }
    };
}
export function escapeHTML(input) {
    return input.replaceAll(/&(?!(amp;)|(lt;)|(gt;))/g, "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
//TODO move to runtime, user defined types
export function isVarType(input) {
    return input == "INTEGER" || input == "REAL" || input == "STRING" || input == "CHAR" || input == "BOOLEAN" || input == "DATE";
}
export function parseError(thing) {
    if (thing instanceof Error) {
        return thing.toString();
    }
    else if (typeof thing == "string") {
        return thing;
    }
    else if (thing != null && typeof thing == "object" && "toString" in thing && typeof thing.toString == "function") {
        return thing.toString();
    }
    else {
        console.log("[[FINDTAG]] Unable to parse the following error object");
        console.log(thing);
        return "Unable to parse error object";
    }
}
export function forceType(input) { }
