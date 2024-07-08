import { RangeArray } from "./lexer-types.js";
import { tokenNameTypeData, tokenTextMapping } from "./lexer.js";
export function getText(tokens) {
    return tokens.map(t => t.text).join(" ");
}
export function displayTokenMatcher(input) {
    if (isKey(tokenTextMapping, input)) {
        return `the ${input.startsWith("keyword.") ? "keyword" :
            input.startsWith("operator.") ? "operator" :
                "character"} "${tokenTextMapping[input]}"`;
    }
    else
        return {
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
        }[input];
}
export function applyRangeTransformers(text, ranges) {
    let offset = 0;
    for (const [range, start, end, transformer_] of ranges) {
        const transformer = transformer_ ?? (x => x);
        const newRange = range.map(n => n + offset);
        text = text.slice(0, newRange[0]) + start + transformer(text.slice(...newRange)) + end + text.slice(newRange[1]);
        offset += start.length;
    }
    return text;
}
export function separateArray(arr, predicate) {
    const a = [];
    const b = [];
    for (const el of arr) {
        (predicate(el) ? a : b).push(el);
    }
    return [a, b];
}
export function groupArray(arr, predicate, keys) {
    var _a;
    const out = keys ? Object.fromEntries(keys.map(k => [k, []])) : {};
    for (const el of arr) {
        (out[_a = predicate(el)] ?? (out[_a] = [])).push(el);
    }
    return out;
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
        let lastBoundary = 0;
        for (let i = 0; i <= arr.length; i++) {
            if (i == arr.length || arr[i] == split[0]) {
                output.push(arr.slice(lastBoundary, i));
                lastBoundary = i + 1;
            }
        }
    }
    return output;
}
export function splitTokens(arr, split) {
    const output = [];
    let lastBoundary = 0;
    for (let i = 0; i <= arr.length; i++) {
        if (i == arr.length || arr[i].type == split) {
            output.push(arr.slice(lastBoundary, i));
            lastBoundary = i + 1;
        }
    }
    return output;
}
export function splitTokensWithSplitter(arr, split) {
    const output = [];
    let lastBoundary = 0;
    for (let i = 0; i <= arr.length; i++) {
        if (i == arr.length || arr[i].type == split) {
            output.push({
                group: arr.slice(lastBoundary, i),
                splitter: arr[i]
            });
            lastBoundary = i + 1;
        }
    }
    return output;
}
export function splitTokensOnComma(arr) {
    const output = [];
    let lastBoundary = 0;
    let parenNestLevel = 0, bracketNestLevel = 0;
    for (const [i, token] of arr.entries()) {
        if (token.type == "parentheses.open")
            parenNestLevel++;
        else if (token.type == "parentheses.close")
            parenNestLevel--;
        else if (token.type == "bracket.open")
            bracketNestLevel++;
        else if (token.type == "bracket.close")
            bracketNestLevel--;
        if (parenNestLevel == 0 && bracketNestLevel == 0 && token.type == "punctuation.comma") {
            output.push(arr.slice(lastBoundary, i));
            lastBoundary = i + 1;
        }
    }
    output.push(arr.slice(lastBoundary));
    return output;
}
export function findLastNotInGroup(arr, target) {
    let parenNestLevel = 0, bracketNestLevel = 0;
    for (const [i, token] of [...arr.entries()].reverse()) {
        if (token.type == "parentheses.open")
            parenNestLevel++;
        else if (token.type == "parentheses.close")
            parenNestLevel--;
        else if (token.type == "bracket.open")
            bracketNestLevel++;
        else if (token.type == "bracket.close")
            bracketNestLevel--;
        if (parenNestLevel == 0 && bracketNestLevel == 0 && token.type == target)
            return i;
    }
    return null;
}
export function getUniqueNamesFromCommaSeparatedTokenList(tokens, nextToken, validNames = ["name"]) {
    if (tokens.length == 0)
        return tokens;
    const names = [];
    let expected = "name";
    for (const token of tokens) {
        if (expected == "name") {
            if (validNames.includes(token.type)) {
                names.push(token);
                expected = "comma";
            }
            else
                fail(f.quote `Expected a name, got ${token}`, token);
        }
        else {
            if (token.type == "punctuation.comma") {
                expected = "name";
            }
            else
                fail(f.quote `Expected a comma, got ${token}`, token);
        }
    }
    if (expected == "name")
        fail(`Expected a name, found ${nextToken?.text ?? "end of input"}`, nextToken);
    if (new Set(names.map(t => t.text)).size !== names.length) {
        const duplicateToken = names.find((a, i) => names.find((b, j) => a.text == b.text && i != j)) ?? crash(`Unable to find the duplicate name in ${names.join(" ")}`);
        fail(f.quote `Duplicate name ${duplicateToken} in list`, duplicateToken, tokens);
    }
    return new RangeArray(names);
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
    if (input instanceof RangeArray)
        return input.range;
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
    constructor(message, rangeSpecific, rangeGeneral, rangeOther) {
        super(message);
        this.rangeSpecific = rangeSpecific;
        this.rangeGeneral = rangeGeneral;
        this.rangeOther = rangeOther;
        this.modified = false;
    }
    formatMessage(text) {
        return this.message.replace("$rc", this.rangeOther ? text.slice(...this.rangeOther) : `<empty>`).replace("$r", this.rangeSpecific ? (text.slice(...this.rangeSpecific) || "<empty>") :
            this.rangeGeneral ? (text.slice(...this.rangeGeneral) || "<empty>") :
                `<empty>`);
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
export function Abstract(input, context) {
    return class __temp extends input {
        constructor(...args) {
            super(...args);
            if (this.constructor === __temp)
                throw new Error(`Cannot construct abstract class ${input.name}`);
        }
    };
}
export function errorBoundary({ predicate = (() => true), message } = {}) {
    return function decorator(func, _ctx) {
        return function replacedFunction(...args) {
            try {
                return func.apply(this, args);
            }
            catch (err) {
                if (err instanceof SoodocodeError) {
                    if (message && !err.modified) {
                        err.message = message(...args) + err.message;
                        err.rangeOther = findRange(args);
                    }
                    if (err.rangeSpecific === undefined)
                        err.rangeSpecific = findRange(args);
                    else if (err.rangeGeneral === undefined && predicate(...args)) {
                        const _rangeGeneral = findRange(args);
                        if (_rangeGeneral && err.rangeSpecific && (_rangeGeneral[0] == err.rangeSpecific[0] && _rangeGeneral[1] == err.rangeSpecific[1]))
                            err.rangeGeneral = null;
                        else
                            err.rangeGeneral = _rangeGeneral;
                    }
                    err.modified = true;
                }
                throw err;
            }
        };
    };
}
export function escapeHTML(input) {
    if (input == undefined)
        return "";
    return input.replaceAll(/&(?!(amp;)|(lt;)|(gt;))/g, "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
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
        console.log("Unable to parse the following error object");
        console.log(thing);
        return "Unable to parse error object";
    }
}
export function* zip(...iters) {
    while (true) {
        const values = iters.map(i => i.next());
        if (values.some(v => v.done))
            break;
        yield values.map(v => v.value);
    }
}
export function tagProcessor(transformer) {
    return function (stringChunks, ...varChunks) {
        return String.raw({ raw: stringChunks }, ...varChunks.map((chunk, i) => transformer(chunk, i, stringChunks, varChunks)));
    };
}
function formatText(input) {
    if (typeof input == "string")
        return input;
    if (input instanceof String || input instanceof Number || input instanceof Boolean)
        return input.toString();
    else if (Array.isArray(input)) {
        if (input[0] == "unresolved" && typeof input[1] == "string")
            return input[1];
        return input.map(formatText).join(" ");
    }
    else
        return input.fmtText();
}
function formatShort(input) {
    if (typeof input == "string")
        return input;
    if (input instanceof String || input instanceof Number || input instanceof Boolean)
        return input.toString();
    else if (Array.isArray(input)) {
        if (input[0] == "unresolved" && typeof input[1] == "string")
            return input[1];
        return input.map(formatShort).join(" ");
    }
    else
        return input.fmtShort?.() ?? input.fmtText();
}
function formatQuoted(input) {
    let str;
    if (typeof input == "string")
        str = input;
    else if (input instanceof String || input instanceof Number || input instanceof Boolean)
        str = input.toString();
    else if (Array.isArray(input)) {
        if (input[0] == "unresolved" && typeof input[1] == "string")
            str = input[1];
        else
            str = input.map(formatText).join(" ");
    }
    else
        return input.fmtQuoted?.() ?? `"${input.fmtText()}"`;
    if (str.length == 0)
        str = `[empty]`;
    return `"${str}"`;
}
function formatDebug(input) {
    if (typeof input == "string")
        return input;
    else if (input instanceof String || input instanceof Number || input instanceof Boolean)
        return input.toString();
    else if (Array.isArray(input)) {
        if (input[0] == "unresolved" && typeof input[1] == "string")
            return `UnresolvedVariableType[${input[1]}]`;
        return `[${input.map(formatDebug).join(", ")}]`;
    }
    else
        return input.fmtDebug();
}
export const f = {
    text: tagProcessor(formatText),
    short: tagProcessor(formatShort),
    quote: tagProcessor(formatQuoted),
    debug: tagProcessor(formatDebug),
};
export function forceType(input) { }
export function isKey(record, key) {
    return key in record;
}
export function access(record, key, fallback) {
    return record[key] ?? fallback;
}
export function min(input, predicate, threshold = Infinity) {
    let min = threshold;
    let minItem = null;
    for (const item of input) {
        const score = predicate(item);
        if (score < min) {
            min = score;
            minItem = item;
        }
    }
    return minItem;
}
export function biasedLevenshtein(a, b, maxLengthProduct = 1000) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    const length = (a.length + 1) * (b.length + 1);
    if (length > maxLengthProduct)
        return null;
    const matrix = new Uint8Array(length);
    let ij = 0;
    for (let i = 0; i <= a.length; i++) {
        for (let j = 0; j <= b.length; j++, ij++) {
            matrix[ij] =
                (i == 0) ? j : (j == 0) ? i :
                    Math.min((matrix[(i - 1) * (b.length + 1) + j - 1] + (a[i - 1] == b[j - 1] ? 0 : 1)), matrix[(i - 1) * (b.length + 1) + j] + 1, matrix[i * (b.length + 1) + j - 1] + 1);
        }
    }
    const out = matrix.at(-1);
    if (a.length <= 1 && b.length <= 1)
        return out * 4;
    if (a.length <= 2 && b.length <= 2)
        return out * 2;
    if (b.startsWith(a) || a.startsWith(b))
        return out * 0.7;
    if (b.includes(a) || a.includes(b))
        return out * 0.9;
    return out;
}
export function closestKeywordToken(input, threshold = 1.5) {
    const keywordTokens = Object.entries(tokenNameTypeData);
    if (input.toUpperCase() in tokenNameTypeData) {
        return tokenNameTypeData[input.toUpperCase()];
    }
    return min(keywordTokens, ([expected, type]) => biasedLevenshtein(expected, input) ?? Infinity, threshold)?.[1];
}
const fakeObjectTrap = new Proxy({}, {
    get(target, property) { crash(`Attempted to access property ${String(property)} on fake object`); },
});
export function fakeObject(input) {
    Object.setPrototypeOf(input, fakeObjectTrap);
    return input;
}
export function tryRun(callback) {
    try {
        return [callback(), null];
    }
    catch (err) {
        if (err instanceof SoodocodeError) {
            return [null, err];
        }
        else
            throw err;
    }
}
export function tryRunOr(callback, errorHandler) {
    try {
        callback();
        return true;
    }
    catch (err) {
        if (err instanceof SoodocodeError) {
            errorHandler(err);
            return false;
        }
        else
            throw err;
    }
}
export function boxPrimitive(input) {
    if (typeof input == "boolean")
        return new Boolean(input);
    if (typeof input == "number")
        return new Number(input);
    if (typeof input == "string")
        return new String(input);
    return input;
}
export function unicodeSetsSupported() {
    try {
        void new RegExp("", "v");
        return true;
    }
    catch (err) {
        return false;
    }
}
