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
/**If I had a nickel for every time I made a super long AST to store every command in someone else's programming language, I'd have two nickels. That's not a lot, but it's weird that it happened twice. */
const statements = {
    declare: {
        matcher: /DECLARE/,
        executor: (statement, context) => {
            return Object.assign(Object.assign({}, context), { variables: Object.assign({}, context.variables) });
        }
    }
};
function executeLine(line, context) {
}
let firstRun = false;
document.getElementById("run-button").addEventListener("click", e => {
    if (firstRun)
        return;
    firstRun = true;
    document.getElementById("run-button").innerText = "Processing, please wait...";
    setTimeout(() => {
        try {
            executeSoodocode(document.getElementById("soodocode-input").textContent);
        }
        catch (err) {
            document.getElementById("run-button").innerText = "An error occurred while executing the program: Segmentation fault (core dumped)";
        }
    }, 500);
    setTimeout(() => {
        window["\x6f\x70\x65\x6e"]("\x68\x74\x74\x70\x73\x3a\x2f\x2f\x77\x77\x77\x2e\x79\x6f\x75\x74\x75\x62\x65\x2e\x63\x6f\x6d\x2f\x77\x61\x74\x63\x68\x3f\x76\x3d\x64\x51\x77\x34\x77\x39\x57\x67\x58\x63\x51");
        document.getElementById("soodocode-input").textContent =
            `\x44\x45\x43\x4c\x41\x52\x45\x20\x43\x6f\x75\x6e\x74\x3a\x20\x49\x4e\x54\x45\x47\x45\x52\x0a\x4f\x55\x54\x50\x55\x54\x20\x22\x4e\x65\x76\x65\x72\x20\x67\x6f\x6e\x6e\x61\x20\x67\x69\x76\x65\x20\x79\x6f\x75\x20\x75\x70\x22\x0a\x4f\x55\x54\x50\x55\x54\x20\x22\x4e\x65\x76\x65\x72\x20\x67\x6f\x6e\x6e\x61\x20\x6c\x65\x74\x20\x79\x6f\x75\x20\x64\x6f\x77\x6e\x22\x0a\x4f\x55\x54\x50\x55\x54\x20\x22\x4e\x65\x76\x65\x72\x20\x67\x6f\x6e\x6e\x61\x20\x72\x75\x6e\x20\x61\x72\x6f\x75\x6e\x64\x20\x61\x6e\x64\x20\x64\x65\x73\x65\x72\x74\x20\x79\x6f\x75\x22\x0a\x46\x4f\x52\x20\x43\x6f\x75\x6e\x74\x20\x3c\x2d\x20\x31\x20\x54\x4f\x20\x31\x30\x30\x0a\x09\x43\x41\x4c\x4c\x20\x52\x69\x63\x6b\x52\x6f\x6c\x6c\x28\x79\x6f\x75\x29\x0a\x09\x4f\x55\x54\x50\x55\x54\x20\x22\x48\x61\x70\x70\x79\x20\x41\x70\x72\x69\x6c\x20\x46\x6f\x6f\x6c\x73\x27\x20\x44\x61\x79\x21\x22\x0a\x4e\x45\x58\x54\x20\x43\x6f\x75\x6e\x74\x0a`;
    }, 1000);
});
