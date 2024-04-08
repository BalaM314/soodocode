/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains utility functions.
*/
import { Token } from "./lexer-types.js";
import { ExpressionASTArrayAccessNode, ExpressionASTArrayTypeNode, ExpressionASTFunctionCallNode } from "./parser-types.js";
export function stringifyExpressionASTArrayTypeNode(input) {
    return `ARRAY[${input.lengthInformation.map(([l, h]) => `${l.text}:${h.text}`).join(", ")}] OF ${input.elementType.text}`;
}
export function displayExpression(node, expand = false, html = false) {
    if (node instanceof Token)
        return escapeHTML(node.text);
    if (node instanceof ExpressionASTArrayTypeNode)
        return escapeHTML(stringifyExpressionASTArrayTypeNode(node));
    if (node instanceof ExpressionASTFunctionCallNode) {
        const text = `${escapeHTML(node.functionName.text)}(${node.args.map(n => displayExpression(n, expand, html)).join(", ")})`;
        return html ? `<span class="expression-display-block">${text}</span>` : text;
    }
    if (node instanceof ExpressionASTArrayAccessNode) {
        const text = `${displayExpression(node.target)}[${node.indices.map(n => displayExpression(n, expand, html)).join(", ")}]`;
        return html ? `<span class="expression-display-block">${text}</span>` : text;
    }
    const compressed = !expand || node.nodes.every(n => n instanceof Token);
    //TODO fix this function: needs to handle unary postfix correctly, also fix the display block code which breaks on switch statements
    if (!node.operator.type.startsWith("unary") && compressed) {
        //Not a unary operator and, argument says don't expand or all child nodes are leaf nodes.
        const text = `(${displayExpression(node.nodes[0], expand, html)} ${node.operatorToken.text} ${displayExpression(node.nodes[1], expand, html)})`;
        return html ? `<span class="expression-display-block">${text}</span>` : text;
    }
    else if (node.operator.type.startsWith("unary") && compressed) {
        //Is a unary operator and, argument says don't expand or all child nodes are leaf nodes.
        const text = `(${node.operatorToken.text} ${displayExpression(node.nodes[0], expand, html)})`;
        return html ? `<span class="expression-display-block">${text}</span>` : text;
    }
    else if (node.operator.type.startsWith("unary")) {
        return (`(
${node.operatorToken.text}
${displayExpression(node.nodes[0], expand).split("\n").map((l, i) => (i == 0 ? "↳ " : "\t") + l).join("\n")}
)`);
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
            if (split(arr[i], i, arr))
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
export function splitTokensWithSplitter(arr, split) {
    const output = [{ group: [] }];
    for (const el of arr) {
        if (el.type == split) {
            output.at(-1).splitter = el;
            output.push({ group: [] });
        }
        else
            output.at(-1).group.push(el);
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
export function getUniqueNamesFromCommaSeparatedTokenList(tokens, nextToken, validNames = ["name"]) {
    const names = [];
    let expected = "name";
    for (const token of tokens) {
        if (expected == "name") {
            if (validNames.includes(token.type)) {
                names.push(token);
                expected = "commaOrColon";
            }
            else
                fail(fquote `Expected a name, got ${token.text}`, token);
        }
        else {
            if (token.type == "punctuation.comma") {
                expected = "name";
            }
            else
                fail(fquote `Expected a comma, got ${token.text}`, token);
        }
    }
    if (expected == "name")
        fail(`Expected a name, found ${nextToken?.text ?? "end of input"}`, nextToken);
    if (new Set(names.map(t => t.text)).size !== names.length) {
        //duplicate value
        const duplicateToken = names.find((a, i) => names.find((b, j) => a.text == b.text && i != j)) ?? crash(`Unable to find the duplicate name in ${names.join(" ")}`);
        fail(fquote `Duplicate name ${duplicateToken.text} in list`, duplicateToken, tokens);
    }
    return names;
}
export function getTotalRange(tokens) {
    if (tokens.length == 0)
        crash(`Cannot get range from an empty list of tokens`);
    return tokens.map(t => Array.isArray(t) ? t : (typeof t.range == "function" ? t.range() : t.range)).reduce((acc, t) => [Math.min(acc[0], t[0]), Math.max(acc[1], t[1])], [Infinity, -Infinity]);
}
export function isRange(input) {
    return Array.isArray(input) && input.length == 2 && typeof input[0] == "number" && typeof input[1] == "number";
}
export function getRange(input) {
    if (!input)
        return input;
    if (isRange(input))
        return input;
    if (Array.isArray(input))
        return getTotalRange(input);
    if (typeof input.range == "function")
        return input.range();
    else
        return input.range;
}
export function findRange(args) {
    for (const arg of args) {
        if (typeof arg == "object" && arg != null && "range" in arg && isRange(arg.range))
            return arg.range;
        if (Array.isArray(arg) && isRange(arg[0]))
            return getTotalRange(arg);
        if (Array.isArray(arg) && arg.length > 0 && isRange(arg[0].range))
            return getTotalRange(arg);
    }
    return undefined;
}
export class SoodocodeError extends Error {
    constructor(message, rangeSpecific, rangeGeneral) {
        super(message);
        this.rangeSpecific = rangeSpecific;
        this.rangeGeneral = rangeGeneral;
    }
}
export function fail(message, rangeSpecific, rangeGeneral) {
    throw new SoodocodeError(message, getRange(rangeSpecific), getRange(rangeGeneral));
}
export function crash(message) {
    throw new Error(message);
}
export function impossible() {
    throw new Error(`this shouldn't be possible...`);
}
export function errorBoundary(func, ctx) {
    return function (...args) {
        try {
            return func.apply(this, args);
        }
        catch (err) {
            if (err instanceof SoodocodeError) {
                //Try to find the range
                if (err.rangeSpecific === undefined)
                    err.rangeSpecific = findRange(args);
                else if (err.rangeGeneral === undefined) {
                    const _rangeGeneral = findRange(args);
                    if ( //If the general range is unspecified, and when guessede is equal to the specific range, just set it to null
                    _rangeGeneral && err.rangeSpecific && (_rangeGeneral[0] == err.rangeSpecific[0] && _rangeGeneral[1] == err.rangeSpecific[1]))
                        err.rangeGeneral = null;
                    else
                        err.rangeGeneral = _rangeGeneral;
                }
            }
            throw err;
        }
    };
}
export function escapeHTML(input) {
    return input.replaceAll(/&(?!(amp;)|(lt;)|(gt;))/g, "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
export function isPrimitiveType(input) {
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
/** Generates a tag template processor from a function that processes one value at a time. */
export function tagProcessor(transformer) {
    return function (stringChunks, ...varChunks) {
        return String.raw({ raw: stringChunks }, ...varChunks.map((chunk, i) => transformer(chunk, i, stringChunks, varChunks)));
    };
}
export const fquote = tagProcessor((chunk) => {
    const str = chunk.toString();
    return str.length == 0 ? "[empty]" : `"${str}"`;
});
export function forceType(input) { }
