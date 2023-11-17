class SymbolizerIO {
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
        if (input instanceof RegExp) {
            const matchData = input.exec(this.string.slice(this.offset));
            if (matchData == null || matchData.index != 0)
                return false;
            this.lastMatched = matchData[0];
            this.offset += matchData[0].length;
            return true;
        }
        else {
            if (input.split("").every((v, i) => this.string[this.offset + i] == v)) {
                this.lastMatched = input;
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
export function symbolize(input) {
    const str = new SymbolizerIO(input);
    toNextCharacter: while (str.has()) {
        for (const [identifier, symbolType] of symbolTypes) {
            if (typeof identifier == "string" || identifier instanceof RegExp) {
                if (str.cons(identifier)) {
                    str.write(symbolType);
                    continue toNextCharacter;
                }
            }
            else if (identifier.call(str)) {
                let buffer = "";
                do {
                    buffer += str.read();
                } while (identifier.call(str));
                str.writeText(symbolType, buffer);
                continue toNextCharacter;
            }
        }
        throw new Error(`Invalid character "${str.at()}"`);
    }
    return str.output;
}
const symbolTypes = [
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
    ["-", "operator.subtract"],
    ["+", "operator.add"],
    ["-", "operator.subtract"],
    ["*", "operator.multiply"],
    ["/", "operator.divide"],
    ["^", "operator.pointer"],
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
    [" ", "space"],
    ["\t", "space"],
    ["\n", "newline"],
    [SymbolizerIO.prototype.isNumber, "number.decimal"],
    [SymbolizerIO.prototype.isAlphanumeric, "word"],
    [/^./, "unknown"],
];
export function tokenize(input) {
    const output = [];
    const state = {
        sComment: false,
        mComment: false,
        sString: false,
        dString: false,
    };
    let currentString = "";
    for (var symbol of input) {
        if (state.sComment) {
            if (symbol.type === "newline") {
                state.sComment = false;
                output.push(symbol);
            }
        }
        else if (state.mComment) {
            if (symbol.type === "comment.multiline_close")
                state.mComment = false;
        }
        else if (state.sString) {
            currentString += symbol.text;
            if (symbol.type === "quote.single") {
                state.sString = false;
                output.push({ text: currentString, type: "string" });
                currentString = "";
            }
        }
        else if (state.dString) {
            currentString += symbol.text;
            if (symbol.type === "quote.double") {
                state.dString = false;
                output.push({ text: currentString, type: "string" });
                currentString = "";
            }
        }
        else if (symbol.type === "comment.singleline")
            state.sComment = true;
        else if (symbol.type === "comment.multiline_open")
            state.mComment = true;
        else if (symbol.type === "quote.single") {
            state.sString = true;
            currentString += symbol.text;
        }
        else if (symbol.type === "quote.double") {
            state.dString = true;
            currentString += symbol.text;
        }
        else if (symbol.type === "space")
            void 0;
        else if (symbol.type === "unknown")
            throw new Error(`Invalid symbol ${symbol.text}`);
        else if (symbol.type === "word") {
            switch (symbol.text) {
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
                case "IF":
                    write("keyword.if");
                    break;
                case "THEN":
                    write("keyword.then");
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
                default:
                    output.push({ type: "name", text: symbol.text });
                    break;
            }
        }
        else
            output.push(symbol);
    }
    return output;
    function write(type) {
        output.push({ type, text: symbol.text });
    }
}
export function debugParse(input) {
    console.log(`Parsing input: ${input}`);
    try {
        const symbols = symbolize(input);
        console.log(symbols.map(t => `\t${`"${t.text}"`.padEnd(20, " ")}${t.type}`).join("\n"));
        console.log("----");
        const tokens = tokenize(symbols);
        console.log(tokens.map(t => `\t${`"${t.text}"`.padEnd(20, " ")}${t.type}`).join("\n"));
    }
    catch (err) {
        console.log(`Error: ${err.message}`);
    }
}
export function getText(tokens) {
    return tokens.map(t => t.text).join(" ");
}
// const procedureCode = `\
// PROCEDURE OutputRange()
// DECLARE First, Last, Count, Index, ThisErr : INTEGER
// DECLARE ThisMess : STRING
// DECLARE PastLast: BOOLEAN
// Count <- 0
// Index <- 1
// PastLast <- FALSE
// OUTPUT "Please input first error number: "
// INPUT First
// OUTPUT "Please input last error number: "
// INPUT Last
// OUTPUT "List of error numbers from ", First, " to ",
// Last
// WHILE Index < 501 AND NOT PastLast
// ThisErr <- ErrCode[Index]
// IF ThisErr > Last THEN
// PastLast <- TRUE
// ELSE
// IF ThisErr >= First THEN
// ThisMess <- ErrText[Index]
// IF ThisMess = "" THEN
// ThisMess <- "Error Text Missing"
// ENDIF
// OUTPUT ThisErr, " : ", ThisMess
// Count <- Count + 1
// ENDIF
// ENDIF
// Index <- Index + 1
// ENDWHILE
// OUTPUT Count, " error numbers output"
// ENDPROCEDURE`
// ;
const procedureCode = `\
WHILE Index < 501 AND "sussy PROCEDURE"
OUTPUT "sussy ", index
ENDWHILE`;
try {
    if (process.argv.slice(2).includes("--debug"))
        procedureCode.split("\n").forEach(line => debugParse(line));
}
catch (err) { }
