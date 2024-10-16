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
function formatErrorLine(line, sourceCode) {
    return typeof line == "string" ? line : line.map(chunk => (typeof chunk == "string" || typeof chunk == "number")
        ? String(chunk)
        : sourceCode.slice(...getRange(chunk))).join("");
}
export class SoodocodeError extends Error {
    constructor(richMessage, rangeSpecific, rangeGeneral, rangeOther) {
        super(SoodocodeError.getString(richMessage));
        this.richMessage = richMessage;
        this.rangeSpecific = rangeSpecific;
        this.rangeGeneral = rangeGeneral;
        this.rangeOther = rangeOther;
        this.modified = false;
    }
    formatMessage(sourceCode) {
        if (typeof this.richMessage == "string") {
            return this.richMessage.replace("$rc", this.rangeOther ? sourceCode.slice(...this.rangeOther) : `<empty>`) + "\n\n" + this.showRange(sourceCode, false);
        }
        else {
            let output = "";
            output += formatErrorLine(this.richMessage.summary, sourceCode) + "\n";
            if (this.richMessage.elaboration) {
                output += array(this.richMessage.elaboration).map(line => "\t" + formatErrorLine(line, sourceCode) + "\n").join("");
                output += "\n";
            }
            if (this.richMessage.context) {
                output += array(this.richMessage.context).map(line => "\t" + formatErrorLine(line, sourceCode) + "\n").join("");
                output += "\n";
            }
            const { help } = this.richMessage;
            if (help) {
                if (Array.isArray(help) || typeof help === "string") {
                    output += array(help).map(line => `help: ${formatErrorLine(line, sourceCode)}`).join("\n");
                }
                else {
                    output += `help: ${help.message ?? `To allow this`}, ${help.value === true ? `enable the config "${help.config.name}"` :
                        help.value === false ? `disable the config "${help.config.name}"` :
                            ["increase", "decrease"].includes(help.value) ? `${help.value} the value of the config "${help.config.name}"` :
                                `change the config "${help.config.name}" to ${String(help.value)}`}`;
                }
            }
            output += "\n\n" + this.showRange(sourceCode, false);
            return output;
        }
    }
    formatMessageHTML(sourceCode) {
        if (typeof this.richMessage == "string") {
            return span(this.richMessage.replace("$rc", this.rangeOther ? sourceCode.slice(...this.rangeOther) : `<empty>`), "error-message") + "\n\n" + this.showRange(sourceCode, true);
        }
        else {
            let output = "";
            output += span(formatErrorLine(this.richMessage.summary, sourceCode), "error-message") + "\n";
            if (this.richMessage.elaboration) {
                output += array(this.richMessage.elaboration).map(line => "  &bull; " + span(formatErrorLine(line, sourceCode), "error-message-elaboration") + "\n").join("");
            }
            if (this.richMessage.context) {
                output += array(this.richMessage.context).map(line => "\t" + span(formatErrorLine(line, sourceCode), "error-message-context") + "\n").join("");
            }
            const { help } = this.richMessage;
            if (help) {
                output += "\n";
                if (Array.isArray(help) || typeof help === "string") {
                    output += span(array(help).map(line => `help: ${formatErrorLine(line, sourceCode)}`).join("\n"), "error-message-help");
                }
                else {
                    const shouldCreateButton = typeof help.value !== "string";
                    if (shouldCreateButton)
                        globalThis.currentConfigModificationFunc = () => {
                            help.config.value = help.value;
                            globalThis.currentConfigModificationFunc = () => {
                                document.getElementById("execute-soodocode-button")?.click();
                                globalThis.currentConfigModificationFunc = undefined;
                            };
                        };
                    const buttonAttributes = `class="error-message-help-clickable" onclick="currentConfigModificationFunc?.();this.classList.add('error-message-help-clicked');"`;
                    output += (`<span class="error-message-help">\
help: ${escapeHTML(help.message ?? `to allow this`)}, \
<span ${shouldCreateButton ? buttonAttributes : ""}>${escapeHTML(help.value === true ? `enable the config "${help.config.name}"` :
                        help.value === false ? `disable the config "${help.config.name}"` :
                            ["increase", "decrease"].includes(help.value) ? `${help.value} the value of the config "${help.config.name}"` :
                                `change the config "${help.config.name}" to ${String(help.value)}`)}</span></span>`);
                    output += "\n";
                }
            }
            output += "\n";
            output += this.showRange(sourceCode, true);
            return output;
        }
    }
    adjustRanges(text) {
        if (this.rangeSpecific) {
            if (this.rangeSpecific[0] == this.rangeSpecific[1]) {
                this.rangeSpecific[1]++;
            }
            if (this.rangeSpecific[1] - this.rangeSpecific[0] == 1) {
                const specificText = text.slice(...this.rangeSpecific);
                if (specificText == "" || specificText == "\n")
                    this.rangeSpecific = this.rangeSpecific.map(n => n - 1);
            }
        }
        if (this.rangeGeneral && this.rangeSpecific) {
            if (this.rangeSpecific[1] - this.rangeSpecific[0] == 1 &&
                this.rangeGeneral[1] == this.rangeSpecific[0])
                this.rangeGeneral[1]++;
        }
    }
    showRange(text, html) {
        if (!this.rangeGeneral && !this.rangeSpecific)
            return ``;
        this.adjustRanges(text);
        let outerRange;
        if (html) {
            outerRange = getTotalRange([this.rangeGeneral, this.rangeSpecific].filter(Boolean));
        }
        else {
            outerRange = this.rangeSpecific ?? this.rangeGeneral;
        }
        const beforeText = text.slice(0, outerRange[0]);
        const rangeText = text.slice(...outerRange);
        const beforeLines = beforeText.split("\n");
        const lineNumber = beforeLines.length.toString();
        const previousLineNumber = (beforeLines.length - 1).toString().padStart(lineNumber.length, " ");
        const previousLine = beforeLines.at(-2);
        const startOfLine = beforeLines.at(-1);
        const restOfLine = text.slice(outerRange[1]).split("\n")[0];
        const lines = html ? (() => {
            const formattedRangeText = applyRangeTransformers(rangeText, [
                this.rangeGeneral && [
                    this.rangeGeneral.map(n => n - outerRange[0]),
                    `<span class="error-range-outer">`, "</span>",
                ],
                this.rangeSpecific && [
                    this.rangeSpecific.map(n => n - outerRange[0]),
                    `<span class="error-range-inner">`, "</span>",
                ],
            ].filter(Boolean), escapeHTML);
            const formattedPreviousLine = previousLine && `${previousLineNumber} | ${escapeHTML(previousLine)}`;
            const errorLine = `${lineNumber} | ${escapeHTML(startOfLine)}${formattedRangeText}${escapeHTML(restOfLine)}`;
            return [formattedPreviousLine, errorLine];
        })() : (() => {
            const formattedPreviousLine = previousLine && `${previousLineNumber} | ${previousLine}`;
            const errorLine = `${lineNumber} | ${startOfLine}${rangeText}${restOfLine}`;
            const underlineLine = `${" ".repeat(lineNumber.length)} | ${startOfLine.replace(/[^\t]/g, " ")}${"~".repeat(rangeText.length)}`;
            return [formattedPreviousLine, errorLine, underlineLine];
        })();
        const formattedText = lines.filter(Boolean).map(l => "\t" + l).join("\n");
        if (html)
            return `<span class="code-display">${formattedText}</span>`;
        else
            return formattedText;
    }
    static getString(message) {
        if (typeof message == "string")
            return message;
        return typeof message.summary == "string" ? message.summary : message.summary.map(chunk => typeof chunk == "string" ? chunk : "<...>").join("");
    }
}
export function enableConfig(config) {
    return {
        config,
        value: true
    };
}
export function setConfig(value, config) {
    return { config, value };
}
export function fail(message, rangeSpecific, rangeGeneral, rangeOther) {
    throw new SoodocodeError(message, getRange(rangeSpecific), getRange(rangeGeneral), getRange(rangeOther));
}
export function rethrow(error, msg) {
    error.richMessage = msg(error.richMessage);
    throw error;
}
export function crash(message, ...extra) {
    console.error(...extra);
    throw new Error(message);
}
export function impossible() {
    throw new Error(`this shouldn't be possible...`);
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
                            const _rangeGeneral = findRange(args.concat(this));
                            if (!(_rangeGeneral && err.rangeSpecific && (_rangeGeneral[0] == err.rangeSpecific[0] && _rangeGeneral[1] == err.rangeSpecific[1])))
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
export function Abstract(input, context) {
    return class __temp extends input {
        constructor(...args) {
            super(...args);
            if (new.target === __temp)
                throw new Error(`Cannot construct abstract class ${input.name}`);
        }
    };
}
export function array(input) {
    if (Array.isArray(input))
        return input;
    else
        return [input];
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
const fakeObjectTrap = new Proxy({}, {
    get(target, property) { crash(`Attempted to access property ${String(property)} on fake object`); },
});
export function fakeObject(input) {
    Object.setPrototypeOf(input, fakeObjectTrap);
    return input;
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
        catch {
            return false;
        }
    })());
}
export function shallowCloneOwnProperties(input) {
    return Object.defineProperties({}, Object.getOwnPropertyDescriptors(input));
}
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
export function match(value, clauses, defaultValue) {
    return value in clauses ? clauses[value] : defaultValue;
}
export function* zip(...iters) {
    while (true) {
        const values = iters.map(i => i.next());
        if (values.some(v => v.done))
            break;
        yield values.map(v => v.value);
    }
}
export function weave(...arrays) {
    const out = [];
    for (let j = 0;; j++) {
        for (let i = 0; i < arrays.length; i++) {
            if (j >= arrays[i].length)
                return out;
            out.push(arrays[i][j]);
        }
    }
}
export function* withRemaining(items) {
    for (let i = 0; i < items.length; i++) {
        yield [items[i], items.slice(i + 1)];
    }
}
export function escapeHTML(input) {
    if (input == undefined)
        return "";
    return input.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
export function span(input, className) {
    return `<span class="${className}">${escapeHTML(input)}</span>`;
}
export function plural(count, word, plural = word + "s") {
    return `${count} ${count == 1 ? word : plural}`;
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
export function quote(input) {
    return input != null ? formatQuoted(input) : input;
}
export const f = {
    text: tagProcessor(formatText),
    short: tagProcessor(formatShort),
    quote: tagProcessor(formatQuoted),
    debug: tagProcessor(formatDebug),
    quoteRange(stringChunks, ...varChunks) {
        return weave(stringChunks.map((chunk, i) => {
            if (varChunks.length == 0)
                return chunk;
            if (i == 0)
                return chunk + `"`;
            else if (i == varChunks.length)
                return `"` + chunk;
            else
                return `"${chunk}"`;
        }), varChunks);
    },
    range(stringChunks, ...varChunks) {
        return weave(stringChunks, varChunks);
    },
};
export function forceType(input) { }
export function isKey(record, key) {
    return Object.hasOwn(record, key);
}
export function access(record, key, fallback) {
    return record[key] ?? fallback;
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
