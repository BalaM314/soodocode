"use strict";
class OffsetString {
    constructor(string, offset = 0) {
        this.string = string;
        this.offset = offset;
    }
    inc(amount) {
        this.offset += amount;
    }
    at() {
        return this.string[this.offset];
    }
    has() {
        return this.string[this.offset] != undefined;
    }
    read() {
        return this.string[this.offset++];
    }
    length() {
        return this.string.length;
    }
}
function isNumber(char) {
    if (char == undefined)
        return false;
    let code = char.charCodeAt(0);
    return (code >= 48 && code <= 57);
}
function isAlphanumeric(char) {
    if (char == undefined)
        return false;
    let code = char.charCodeAt(0);
    return (code >= 48 && code <= 57) ||
        (code >= 65 && code <= 90) ||
        (code >= 97 && code <= 122);
}
const FirstTokenizer = {
    numbers: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    parse(input) {
        const output = [];
        const str = new OffsetString(input);
        while (str.has()) {
            switch (str.at()) {
                case "+":
                    writeChar(["operator", "add"]);
                    break;
                case "-":
                    writeChar(["operator", "subtract"]);
                    break;
                case "*":
                    writeChar(["operator", "multiply"]);
                    break;
                case "/":
                    writeChar(["operator", "divide"]);
                    break;
                case "(":
                    writeChar(["parentheses", "open"]);
                    break;
                case ")":
                    writeChar(["parentheses", "close"]);
                    break;
                case "{":
                    writeChar(["brace", "open"]);
                    break;
                case "}":
                    writeChar(["brace", "close"]);
                    break;
                case `'`:
                    writeChar(["quote", "single"]);
                    break;
                case `"`:
                    writeChar(["quote", "double"]);
                    break;
                case " ":
                    writeChar(["space"]);
                    break;
                case "\n":
                    writeChar(["newline"]);
                    break;
                default:
                    if (isNumber(str.at()))
                        readNumber(str);
                    else if (isAlphanumeric(str.at())) {
                        readWord(str);
                    }
                    else
                        throw new Error(`Invalid character "${str.at()}"`);
            }
        }
        return output;
        function write(type, text) {
            output.push({ type, text });
        }
        function writeChar(type) {
            output.push({ type, text: str.read() });
        }
        function readNumber(input) {
            let number = "";
            while (isNumber(input.at())) {
                number += input.read();
            }
            if (number.length > 0)
                write(["number", "decimal"], number);
            return number.length > 0;
        }
        function readWord(input) {
            let word = "";
            while (isAlphanumeric(input.at())) {
                word += input.read();
            }
            if (word.length > 0)
                write(["word"], word);
            return word.length > 0;
        }
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
