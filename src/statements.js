var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
import { parseFunctionArguments } from "./parser.js";
import { displayExpression } from "./ui.js";
export const statements = {
    startKeyword: {},
    byType: {},
    irregular: [],
};
export class Statement {
    constructor(tokens) {
        this.tokens = tokens;
        this.type = this.constructor;
        this.stype = this.type.type;
        this.category = this.type.category;
    }
    toString() {
        return this.tokens.map(t => displayExpression(t, false)).join(" ");
    }
    blockEndStatement() {
        if (this.category != "block")
            throw new Error(`Statement ${this.stype} has no block end statement because it is not a block statement`);
        return statements.byType[this.stype + ".end"]; //REFACTOR CHECK
    }
    example() {
        return this.type.example;
    }
}
Statement.tokens = null;
function statement(type, example, ...args) {
    return function (input) {
        input.type = type;
        input.example = example;
        if (args[0] == "block" || args[0] == "block_end") {
            input.category = args[0];
            args.shift();
        }
        else {
            input.category = "normal";
        }
        if (args[0] == "auto" && input.category == "block") {
            args.shift();
            statement(type + ".end", "block_end", args[0] + "_end")(//REFACTOR CHECK
            class __endStatement extends Statement {
            });
        }
        if (args.length < 1)
            throw new Error(`All statements must contain at least one token`);
        if (args[0] == "#") {
            statements.irregular.push(input);
        }
        else {
            const firstToken = args[0];
            if (statements.startKeyword[firstToken])
                throw new Error(`Statement starting with ${firstToken} already registered`); //TODO overloads, eg FOR STEP
            statements.startKeyword[firstToken] = input;
        }
        if (statements.byType[type])
            throw new Error(`Statement for type ${type} already registered`);
        statements.byType[type] = input;
        input.tokens = args;
        return input;
    };
}
function makeStatement(type, example, ...args) {
    return statement(type, example, ...args)(class __temp extends Statement {
    });
}
makeStatement("declaration", "DECLARE variable: TYPE", "keyword.declare", "name", "punctuation.colon", "name");
makeStatement("assignment", "x <- 5", "#", "name", "operator.assignment", "expr+");
makeStatement("output", `OUTPUT "message"`, "keyword.output", ".+");
makeStatement("input", "INPUT y", "keyword.input", "name");
makeStatement("return", "RETURN z + 5", "keyword.return", "expr+");
makeStatement("if", "IF a < 5 THEN", "block", "auto", "keyword.if", "expr+", "keyword.then");
makeStatement("for", "FOR b <- 1 TO 10", "block", "auto", "keyword.for", "name", "operator.assignment", "number.decimal", "keyword.to", "number.decimal"); //TODO fix endfor: should be `NEXT i`, not `NEXT` //TODO "number": accept names also
makeStatement("while", "WHILE c < 20", "block", "auto", "keyword.while", "expr+");
makeStatement("dowhile", "REPEAT", "block", "auto", "keyword.dowhile");
let FunctionStatement = (() => {
    let _classDecorators = [statement("function", "FUNCTION name(arg1: TYPE) RETURNS INTEGER", "block", "auto", "keyword.function", "name", "parentheses.open", ".*", "parentheses.close", "keyword.returns", "name")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var FunctionStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            const args = parseFunctionArguments(tokens, 3, tokens.length - 4);
            if (typeof args == "string")
                throw new Error(`Invalid function arguments: ${args}`);
            this.args = args;
            this.returnType = tokens.at(-1).text.toUpperCase();
        }
    };
    __setFunctionName(_classThis, "FunctionStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FunctionStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return FunctionStatement = _classThis;
})();
export { FunctionStatement };
let ProcedureStatement = (() => {
    let _classDecorators = [statement("procedure", "PROCEDURE name(arg1: TYPE)", "block", "auto", "keyword.procedure", "name", "parentheses.open", ".*", "parentheses.close")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var ProcedureStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            const args = parseFunctionArguments(tokens, 3, tokens.length - 2);
            if (typeof args == "string")
                throw new Error(`Invalid function arguments: ${args}`);
            this.args = args;
        }
    };
    __setFunctionName(_classThis, "ProcedureStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ProcedureStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ProcedureStatement = _classThis;
})();
export { ProcedureStatement };
