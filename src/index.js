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
function executeSoodocode() {
}
document.getElementById("run-button").addEventListener("click", e => {
    document.getElementById("run-button").innerText = "Processing, please wait...";
    const iframe = document.createElement("iframe");
    iframe.id = "rickroll-frame";
    iframe.width = "560px";
    iframe.height = "315px";
    iframe.src = "https://www.youtube.com/embed/dQw4w9WgXcQ?controls=0";
    iframe.frameBorder = "0";
    iframe.allow = "autoplay";
    iframe.allowFullscreen = true;
    iframe.classList.add("behind");
    setTimeout(() => {
        var _a;
        (_a = document.getElementById("input-wrapper")) === null || _a === void 0 ? void 0 : _a.appendChild(iframe);
    }, 2500);
    setTimeout(() => {
        var _a;
        iframe.classList.remove("behind");
        (_a = document.getElementById("soodocode-input")) === null || _a === void 0 ? void 0 : _a.remove();
        document.getElementById("run-button").innerText = "An error occurred while executing the program.";
    }, 3000);
});
