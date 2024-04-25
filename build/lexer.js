import { Symbol, Token } from "./lexer-types.js";
import { crash, f, fail, impossible } from "./utils.js";
export const symbolTypeData = [
    [/<-{1,2}/, "operator.assignment"],
    [">=", "operator.greater_than_equal"],
    ["<=", "operator.less_than_equal"],
    ["<>", "operator.not_equal_to"],
    ["//", "comment.singleline"],
    ["/*", "comment.multiline.open"],
    ["*/", "comment.multiline.close"],
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
    ["\n", "newline"],
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
        impossible();
    }
    return {
        program: input,
        symbols: str.output
    };
}
export function tokenize(input) {
    const tokens = [];
    const state = {
        sComment: null,
        mComment: null,
        sString: null,
        dString: null,
        decimalNumber: "none",
    };
    let currentString = "";
    let symbol;
    for (symbol of input.symbols) {
        if (state.decimalNumber == "allowDecimal" && symbol.type !== "punctuation.period")
            state.decimalNumber = "none";
        if (state.sComment) {
            if (symbol.type === "newline") {
                state.sComment = null;
                symbol.type;
                tokens.push(symbol.toToken());
            }
        }
        else if (symbol.type === "comment.multiline.close") {
            if (state.mComment)
                state.mComment = null;
            else
                fail(`Cannot close multiline comment, no open multiline comment`, symbol);
        }
        else if (state.mComment) {
        }
        else if (state.sString) {
            currentString += symbol.text;
            if (symbol.type === "quote.single") {
                state.sString = null;
                if (currentString.length != 3)
                    fail(`Character ${currentString} has an invalid length: expected one character`, [symbol.range[1] - currentString.length, symbol.range[1]]);
                tokens.push(new Token("char", currentString, [symbol.range[1] - 3, symbol.range[1]]));
                currentString = "";
            }
        }
        else if (state.dString) {
            currentString += symbol.text;
            if (symbol.type === "quote.double") {
                state.dString = null;
                tokens.push(new Token("string", currentString, [symbol.range[1] - currentString.length, symbol.range[1]]));
                currentString = "";
            }
        }
        else if (symbol.type === "comment.singleline")
            state.sComment = symbol;
        else if (symbol.type === "comment.multiline.open")
            state.mComment = symbol;
        else if (state.decimalNumber == "requireNumber") {
            const num = tokens.at(-1) ?? impossible();
            if (symbol.type == "numeric_fragment") {
                num.text += "." + symbol.text;
                num.range[1] += (1 + symbol.text.length);
                if (isNaN(Number(num.text)))
                    crash(f.quote `Invalid parsed number ${symbol}`);
                state.decimalNumber = "none";
            }
            else
                fail(`Expected a number to follow "${num.text}.", but found ${symbol.type}`, symbol);
        }
        else if (state.decimalNumber == "allowDecimal" && symbol.type == "punctuation.period") {
            state.decimalNumber = "requireNumber";
        }
        else if (symbol.type === "quote.single") {
            state.sString = symbol;
            currentString += symbol.text;
        }
        else if (symbol.type === "quote.double") {
            state.dString = symbol;
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
            write(tokenNameTypeData[symbol.text] ?? "name");
        }
        else {
            symbol.type;
            tokens.push(symbol.toToken());
        }
    }
    if (state.mComment)
        fail(`Unclosed multiline comment`, state.mComment);
    if (state.dString)
        fail(`Unclosed double-quoted string`, state.dString);
    if (state.sString)
        fail(`Unclosed single-quoted string`, state.sString);
    if (state.decimalNumber == "requireNumber")
        fail(`Expected a numeric fragment, but found end of input`, input.symbols.at(-1).rangeAfter());
    return {
        program: input.program,
        tokens
    };
    function write(type) {
        tokens.push(new Token(type, symbol.text, symbol.range.slice()));
    }
}
