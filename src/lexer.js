"use strict";
class TokenizerInput {
    constructor(string, offset = 0) {
        this.string = string;
        this.offset = offset;
        this.lastMatched = "";
        this.output = [];
    }
    inc(amount) {
        this.offset += amount;
    }
    at() {
        return this.lastMatched = this.string[this.offset];
    }
    cons(input) {
        if (input.split("").every((v, i) => this.string[this.offset + i] == v)) {
            this.lastMatched = input;
            this.offset += input.length;
            return true;
        }
        else
            return false;
    }
    has() {
        return this.string[this.offset] != undefined;
    }
    read() {
        return this.lastMatched = this.string[this.offset++];
    }
    length() {
        return this.string.length;
    }
    writeText(type, text) {
        this.output.push({ type, text });
    }
    write(type) {
        this.output.push({ type, text: this.lastMatched });
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
        return (code >= 48 && code <= 57) ||
            (code >= 65 && code <= 90) ||
            (code >= 97 && code <= 122);
    }
}
const FirstTokenizer = {
    numbers: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    parse(input) {
        const str = new TokenizerInput(input);
        //if(...MOD) ["operator", "mod"]
        while (str.has()) {
            if (false)
                0;
            else if (str.cons("MOD"))
                str.write(["operator", "mod"]);
            else if (str.cons("AND"))
                str.write(["operator", "and"]);
            else if (str.cons("OR"))
                str.write(["operator", "or"]);
            else if (str.cons("NOT"))
                str.write(["operator", "not"]);
            else if (str.cons("DIV"))
                str.write(["operator", "integer_divide"]);
            else if (str.cons("<-"))
                str.write(["operator", "assignment"]);
            else if (str.cons(">="))
                str.write(["operator", "greater_than_equal"]);
            else if (str.cons("<="))
                str.write(["operator", "less_than_equal"]);
            else if (str.cons("<>"))
                str.write(["operator", "not_equal_to"]);
            else if (str.cons("="))
                str.write(["operator", "equal_to"]);
            else if (str.cons(">"))
                str.write(["operator", "greater_than"]);
            else if (str.cons("<"))
                str.write(["operator", "less_than"]);
            else if (str.cons("-"))
                str.write(["operator", "subtract"]);
            else if (str.cons("+"))
                str.write(["operator", "add"]);
            else if (str.cons("-"))
                str.write(["operator", "subtract"]);
            else if (str.cons("*"))
                str.write(["operator", "multiply"]);
            else if (str.cons("/"))
                str.write(["operator", "divide"]);
            else if (str.cons("("))
                str.write(["parentheses", "open"]);
            else if (str.cons(")"))
                str.write(["parentheses", "close"]);
            else if (str.cons("{"))
                str.write(["brace", "open"]);
            else if (str.cons("}"))
                str.write(["brace", "close"]);
            else if (str.cons(`'`))
                str.write(["quote", "single"]);
            else if (str.cons(`"`))
                str.write(["quote", "double"]);
            else if (str.cons(" "))
                str.write(["space"]);
            else if (str.cons("\n"))
                str.write(["newline"]);
            else if (str.isNumber()) {
                let number = "";
                do {
                    number += str.read();
                } while (str.isNumber());
                str.writeText(["number", "decimal"], number);
            }
            else if (str.isAlphanumeric()) {
                let word = "";
                do {
                    word += str.read();
                } while (str.isAlphanumeric());
                str.writeText(["word"], word);
            }
            else
                throw new Error(`Invalid character "${str.at()}"`);
        }
        return str.output;
    }
};
function debugParse(input) {
    console.log(`Parsing input "${input}"`);
    try {
        console.log(FirstTokenizer.parse(input));
    }
    catch (err) {
        console.log(`Error: ${err.message}`);
    }
}
debugParse("x <- 5");
