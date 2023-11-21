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
function executeLine(line, context) {
}
let firstRun = false;
