"use strict";
var VariableType;
(function (VariableType) {
    VariableType["INTEGER"] = "INTEGER";
    VariableType["REAL"] = "REAL";
    VariableType["STRING"] = "STRING";
    VariableType["CHAR"] = "CHAR";
    VariableType["BOOLEAN"] = "BOOLEAN";
    VariableType["DATE"] = "DATE";
})(VariableType || (VariableType = {}));
var FileMode;
(function (FileMode) {
    FileMode["READ"] = "READ";
    FileMode["WRITE"] = "WRITE";
    FileMode["APPEND"] = "APPEND";
})(FileMode || (FileMode = {}));
const tokens = {
    number: /\d/,
    text: /\w_-/,
    escape: /\\/,
};
/**If I had a nickel for every time I made a super long data object to store every command in someone else's programming language, I'd have two nickels. That's not a lot, but it's weird that it happened twice. */
const statements = {
    declare: {
        matcher: /DECLARE/,
        executor: (statement, context) => {
            return {
                ...context,
                variables: {
                    ...context.variables,
                }
            };
        }
    }
};
function executeLine(line, context) {
}
let firstRun = false;
