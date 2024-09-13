import { configs } from "./config.js";
import { Symbol, Token } from "./lexer-types.js";
import { RangeArray, access, crash, f, fail, unicodeSetsSupported } from "./utils.js";
export const symbolTypeData = [
    [/(?:<[-\u2010-\u2015]{1,3})|[\uF0AC\u2190\u21D0\u21E0\u21FD]/, "operator.assignment"],
    [">=", "operator.greater_than_equal"],
    ["<=", "operator.less_than_equal"],
    ["<>", "operator.not_equal_to"],
    ["!=", "invalid.not_equal_to"],
    ["//", "comment.singleline"],
    ["/*", "comment.multiline.open"],
    ["*/", "comment.multiline.close"],
    ["..", "operator.range"],
    ["=", "operator.equal_to"],
    [">", "operator.greater_than"],
    ["<", "operator.less_than"],
    ["+", "operator.add"],
    ["-", "operator.minus"],
    ["*", "operator.multiply"],
    ["/", "operator.divide"],
    ["^", "operator.pointer"],
    ["&", "operator.string_concatenate"],
    ["(", "parentheses.open"],
    [")", "parentheses.close"],
    ["[", "bracket.open"],
    ["]", "bracket.close"],
    ["{", "brace.open"],
    ["}", "brace.close"],
    ["'", "quote.single"],
    ["\"", "quote.double"],
    [":", "punctuation.colon"],
    [";", "punctuation.semicolon"],
    [",", "punctuation.comma"],
    [".", "punctuation.period"],
    [" ", "space"],
    ["\t", "space"],
    [/\n+/, "newline"],
    [["isNumber"], "numeric_fragment"],
    [["isAlphanumeric"], "word"],
    [/^./u, "unknown"],
];
export const tokenNameTypeData = {
    "AND": "operator.and",
    "APPEND": "keyword.file_mode.append",
    "ARRAY": "keyword.array",
    "BYREF": "keyword.pass_mode.by_reference",
    "BYVAL": "keyword.pass_mode.by_value",
    "CALL": "keyword.call",
    "CASE": "keyword.case",
    "CLASS": "keyword.class",
    "CLOSEFILE": "keyword.close_file",
    "CONSTANT": "keyword.constant",
    "DECLARE": "keyword.declare",
    "DEFINE": "keyword.define",
    "DIV": "operator.integer_divide",
    "ELSE": "keyword.else",
    "END": "keyword.end",
    "ENDCASE": "keyword.case_end",
    "ENDCLASS": "keyword.class_end",
    "ENDFUNCTION": "keyword.function_end",
    "ENDIF": "keyword.if_end",
    "ENDPROCEDURE": "keyword.procedure_end",
    "ENDTYPE": "keyword.type_end",
    "ENDWHILE": "keyword.while_end",
    "FALSE": "boolean.false",
    "FOR": "keyword.for",
    "FUNCTION": "keyword.function",
    "GETRECORD": "keyword.get_record",
    "IF": "keyword.if",
    "INHERITS": "keyword.inherits",
    "INPUT": "keyword.input",
    "MOD": "operator.mod",
    "NEW": "keyword.new",
    "NEXT": "keyword.for_end",
    "NOT": "operator.not",
    "OF": "keyword.of",
    "OPENFILE": "keyword.open_file",
    "OR": "operator.or",
    "OTHERWISE": "keyword.otherwise",
    "OUTPUT": "keyword.output",
    "PRIVATE": "keyword.class_modifier.private",
    "PROCEDURE": "keyword.procedure",
    "PUBLIC": "keyword.class_modifier.public",
    "PUTRECORD": "keyword.put_record",
    "RANDOM": "keyword.file_mode.random",
    "READ": "keyword.file_mode.read",
    "READFILE": "keyword.read_file",
    "REPEAT": "keyword.dowhile",
    "RETURN": "keyword.return",
    "RETURNS": "keyword.returns",
    "SEEK": "keyword.seek",
    "SET": "keyword.set",
    "STEP": "keyword.step",
    "SUPER": "keyword.super",
    "THEN": "keyword.then",
    "TO": "keyword.to",
    "TRUE": "boolean.true",
    "TYPE": "keyword.type",
    "UNTIL": "keyword.dowhile_end",
    "WHILE": "keyword.while",
    "WRITE": "keyword.file_mode.write",
    "WRITEFILE": "keyword.write_file",
    "<-": "operator.assignment",
    ">=": "operator.greater_than_equal",
    "<=": "operator.less_than_equal",
    "<>": "operator.not_equal_to",
    "..": "operator.range",
    "=": "operator.equal_to",
    ">": "operator.greater_than",
    "<": "operator.less_than",
    "+": "operator.add",
    "-": "operator.minus",
    "*": "operator.multiply",
    "/": "operator.divide",
    "^": "operator.pointer",
    "&": "operator.string_concatenate",
    "(": "parentheses.open",
    ")": "parentheses.close",
    "[": "bracket.open",
    "]": "bracket.close",
    "{": "brace.open",
    "}": "brace.close",
    ":": "punctuation.colon",
    ";": "punctuation.semicolon",
    ",": "punctuation.comma",
    ".": "punctuation.period",
    "\n": "newline",
};
export const tokenTextMapping = Object.fromEntries(Object.entries(tokenNameTypeData).map(r => r.reverse()));
class SymbolizerIO {
    constructor(string, offset = 0) {
        this.string = string;
        this.offset = offset;
        this.lastMatched = null;
        this.lastMatchedRange = null;
        this.output = [];
    }
    inc(amount) {
        this.offset += amount;
    }
    at() {
        return this.string[this.offset];
    }
    cons(input) {
        if (input instanceof RegExp) {
            const matchData = input.exec(this.string.slice(this.offset));
            if (matchData == null || matchData.index != 0)
                return false;
            this.lastMatched = matchData[0];
            this.lastMatchedRange = [this.offset, this.offset + matchData[0].length];
            this.offset += matchData[0].length;
            return true;
        }
        else {
            if (this.string.slice(this.offset, this.offset + input.length) == input) {
                this.lastMatched = input;
                this.lastMatchedRange = [this.offset, this.offset + input.length];
                this.offset += input.length;
                return true;
            }
            else
                return false;
        }
    }
    has() {
        return this.string[this.offset] != undefined;
    }
    read() {
        this.lastMatchedRange ?? (this.lastMatchedRange = [this.offset, this.offset]);
        this.lastMatched ?? (this.lastMatched = "");
        this.lastMatchedRange[1]++;
        this.lastMatched += this.string[this.offset++];
        return this.string[this.offset - 1];
    }
    length() {
        return this.string.length;
    }
    writeText(type, text, range) {
        this.output.push(new Symbol(type, text, range));
    }
    write(type) {
        if (!this.lastMatched || !this.lastMatchedRange)
            crash(`Cannot write symbol, no stored match`);
        if (type == "punctuation.semicolon" && configs.syntax.semicolons_as_newlines.value)
            type = "newline";
        this.output.push(new Symbol(type, this.lastMatched, this.lastMatchedRange.slice()));
        this.lastMatched = this.lastMatchedRange = null;
    }
    isNumber() {
        if (!this.has())
            return false;
        const code = this.at().charCodeAt(0);
        return (code >= 48 && code <= 57);
    }
    isAlphanumeric() {
        if (!this.has())
            return false;
        const code = this.at().charCodeAt(0);
        return (code >= 48 && code <= 57) ||
            (code >= 65 && code <= 90) ||
            (code >= 97 && code <= 122) || code === 95;
    }
}
SymbolizerIO.prototype;
export function symbolize(input) {
    const str = new SymbolizerIO(input);
    toNextCharacter: while (str.has()) {
        for (const [identifier, symbolType] of symbolTypeData) {
            if (typeof identifier == "string" || identifier instanceof RegExp) {
                if (str.cons(identifier)) {
                    str.write(symbolType);
                    continue toNextCharacter;
                }
            }
            else {
                const func = SymbolizerIO.prototype[identifier[0]];
                if (func.call(str)) {
                    do {
                        str.read();
                    } while (func.call(str));
                    str.write(symbolType);
                    continue toNextCharacter;
                }
            }
        }
        crash(`The last symbol type should match everything`);
    }
    return {
        program: input,
        symbols: str.output
    };
}
export function tokenize(input) {
    const tokens = [];
    const state = {
        singlelineComment: null,
        multilineComment: null,
        singleQuotedString: null,
        doubleQuotedString: null,
        decimalNumber: "none",
    };
    let currentString = "";
    let symbol;
    for (symbol of input.symbols) {
        if (state.decimalNumber == "allowDecimal" && symbol.type !== "punctuation.period")
            state.decimalNumber = "none";
        if (state.singlelineComment) {
            if (symbol.type === "newline") {
                state.singlelineComment = null;
                symbol.type;
                tokens.push(symbol.toToken());
            }
        }
        else if (symbol.type === "comment.multiline.close") {
            if (state.multilineComment)
                state.multilineComment = null;
            else
                fail(`Cannot close multiline comment, no open multiline comment`, symbol);
        }
        else if (state.multilineComment) {
        }
        else if (state.singleQuotedString) {
            currentString += symbol.text;
            if (symbol.type === "quote.single") {
                state.singleQuotedString = null;
                const range = [symbol.range[1] - currentString.length, symbol.range[1]];
                if (unicodeSetsSupported()) {
                    if ((new RegExp(`^'\\p{RGI_Emoji_Flag_Sequence}'$`, "v")).test(currentString))
                        fail(`Character ${currentString} has an invalid length: expected one character\nhelp: Flags are actually two characters, use a string to hold both`, range);
                }
                if ([...currentString].length != 3) {
                    if (typeof Intl != "undefined") {
                        const chars = (new Intl.Segmenter()).segment(currentString.slice(1, -1));
                        if ([...chars].length == 1)
                            fail(`Character ${currentString} has an invalid length: expected one character\nhelp: although it looks like one character, it is actually ${[...currentString].length - 2} characters, use a string to hold them all`, range);
                    }
                    fail(`Character ${currentString} has an invalid length: expected one character`, range);
                }
                tokens.push(new Token("char", currentString, range));
                currentString = "";
            }
        }
        else if (state.doubleQuotedString) {
            currentString += symbol.text;
            if (symbol.type === "quote.double") {
                state.doubleQuotedString = null;
                tokens.push(new Token("string", currentString, [symbol.range[1] - currentString.length, symbol.range[1]]));
                currentString = "";
            }
        }
        else if (symbol.type === "comment.singleline")
            state.singlelineComment = symbol;
        else if (symbol.type === "comment.multiline.open")
            state.multilineComment = symbol;
        else if (state.decimalNumber == "requireNumber") {
            const num = tokens.at(-1);
            if (symbol.type == "numeric_fragment") {
                num.mergeFrom(symbol);
                if (isNaN(Number(num.text)))
                    crash(f.quote `Invalid parsed number ${symbol}`);
                state.decimalNumber = "none";
            }
            else
                fail(f.quote `Expected a number to follow ${num.text}, but found ${symbol.type}`, symbol);
        }
        else if (state.decimalNumber == "allowDecimal" && symbol.type == "punctuation.period") {
            state.decimalNumber = "requireNumber";
            tokens.at(-1).mergeFrom(symbol);
        }
        else if (symbol.type === "quote.single") {
            state.singleQuotedString = symbol;
            currentString += symbol.text;
        }
        else if (symbol.type === "quote.double") {
            state.doubleQuotedString = symbol;
            currentString += symbol.text;
        }
        else if (symbol.type === "space")
            void 0;
        else if (symbol.type === "unknown")
            fail(f.quote `Invalid character ${symbol}`, symbol);
        else if (symbol.type === "numeric_fragment") {
            state.decimalNumber = "allowDecimal";
            if (isNaN(Number(symbol.text)))
                crash(`Invalid parsed number ${symbol.text}`);
            tokens.push(new Token("number.decimal", symbol.text, symbol.range.slice()));
        }
        else if (symbol.type === "word") {
            write(access(tokenNameTypeData, symbol.text, "name"));
        }
        else if (symbol.type == "invalid.not_equal_to") {
            fail(f.quote `Invalid operator ${symbol}: the not_equal_to operator in pseudocode is "<>"`, symbol);
        }
        else {
            symbol.type;
            tokens.push(symbol.toToken());
        }
    }
    if (state.multilineComment)
        fail(`Unclosed multiline comment`, state.multilineComment);
    if (state.doubleQuotedString)
        fail(`Unclosed double-quoted string`, state.doubleQuotedString);
    if (state.singleQuotedString)
        fail(`Unclosed single-quoted string`, state.singleQuotedString);
    if (state.decimalNumber == "requireNumber")
        fail(`Expected a numeric fragment, but found end of input`, input.symbols.at(-1).rangeAfter());
    return {
        program: input.program,
        tokens: tokens.length > 0 ? new RangeArray(tokens) : new RangeArray(tokens, [0, Infinity])
    };
    function write(type) {
        tokens.push(new Token(type, symbol.text, symbol.range.slice()));
    }
}
