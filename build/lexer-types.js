import { crash, getRange, getTotalRange } from "./utils.js";
export const symbolTypes = [
    "numeric_fragment",
    "quote.single", "quote.double",
    "brace.open", "brace.close",
    "bracket.open", "bracket.close",
    "parentheses.open", "parentheses.close",
    "punctuation.colon", "punctuation.semicolon", "punctuation.comma", "punctuation.period",
    "comment.singleline", "comment.multiline.open", "comment.multiline.close",
    "word",
    "unknown",
    "space",
    "newline",
    "operator.add", "operator.minus", "operator.multiply", "operator.divide", "operator.mod", "operator.integer_divide", "operator.and", "operator.or", "operator.not", "operator.equal_to", "operator.not_equal_to", "operator.less_than", "operator.greater_than", "operator.less_than_equal", "operator.greater_than_equal", "operator.assignment", "operator.pointer", "operator.string_concatenate"
];
export class Symbol {
    constructor(type, text, range) {
        this.type = type;
        this.text = text;
        this.range = range;
    }
    toToken() {
        return new Token(TokenType(this.type), this.text, this.range);
    }
    fmtDebug() {
        return `Symbol [${this.type} ${this.text}]`;
    }
    fmtText() {
        return this.text;
    }
    clearRange() {
        this.range = [-1, -1];
        return this;
    }
    rangeBefore() {
        return [this.range[0] - 1, this.range[0]];
    }
    rangeAfter() {
        return [this.range[1], this.range[1] + 1];
    }
}
export const tokenTypes = [
    "number.decimal",
    "string", "char",
    "brace.open", "brace.close",
    "bracket.open", "bracket.close",
    "parentheses.open", "parentheses.close",
    "punctuation.colon", "punctuation.semicolon", "punctuation.comma", "punctuation.period",
    "name",
    "boolean.true", "boolean.false",
    "keyword.declare", "keyword.define", "keyword.constant", "keyword.output", "keyword.input", "keyword.call",
    "keyword.if", "keyword.then", "keyword.else", "keyword.if_end",
    "keyword.for", "keyword.to", "keyword.for_end", "keyword.step",
    "keyword.while", "keyword.while_end", "keyword.dowhile", "keyword.dowhile_end",
    "keyword.function", "keyword.function_end", "keyword.procedure", "keyword.procedure_end", "keyword.return", "keyword.returns",
    "keyword.pass_mode.by_reference", "keyword.pass_mode.by_value",
    "keyword.type", "keyword.type_end",
    "keyword.open_file", "keyword.read_file", "keyword.write_file", "keyword.close_file",
    "keyword.get_record", "keyword.put_record", "keyword.seek",
    "keyword.file_mode.read", "keyword.file_mode.write", "keyword.file_mode.append", "keyword.file_mode.random",
    "keyword.case", "keyword.of", "keyword.case_end", "keyword.otherwise",
    "keyword.class", "keyword.class_end", "keyword.new", "keyword.super", "keyword.inherits",
    "keyword.class_modifier.private", "keyword.class_modifier.public",
    "keyword.array", "keyword.set",
    "newline",
    "operator.add", "operator.minus", "operator.multiply", "operator.divide", "operator.mod", "operator.integer_divide", "operator.and", "operator.or", "operator.not", "operator.equal_to", "operator.not_equal_to", "operator.less_than", "operator.greater_than", "operator.less_than_equal", "operator.greater_than_equal", "operator.assignment", "operator.pointer", "operator.string_concatenate"
];
export function TokenType(input) {
    if (tokenTypes.includes(input))
        return input;
    crash(`"${input}" is not a valid token type`);
}
export class Token {
    constructor(type, text, range) {
        this.type = type;
        this.text = text;
        this.range = range;
    }
    fmtText() {
        return this.text;
    }
    fmtDebug() {
        return `Token [${this.type} ${this.text}]`;
    }
    clone() {
        return new Token(this.type, this.text, this.range);
    }
    extendRange(other) {
        this.range = getTotalRange([getRange(other), this]);
        return this;
    }
    clearRange() {
        this.range = [-1, -1];
        return this;
    }
    rangeBefore() {
        return [this.range[0] - 1, this.range[0]];
    }
    rangeAfter() {
        return [this.range[1], this.range[1] + 1];
    }
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
        return [...this].map(fn);
    }
}
