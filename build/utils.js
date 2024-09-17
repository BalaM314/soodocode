import { tokenNameTypeData, tokenTextMapping } from "./lexer.js";
export function getText(tokens) {
    return tokens.map(t => t.text).join(" ");
}
export function manageNestLevel(reversed = false, validate = true) {
    let paren = 0;
    let bracket = 0;
    const sign = reversed ? -1 : +1;
    return {
        update(token) {
            if (token.type == "parentheses.open")
                paren += sign;
            else if (token.type == "parentheses.close")
                paren -= sign;
            else if (token.type == "bracket.open")
                bracket += sign;
            else if (token.type == "bracket.close")
                bracket -= sign;
            if (validate) {
                if (paren < 0)
                    fail(reversed ? `Unclosed parenthesis group` : `No parenthesis group to close`, token);
                if (bracket < 0)
                    fail(reversed ? `Unclosed square bracket group` : `No square bracket group to close`, token);
            }
        },
        out() {
            return paren == 0 && bracket == 0;
        },
        in() {
            return paren != 0 || bracket != 0;
        },
        done(input) {
            if (isRange(input)) {
                if (paren != 0)
                    fail(reversed ? `No square bracket group to close` : `Unclosed square bracket group`, input);
                if (bracket != 0)
                    fail(reversed ? `No parenthesis group to close` : `Unclosed parenthesis group`, input);
            }
            else {
                if (paren != 0 || bracket != 0) {
                    const reverse = !reversed;
                    const reverseIter = manageNestLevel(reverse, true);
                    for (const token of (reverse ? input.slice().reverse() : input))
                        reverseIter.update(token);
                    impossible();
                }
            }
        }
    };
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
export function applyRangeTransformers(text, ranges, transformer = (x => x)) {
    const chars = [...text].map(transformer);
    for (const [[range, start, end], remaining] of withRemaining(ranges)) {
        chars.splice(range[1], 0, end);
        chars.splice(range[0], 0, start);
        remaining.forEach(([next]) => {
            next[0] =
                next[0] >= range[1] ? next[0] + 2 :
                    next[0] > range[0] ? next[0] + 1 :
                        (next[0] >= range[0] && next[1] <= range[1]) ? next[0] + 1 :
                            next[0];
            next[1] =
                next[1] > range[1] ? next[1] + 2 :
                    (next[1] >= range[1] && next[0] < range[0]) ? next[1] + 2 :
                        next[1] > range[0] ? next[1] + 1 :
                            next[1];
        });
    }
    return chars.join("");
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
    const nestLevel = manageNestLevel();
    for (const [i, token] of arr.entries()) {
        nestLevel.update(token);
        if (nestLevel.out() && token.type == "punctuation.comma") {
            output.push(arr.slice(lastBoundary, i));
            lastBoundary = i + 1;
        }
    }
    nestLevel.done(arr);
    output.push(arr.slice(lastBoundary));
    return output;
}
export function findLastNotInGroup(arr, target) {
    const nestLevel = manageNestLevel(true);
    for (const [i, token] of [...arr.entries()].reverse()) {
        nestLevel.update(token);
        if (nestLevel.out() && token.type == target)
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
export function getTotalRange(things) {
    if (things.length == 0)
        crash(`Cannot get range from an empty list of tokens`);
    return things.map(t => Array.isArray(t) ? t : (typeof t.range == "function" ? t.range() : t.range)).reduce((acc, t) => [Math.min(acc[0], t[0]), Math.max(acc[1], t[1])], [Infinity, -Infinity]);
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
export function fail(message, rangeSpecific, rangeGeneral, rangeOther) {
    throw new SoodocodeError(message, getRange(rangeSpecific), getRange(rangeGeneral), getRange(rangeOther));
}
export function rethrow(error, msg) {
    error.message = msg(error.message);
    throw error;
}
export function crash(message, ...extra) {
    console.error(...extra);
    throw new Error(message);
}
export function impossible() {
    throw new Error(`this shouldn't be possible...`);
}
export function Abstract(input, context) {
    return class __temp extends input {
        constructor(...args) {
            super(...args);
            if (new.target === __temp)
                throw new Error(`Cannot construct abstract class ${input.name}`);
        }
    };
}
export function errorBoundary({ predicate = (() => true), message } = {}) {
    return function decorator(func, _ctx) {
        const name = func.name.startsWith("_") ? `wrapped${func.name}` : `wrapped_${func.name}`;
        const replacedFunction = { [name](...args) {
                try {
                    return func.apply(this, args);
                }
                catch (err) {
                    if (err instanceof SoodocodeError) {
                        if (message && !err.modified) {
                            err.message = message(...args) + err.message;
                            if (err.rangeOther)
                                impossible();
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
            } }[name];
        Object.defineProperty(replacedFunction, "name", { value: name });
        replacedFunction.displayName = name;
        return replacedFunction;
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
export function* withRemaining(items) {
    for (let i = 0; i < items.length; i++) {
        yield [items[i], items.slice(i + 1)];
    }
}
export function tagProcessor(transformer) {
    return function (stringChunks, ...varChunks) {
        return String.raw({ raw: stringChunks }, ...varChunks.map((chunk, i) => transformer(chunk, i, stringChunks, varChunks)));
    };
}
function formatText(input) {
    if (input instanceof String || input instanceof Number || input instanceof Boolean ||
        typeof input == "string" || typeof input == "number" || typeof input == "boolean")
        return input.toString();
    if (Array.isArray(input)) {
        if (input[0] == "unresolved" && typeof input[1] == "string")
            return input[1];
        return input.map(formatText).join(" ");
    }
    else
        return input.fmtText();
}
function formatShort(input) {
    if (input instanceof String || input instanceof Number || input instanceof Boolean ||
        typeof input == "string" || typeof input == "number" || typeof input == "boolean")
        return input.toString();
    if (Array.isArray(input)) {
        if (input[0] == "unresolved" && typeof input[1] == "string")
            return input[1];
        return input.map(formatShort).join(" ");
    }
    else
        return input.fmtShort?.() ?? input.fmtText();
}
function formatQuoted(input) {
    let str;
    if (input instanceof String || input instanceof Number || input instanceof Boolean ||
        typeof input == "string" || typeof input == "number" || typeof input == "boolean")
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
    if (input instanceof String || input instanceof Number || input instanceof Boolean ||
        typeof input == "string" || typeof input == "number" || typeof input == "boolean")
        return input.toString();
    if (Array.isArray(input)) {
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
export function max(input, predicate, threshold = -Infinity) {
    let max = threshold;
    let maxItem = null;
    for (const item of input) {
        const score = predicate(item);
        if (score > max) {
            max = score;
            maxItem = item;
        }
    }
    return maxItem;
}
export function biasedLevenshtein(a, b, maxLengthProduct = 1000) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    if (a == b)
        return 0;
    const length = (a.length + 1) * (b.length + 1);
    if (length > maxLengthProduct)
        return NaN;
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
    if (a.length <= 1 || b.length <= 1)
        return out * 4;
    if (a.length <= 2 || b.length <= 2)
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
    return min(keywordTokens, ([expected, type]) => biasedLevenshtein(expected, input), threshold)?.[1];
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
let _unicodeSetsSupported = null;
export function unicodeSetsSupported() {
    return _unicodeSetsSupported ?? (_unicodeSetsSupported = (() => {
        try {
            void new RegExp("", "v");
            return true;
        }
        catch (err) {
            return false;
        }
    })());
}
export function capitalizeWord(word) {
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
}
export function capitalizeText(input) {
    return input
        .split(/[^a-z0-9]+/i)
        .map((w, i) => i == 0 ? capitalizeWord(w) : w.toLowerCase())
        .join(" ");
}
export function shallowCloneOwnProperties(input) {
    return Object.defineProperties({}, Object.getOwnPropertyDescriptors(input));
}
export class RangeArray extends Array {
    constructor(arg0, range) {
        if (typeof arg0 == "number") {
            super(arg0);
            this.range = null;
        }
        else {
            super(...arg0);
            this.range = range ?? getTotalRange(arg0);
        }
    }
    slice(start = 0, end = this.length) {
        const arr = super.slice(start, end);
        if (arr.length == 0) {
            let range;
            if (this.length == 0)
                range = this.range;
            else {
                const rangeStart = this[start - 1]?.range[1] ?? this.range[0];
                const rangeEnd = this.at(end)?.range[0] ?? this.range[1];
                range = [rangeStart, rangeEnd];
            }
            return new RangeArray(arr, range);
        }
        else {
            return new RangeArray(arr);
        }
    }
    map(fn) {
        return Array.from(this).map(fn);
    }
    select(fn, range) {
        if (this.length == 0)
            return this.slice();
        const arr = super.filter(fn);
        arr.range = arr.length > 0 ? getTotalRange(arr) : (range ?? crash(`Cannot get range from an empty filtered list of tokens`));
        return arr;
    }
}
RangeArray.prototype.filter = () => crash(`Do not call filter() on RangeArray, use select() instead.`);
export function getAllPropertyDescriptors(object) {
    const proto = Object.getPrototypeOf(object);
    if (proto == Object.prototype || proto == null)
        return Object.getOwnPropertyDescriptors(object);
    else
        return {
            ...getAllPropertyDescriptors(proto),
            ...Object.getOwnPropertyDescriptors(object),
        };
}
export function combineClasses(...classes) {
    function ctor(...args) {
        if (!new.target)
            crash(`Cannot call class constructor without new`);
        Object.assign(this, ...classes.map(c => Reflect.construct(c, args, new.target)));
    }
    Object.setPrototypeOf(ctor, classes[0]);
    const statics = Object.defineProperties({}, Object.assign({}, ...classes.slice(1).map(c => getAllPropertyDescriptors(c))));
    const ctorPrototype = Object.defineProperties(Object.create(classes[0].prototype), Object.assign({}, ...classes.slice(1).map(c => getAllPropertyDescriptors(c.prototype))));
    return Object.assign(ctor, statics, {
        prototype: ctorPrototype
    });
}
