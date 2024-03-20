/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the lexer, which takes the raw user input and processes it;
first into a list of symbols, such as "operator.add" (+), "numeric_fragment" (123), or "quote.double" ("),
second into a list of tokens, such as "operator.add" (+), "number.decimal" (12.34), "keyword.readfile", or "string" ("amogus").
*/
import { Symbol, Token } from "./lexer-types.js";
import { crash, fail, impossible } from "./utils.js";
const symbolTypeData = [
    ["MOD", "operator.mod"],
    ["AND", "operator.and"],
    ["OR", "operator.or"],
    ["NOT", "operator.not"],
    ["DIV", "operator.integer_divide"],
    ["<-", "operator.assignment"],
    [">=", "operator.greater_than_equal"],
    ["<=", "operator.less_than_equal"],
    ["<>", "operator.not_equal_to"],
    ["//", "comment.singleline"],
    ["/*", "comment.multiline_open"],
    ["*/", "comment.multiline_close"],
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
/** Util class for the symbolizer. Makes it easier to process a string. */
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
        let code = this.at().charCodeAt(0);
        return (code >= 48 && code <= 57);
    }
    isAlphanumeric() {
        if (!this.has())
            return false;
        let code = this.at().charCodeAt(0);
        //0-9, a-z, A-Z, _
        return (code >= 48 && code <= 57) ||
            (code >= 65 && code <= 90) ||
            (code >= 97 && code <= 122) || code === 95;
    }
}
SymbolizerIO.prototype;
/** Converts an input string to a list of symbols. */
export function symbolize(input) {
    const str = new SymbolizerIO(input);
    toNextCharacter: while (str.has()) {
        //TODO optimize nested loop
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
/** Converts a list of symbols into a list of tokens. */
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
            state.decimalNumber = "none"; //Cursed state reset
        //State checks and comments
        if (state.sComment) {
            if (symbol.type === "newline") {
                state.sComment = null;
                symbol.type;
                tokens.push(symbol.toToken());
            }
        }
        else if (symbol.type === "comment.multiline_close") {
            if (state.mComment)
                state.mComment = null;
            else
                fail(`Cannot close multiline comment, no open multiline comment`, symbol);
        }
        else if (state.mComment) {
            //discard the symbol
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
        else if (symbol.type === "comment.multiline_open")
            state.mComment = symbol;
        //Decimals
        else if (state.decimalNumber == "requireNumber") {
            const num = tokens.at(-1) ?? crash(`impossible`);
            if (symbol.type == "numeric_fragment") {
                //very cursed modifying of the token
                num.text += "." + symbol.text;
                num.range[1] += (1 + symbol.text.length);
                if (isNaN(Number(num.text)))
                    crash(`Invalid parsed number ${symbol.text}`);
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
            fail(`Invalid symbol ${symbol.text}`, symbol);
        else if (symbol.type === "punctuation.period")
            fail(`Invalid symbol ${symbol.text}, periods are only allowed within numbers`, symbol);
        else if (symbol.type === "numeric_fragment") {
            state.decimalNumber = "allowDecimal";
            if (isNaN(Number(symbol.text)))
                crash(`Invalid parsed number ${symbol.text}`);
            tokens.push(new Token("number.decimal", symbol.text, symbol.range.slice()));
        }
        else if (symbol.type === "word") {
            switch (symbol.text) { //TODO datastructify
                case "TRUE":
                    write("boolean.true");
                    break;
                case "FALSE":
                    write("boolean.false");
                    break;
                case "DECLARE":
                    write("keyword.declare");
                    break;
                case "CONSTANT":
                    write("keyword.constant");
                    break;
                case "OUTPUT":
                    write("keyword.output");
                    break;
                case "INPUT":
                    write("keyword.input");
                    break;
                case "CALL":
                    write("keyword.call");
                    break;
                case "IF":
                    write("keyword.if");
                    break;
                case "THEN":
                    write("keyword.then");
                    break;
                case "ELSE":
                    write("keyword.else");
                    break;
                case "ENDIF":
                    write("keyword.if_end");
                    break;
                case "FOR":
                    write("keyword.for");
                    break;
                case "TO":
                    write("keyword.to");
                    break;
                case "NEXT":
                    write("keyword.for_end");
                    break;
                case "WHILE":
                    write("keyword.while");
                    break;
                case "ENDWHILE":
                    write("keyword.while_end");
                    break;
                case "REPEAT":
                    write("keyword.dowhile");
                    break;
                case "UNTIL":
                    write("keyword.dowhile_end");
                    break;
                case "FUNCTION":
                    write("keyword.function");
                    break;
                case "BYREF":
                    write("keyword.by-reference");
                    break;
                case "BYVAL":
                    write("keyword.by-value");
                    break;
                case "ENDFUNCTION":
                    write("keyword.function_end");
                    break;
                case "PROCEDURE":
                    write("keyword.procedure");
                    break;
                case "ENDPROCEDURE":
                    write("keyword.procedure_end");
                    break;
                case "RETURN":
                    write("keyword.return");
                    break;
                case "RETURNS":
                    write("keyword.returns");
                    break;
                case "OPENFILE":
                    write("keyword.openfile");
                    break;
                case "READFILE":
                    write("keyword.readfile");
                    break;
                case "WRITEFILE":
                    write("keyword.writefile");
                    break;
                case "CASE":
                    write("keyword.case");
                    break;
                case "OF":
                    write("keyword.of");
                    break;
                case "ENDCASE":
                    write("keyword.case_end");
                    break;
                case "OTHERWISE":
                    write("keyword.otherwise");
                    break;
                case "ARRAY":
                    write("keyword.array");
                    break;
                default:
                    tokens.push(new Token("name", symbol.text, symbol.range.slice()));
                    break;
            }
        }
        else {
            symbol.type;
            tokens.push(symbol.toToken());
        }
    }
    //Ending state checks
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
