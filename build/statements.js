/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the definitions for every statement type supported by Soodocode.
*/
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
import { builtinFunctions } from "./builtin_functions.js";
import { Token } from "./lexer-types.js";
import { ExpressionASTFunctionCallNode } from "./parser-types.js";
import { expressionLeafNodeTypes, isLiteral, parseExpression, parseFunctionArguments, processTypeData } from "./parser.js";
import { EnumeratedVariableType, PointerVariableType, PrimitiveVariableType, RecordVariableType, Runtime, SetVariableType } from "./runtime.js";
import { crash, fail, fquote, getTotalRange, getUniqueNamesFromCommaSeparatedTokenList, splitTokensOnComma, } from "./utils.js";
export const statements = {
    byStartKeyword: {},
    byType: {},
    irregular: [],
};
export class Statement {
    constructor(tokens) {
        this.tokens = tokens;
        this.type = this.constructor;
        this.stype = this.type.type;
        this.category = this.type.category;
        this.range = getTotalRange(tokens);
    }
    toString() {
        return this.tokens.map(t => t.toString()).join(" ");
    }
    getText() {
        return this.tokens.map(t => t.getText()).join(" ");
    }
    static blockEndStatement() {
        if (this.category != "block")
            crash(`Statement ${this.type} has no block end statement because it is not a block statement`);
        return statements.byType[this.type.split(".")[0] + ".end"]; //REFACTOR CHECK
    }
    example() {
        return this.type.example;
    }
    /** Warning: block will not include the usual end statement. */
    static supportsSplit(block, statement) {
        return fquote `current block of type ${block.type} cannot be split by ${statement.toString()}`;
    }
    static checkBlock(block) {
        //crash if the block is invalid or incomplete
    }
    run(runtime) {
        crash(`Missing runtime implementation for statement ${this.stype}`);
    }
    runBlock(runtime, node) {
        if (this.category == "block")
            crash(`Missing runtime implementation for block statement ${this.stype}`);
        else
            crash(`Cannot run statement ${this.stype} as a block, because it is not a block statement`);
    }
}
Statement.category = null; //Assigned in the decorator
Statement.example = null; //Assigned in the decorator
Statement.tokens = null; //Assigned in the decorator
Statement.suppressErrors = false;
function statement(type, example, ...args) {
    return function (input) {
        var _a;
        input.type = type;
        input.example = example;
        if (args[0] == "block" || args[0] == "block_end" || args[0] == "block_multi_split") {
            input.category = args[0];
            args.shift();
        }
        else {
            input.category = "normal";
        }
        if (args[0] == "auto" && input.category == "block") {
            args.shift();
            statement(type + ".end", "[unknown]", "block_end", args[0] + "_end")(//REFACTOR CHECK //TODO very bad, caused bugs
            class __endStatement extends Statement {
            });
        }
        //validate args
        if (args.length < 1)
            crash(`Invalid statement definitions! All statements must contain at least one token`);
        if (args.find((v, i, args) => (v == "expr+" || v == ".+" || v == ".*") &&
            (args[i + 1] == "expr+" || args[i + 1] == ".+" || args[i + 1] == ".*" || args[i + 1] == "type+")))
            crash(`Invalid statement definitions! Variadic fragment specifiers cannot be adjacent.`);
        if (args[0] == "#") {
            statements.irregular.push(input);
        }
        else {
            const firstToken = args[0];
            ((_a = statements.byStartKeyword)[firstToken] ?? (_a[firstToken] = [])).push(input);
        }
        if (statements.byType[type])
            crash(`Invalid statement definitions! Statement for type ${type} already registered`);
        statements.byType[type] = input;
        input.tokens = args;
        return input;
    };
}
let DeclareStatement = (() => {
    let _classDecorators = [statement("declare", "DECLARE variable: TYPE", "keyword.declare", ".+", "punctuation.colon", "type+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var DeclareStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.variables = [];
            //parse the variable list
            this.variables = getUniqueNamesFromCommaSeparatedTokenList(tokens.slice(1, -2), tokens.at(-2)).map(t => t.text);
            this.varType = processTypeData(tokens.at(-1));
        }
        run(runtime) {
            const varType = runtime.resolveVariableType(this.varType);
            for (const variable of this.variables) {
                if (runtime.getVariable(variable))
                    fail(`Variable ${variable} was already declared`);
                runtime.getCurrentScope().variables[variable] = {
                    type: varType,
                    value: typeof varType == "string" ? null : varType.getInitValue(runtime),
                    declaration: this,
                    mutable: true,
                };
            }
        }
    };
    __setFunctionName(_classThis, "DeclareStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        DeclareStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return DeclareStatement = _classThis;
})();
export { DeclareStatement };
let ConstantStatement = (() => {
    let _classDecorators = [statement("constant", "CONSTANT x = 1.5", "keyword.constant", "name", "operator.equal_to", "literal")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var ConstantStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            let [constant, name, equals, expr] = tokens;
            this.name = name.text;
            this.expr = expr;
        }
        run(runtime) {
            if (runtime.getVariable(this.name))
                fail(`Constant ${this.name} was already declared`);
            const [type, value] = Runtime.evaluateToken(this.expr);
            runtime.getCurrentScope().variables[this.name] = {
                type,
                get value() { return value; },
                set value(value) { crash(`Attempted assignment to constant`); },
                declaration: this,
                mutable: false,
            };
        }
    };
    __setFunctionName(_classThis, "ConstantStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ConstantStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ConstantStatement = _classThis;
})();
export { ConstantStatement };
let DefineStatement = (() => {
    let _classDecorators = [statement("define", "DEFINE PrimesBelow20 (2, 3, 5, 7, 11, 13, 17, 19): myIntegerSet", "keyword.define", "name", "parentheses.open", ".+", "parentheses.close", "punctuation.colon", "name")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var DefineStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.name = tokens[1];
            this.variableType = tokens.at(-1);
            this.values = getUniqueNamesFromCommaSeparatedTokenList(tokens.slice(3, -3), tokens.at(-3), expressionLeafNodeTypes);
        }
        run(runtime) {
            const type = runtime.getType(this.variableType.text) ?? fail(`Nonexistent variable type ${this.variableType.text}`, this.variableType);
            if (!(type instanceof SetVariableType))
                fail(`DEFINE can only be used on set types, please use a declare statement instead`, this.variableType);
            runtime.getCurrentScope().variables[this.name.text] = {
                type,
                declaration: this,
                mutable: true,
                value: this.values.map(t => Runtime.evaluateToken(t, type.baseType)[1])
            };
        }
    };
    __setFunctionName(_classThis, "DefineStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        DefineStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return DefineStatement = _classThis;
})();
export { DefineStatement };
let TypePointerStatement = (() => {
    let _classDecorators = [statement("type.pointer", "TYPE IntPointer = ^INTEGER", "keyword.type", "name", "operator.equal_to", "operator.pointer", "type+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var TypePointerStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            let targetType;
            [, { text: this.name }, , , targetType] = tokens;
            this.targetType = processTypeData(targetType);
        }
        run(runtime) {
            runtime.getCurrentScope().types[this.name] = new PointerVariableType(this.name, runtime.resolveVariableType(this.targetType));
        }
    };
    __setFunctionName(_classThis, "TypePointerStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TypePointerStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TypePointerStatement = _classThis;
})();
export { TypePointerStatement };
let TypeEnumStatement = (() => {
    let _classDecorators = [statement("type.enum", "TYPE Weekend = (Sunday, Saturday)", "keyword.type", "name", "operator.equal_to", "parentheses.open", ".+", "parentheses.close")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var TypeEnumStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.name = tokens[1];
            this.values = getUniqueNamesFromCommaSeparatedTokenList(tokens.slice(4, -1), tokens.at(-1));
        }
        run(runtime) {
            runtime.getCurrentScope().types[this.name.text] = new EnumeratedVariableType(this.name.text, this.values.map(t => t.text));
        }
    };
    __setFunctionName(_classThis, "TypeEnumStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TypeEnumStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TypeEnumStatement = _classThis;
})();
export { TypeEnumStatement };
let TypeSetStatement = (() => {
    let _classDecorators = [statement("type.set", "TYPE myIntegerSet = SET OF INTEGER", "keyword.type", "name", "operator.equal_to", "keyword.set", "keyword.of", "name")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var TypeSetStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.name = tokens[1];
            this.setType = PrimitiveVariableType.get(tokens[5].text) ?? fail(`Sets of non-primitive types are not supported.`);
        }
        run(runtime) {
            runtime.getCurrentScope().types[this.name.text] = new SetVariableType(this.name.text, this.setType);
        }
    };
    __setFunctionName(_classThis, "TypeSetStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TypeSetStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TypeSetStatement = _classThis;
})();
export { TypeSetStatement };
let TypeRecordStatement = (() => {
    let _classDecorators = [statement("type", "TYPE StudentData", "block", "auto", "keyword.type", "name")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var TypeRecordStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.name = tokens[1];
        }
        runBlock(runtime, node) {
            const fields = {};
            for (const statement of node.nodeGroups[0]) {
                if (!(statement instanceof DeclareStatement))
                    fail(`Statements in a record type block can only be declaration statements`);
                const type = runtime.resolveVariableType(statement.varType);
                statement.variables.forEach(v => fields[v] = type);
            }
            runtime.getCurrentScope().types[this.name.text] = new RecordVariableType(this.name.text, fields);
        }
    };
    __setFunctionName(_classThis, "TypeRecordStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TypeRecordStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TypeRecordStatement = _classThis;
})();
export { TypeRecordStatement };
let AssignmentStatement = (() => {
    let _classDecorators = [statement("assignment", "x <- 5", "#", "expr+", "operator.assignment", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var AssignmentStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            [this.target, , this.expr] = tokens;
            if (this.target instanceof Token && isLiteral(this.target.type))
                fail(fquote `Cannot assign to literal token ${this.target.text}`, this.target, this);
        }
        run(runtime) {
            const variable = runtime.evaluateExpr(this.target, "variable");
            if (!variable.mutable)
                fail(`Cannot assign to constant ${this.target.toString()}`);
            //CONFIG allow copying arrays/records by assignment?
            variable.value = runtime.cloneValue(...runtime.evaluateExpr(this.expr, variable.type));
        }
    };
    __setFunctionName(_classThis, "AssignmentStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AssignmentStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AssignmentStatement = _classThis;
})();
export { AssignmentStatement };
let OutputStatement = (() => {
    let _classDecorators = [statement("output", `OUTPUT "message"`, "keyword.output", ".+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var OutputStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.outMessage = splitTokensOnComma(tokens.slice(1)).map(parseExpression);
        }
        run(runtime) {
            let outStr = "";
            for (const token of this.outMessage) {
                const expr = runtime.evaluateExpr(token, PrimitiveVariableType.STRING)[1];
                outStr += expr;
            }
            runtime._output(outStr);
        }
    };
    __setFunctionName(_classThis, "OutputStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        OutputStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return OutputStatement = _classThis;
})();
export { OutputStatement };
let InputStatement = (() => {
    let _classDecorators = [statement("input", "INPUT y", "keyword.input", "name")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var InputStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.name = tokens[1].text;
        }
        run(runtime) {
            const variable = runtime.getVariable(this.name);
            if (!variable)
                fail(`Undeclared variable ${this.name}`);
            if (!variable.mutable)
                fail(`Cannot INPUT ${this.name} because it is a constant`);
            const input = runtime._input(`Enter the value for variable ${this.name} (type: ${variable.type})`);
            switch (variable.type) {
                case PrimitiveVariableType.BOOLEAN:
                    variable.value = input.toLowerCase() != "false";
                    break;
                case PrimitiveVariableType.INTEGER: {
                    const value = Number(input);
                    if (isNaN(value))
                        fail(`input was an invalid number`);
                    if (!Number.isSafeInteger(value))
                        fail(`input was an invalid integer`);
                    variable.value = value;
                    break;
                }
                case PrimitiveVariableType.REAL: {
                    const value = Number(input);
                    if (isNaN(value))
                        fail(`input was an invalid number`);
                    if (!Number.isSafeInteger(value))
                        fail(`input was an invalid integer`);
                    variable.value = value;
                    break;
                }
                case PrimitiveVariableType.STRING:
                    variable.value = input;
                    break;
                case PrimitiveVariableType.CHAR:
                    if (input.length == 1)
                        variable.value = input;
                    else
                        fail(`input was not a valid character: contained more than one character`);
                default:
                    fail(`Cannot INPUT variable of type ${variable.type}`);
            }
        }
    };
    __setFunctionName(_classThis, "InputStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        InputStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return InputStatement = _classThis;
})();
export { InputStatement };
let ReturnStatement = (() => {
    let _classDecorators = [statement("return", "RETURN z + 5", "keyword.return", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var ReturnStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.expr = tokens[1];
        }
        run(runtime) {
            const fn = runtime.getCurrentFunction();
            if (!fn)
                fail(`RETURN is only valid within a function.`);
            const statement = fn.controlStatements[0];
            if (statement instanceof ProcedureStatement)
                fail(`Procedures cannot return a value.`);
            return {
                type: "function_return",
                value: runtime.evaluateExpr(this.expr, runtime.resolveVariableType(statement.returnType))[1]
            };
        }
    };
    __setFunctionName(_classThis, "ReturnStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ReturnStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ReturnStatement = _classThis;
})();
export { ReturnStatement };
let CallStatement = (() => {
    let _classDecorators = [statement("call", "CALL Func(5)", "keyword.call", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var CallStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            if (tokens[1] instanceof ExpressionASTFunctionCallNode) {
                this.func = tokens[1];
            }
            else
                fail(`CALL can only be used to call functions or procedures`);
        }
        run(runtime) {
            const name = this.func.functionName.text;
            const func = runtime.getFunction(name);
            if ("name" in func)
                fail(`CALL cannot be used on builtin functions, because they have no side effects`);
            if (func.controlStatements[0] instanceof FunctionStatement)
                fail(`CALL cannot be used on functions because "Functions should only be called as part of an expression." according to Cambridge.`);
            runtime.callFunction(func, this.func.args);
        }
    };
    __setFunctionName(_classThis, "CallStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CallStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CallStatement = _classThis;
})();
export { CallStatement };
let IfStatement = (() => {
    let _classDecorators = [statement("if", "IF a < 5 THEN", "block", "auto", "keyword.if", "expr+", "keyword.then")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var IfStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.condition = tokens[1];
        }
        /** Warning: block will not include the usual end statement. */
        static supportsSplit(block, statement) {
            if (statement.stype != "else")
                return `${statement.stype} statements are not valid in IF blocks`;
            return true;
            //If the current block is an if statement, the splitting statement is "else", and there is at least one statement in the first block
        }
        runBlock(runtime, node) {
            if (runtime.evaluateExpr(this.condition, PrimitiveVariableType.BOOLEAN)[1]) {
                return runtime.runBlock(node.nodeGroups[0]);
            }
            else if (node.controlStatements[1] instanceof ElseStatement && node.nodeGroups[1]) {
                return runtime.runBlock(node.nodeGroups[1]);
            }
        }
    };
    __setFunctionName(_classThis, "IfStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        IfStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return IfStatement = _classThis;
})();
export { IfStatement };
let ElseStatement = (() => {
    let _classDecorators = [statement("else", "ELSE", "block_multi_split", "keyword.else")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var ElseStatement = _classThis = class extends _classSuper {
    };
    __setFunctionName(_classThis, "ElseStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ElseStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ElseStatement = _classThis;
})();
export { ElseStatement };
let SwitchStatement = (() => {
    let _classDecorators = [statement("switch", "CASE OF x", "block", "auto", "keyword.case", "keyword.of", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var SwitchStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            [, , this.expression] = tokens;
        }
        static supportsSplit(block, statement) {
            if (!(statement instanceof CaseBranchStatement))
                return `${statement.stype} statements are not valid in CASE OF blocks`;
            if (block.nodeGroups.at(-1).length == 0 && block.nodeGroups.length != 1)
                return `Previous case branch was empty.`;
            return true;
        }
        static checkBlock({ nodeGroups }) {
            if (nodeGroups[0].length > 0)
                fail(`Statements are not allowed before the first case branch`, nodeGroups[0]);
        }
        runBlock(runtime, { controlStatements, nodeGroups }) {
            const [switchType, switchValue] = runtime.evaluateExpr(this.expression);
            for (const [i, statement] of controlStatements.entries()) {
                if (i == 0)
                    continue;
                //skip the first one as that is the switch statement
                if (statement instanceof this.type.blockEndStatement())
                    break; //end of statements
                else if (statement instanceof CaseBranchStatement) {
                    const caseToken = statement.value;
                    //Ensure that OTHERWISE is the last branch
                    if (caseToken.type == "keyword.otherwise" && i != controlStatements.length - 2)
                        fail(`OTHERWISE case branch must be the last case branch`, statement);
                    if (statement.branchMatches(switchType, switchValue)) {
                        runtime.runBlock(nodeGroups[i] ?? crash(`Missing node group in switch block`));
                        break;
                    }
                }
                else {
                    console.error(controlStatements, nodeGroups);
                    crash(`Invalid set of control statements for switch block`);
                }
            }
        }
    };
    __setFunctionName(_classThis, "SwitchStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SwitchStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SwitchStatement = _classThis;
})();
export { SwitchStatement };
let CaseBranchStatement = (() => {
    let _classDecorators = [statement("case", "5: ", "block_multi_split", "#", "literal|otherwise", "punctuation.colon")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var CaseBranchStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            [this.value] = tokens;
        }
        branchMatches(switchType, switchValue) {
            if (this.value.type == "keyword.otherwise")
                return true;
            //Try to evaluate the case token with the same type as the switch target
            const [caseType, caseValue] = Runtime.evaluateToken(this.value, switchType);
            return switchValue == caseValue;
        }
    };
    __setFunctionName(_classThis, "CaseBranchStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CaseBranchStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.suppressErrors = true;
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CaseBranchStatement = _classThis;
})();
export { CaseBranchStatement };
let CaseBranchRangeStatement = (() => {
    let _classDecorators = [statement("case.range", "5 TO 10: ", "block_multi_split", "#", "literal", "keyword.to", "literal", "punctuation.colon")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = CaseBranchStatement;
    var CaseBranchRangeStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            if (!CaseBranchRangeStatement.allowedTypes.includes(tokens[0].type))
                fail(`Token of type ${tokens[0].type} is not valid in range cases: expected a number of character`, tokens[0]);
            if (tokens[2].type != tokens[0].type)
                fail(`Token of type ${tokens[2].type} does not match the other range bound: expected a ${tokens[0].type}`, tokens[2]);
            this.upperBound = tokens[2];
        }
        branchMatches(switchType, switchValue) {
            if (this.value.type == "keyword.otherwise")
                return true;
            //Evaluate the case tokens with the same type as the switch target
            const [lType, lValue] = Runtime.evaluateToken(this.value, switchType);
            const [uType, uValue] = Runtime.evaluateToken(this.upperBound, switchType);
            return lValue <= switchValue && switchValue <= uValue;
        }
    };
    __setFunctionName(_classThis, "CaseBranchRangeStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CaseBranchRangeStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.allowedTypes = ["number.decimal", "char"];
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CaseBranchRangeStatement = _classThis;
})();
export { CaseBranchRangeStatement };
let ForStatement = (() => {
    let _classDecorators = [statement("for", "FOR i <- 1 TO 10", "block", "keyword.for", "name", "operator.assignment", "expr+", "keyword.to", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var ForStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.name = tokens[1].text;
            this.lowerBound = tokens[3];
            this.upperBound = tokens[5];
        }
        step(runtime) {
            return 1;
        }
        runBlock(runtime, node) {
            const lower = runtime.evaluateExpr(this.lowerBound, PrimitiveVariableType.INTEGER)[1];
            const upper = runtime.evaluateExpr(this.upperBound, PrimitiveVariableType.INTEGER)[1];
            if (upper < lower)
                return;
            const end = node.controlStatements[1];
            if (end.name !== this.name)
                fail(`Incorrect NEXT statement: expected variable "${this.name}" from for loop, got variable "${end.name}"`);
            const step = this.step(runtime);
            for (let i = lower; i <= upper; i += step) {
                const result = runtime.runBlock(node.nodeGroups[0], {
                    statement: this,
                    variables: {
                        //Set the loop variable in the loop scope
                        [this.name]: {
                            declaration: this,
                            mutable: false,
                            type: PrimitiveVariableType.INTEGER,
                            get value() { return i; },
                            set value(value) { crash(`Attempted assignment to constant`); },
                        }
                    },
                    types: {}
                });
                if (result)
                    return result;
            }
        }
    };
    __setFunctionName(_classThis, "ForStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ForStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ForStatement = _classThis;
})();
export { ForStatement };
let ForStepStatement = (() => {
    let _classDecorators = [statement("for.step", "FOR x <- 1 TO 20 STEP 2", "block", "keyword.for", "name", "operator.assignment", "expr+", "keyword.to", "expr+", "keyword.step", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = ForStatement;
    var ForStepStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.stepToken = tokens[7];
        }
        step(runtime) {
            return runtime.evaluateExpr(this.stepToken, PrimitiveVariableType.INTEGER)[1];
        }
    };
    __setFunctionName(_classThis, "ForStepStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ForStepStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ForStepStatement = _classThis;
})();
export { ForStepStatement };
let ForEndStatement = (() => {
    let _classDecorators = [statement("for.end", "NEXT i", "block_end", "keyword.for_end", "name")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var ForEndStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.name = tokens[1].text;
        }
    };
    __setFunctionName(_classThis, "ForEndStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ForEndStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ForEndStatement = _classThis;
})();
export { ForEndStatement };
let WhileStatement = (() => {
    let _classDecorators = [statement("while", "WHILE c < 20", "block", "auto", "keyword.while", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var WhileStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.condition = tokens[1];
        }
        runBlock(runtime, node) {
            while (runtime.evaluateExpr(this.condition, PrimitiveVariableType.BOOLEAN)[1]) {
                const result = runtime.runBlock(node.nodeGroups[0], {
                    statement: this,
                    variables: {},
                    types: {},
                });
                if (result)
                    return result;
            }
        }
    };
    __setFunctionName(_classThis, "WhileStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WhileStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WhileStatement = _classThis;
})();
export { WhileStatement };
let DoWhileStatement = (() => {
    let _classDecorators = [statement("dowhile", "REPEAT", "block", "keyword.dowhile")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var DoWhileStatement = _classThis = class extends _classSuper {
        runBlock(runtime, node) {
            let i = 0;
            do {
                const result = runtime.runBlock(node.nodeGroups[0], {
                    statement: this,
                    variables: {},
                    types: {},
                });
                if (result)
                    return result;
                if (++i > DoWhileStatement.maxLoops)
                    fail(`Too many loop iterations`, node.controlStatements[0], node.controlStatements);
            } while (!runtime.evaluateExpr(node.controlStatements[1].condition, PrimitiveVariableType.BOOLEAN)[1]);
            //Inverted, the pseudocode statement is "until"
        }
    };
    __setFunctionName(_classThis, "DoWhileStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        DoWhileStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.maxLoops = 10000; //CONFIG
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return DoWhileStatement = _classThis;
})();
export { DoWhileStatement };
let DoWhileEndStatement = (() => {
    let _classDecorators = [statement("dowhile.end", "UNTIL flag = false", "block_end", "keyword.dowhile_end", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var DoWhileEndStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.condition = tokens[1];
        }
    };
    __setFunctionName(_classThis, "DoWhileEndStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        DoWhileEndStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return DoWhileEndStatement = _classThis;
})();
export { DoWhileEndStatement };
let FunctionStatement = (() => {
    let _classDecorators = [statement("function", "FUNCTION name(arg1: TYPE) RETURNS INTEGER", "block", "auto", "keyword.function", "name", "parentheses.open", ".*", "parentheses.close", "keyword.returns", "name")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var FunctionStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            const args = parseFunctionArguments(tokens.slice(3, -3));
            if (typeof args == "string")
                fail(`Invalid function arguments: ${args}`);
            this.args = args;
            this.returnType = processTypeData(tokens.at(-1));
            this.name = tokens[1].text;
        }
        runBlock(runtime, node) {
            if (this.name in runtime.functions)
                fail(`Duplicate function definition for ${this.name}`);
            else if (this.name in builtinFunctions)
                fail(`Function ${this.name} is already defined as a builtin function`);
            //Don't actually run the block
            runtime.functions[this.name] = node;
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
            const args = parseFunctionArguments(tokens.slice(3, -1));
            if (typeof args == "string")
                fail(`Invalid function arguments: ${args}`);
            this.args = args;
            this.name = tokens[1].text;
        }
        runBlock(runtime, node) {
            //Don't actually run the block
            runtime.functions[this.name] = node;
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
let OpenFileStatement = (() => {
    let _classDecorators = [statement("openfile", `OPENFILE "file.txt" FOR READ`, "keyword.open_file", "expr+", "keyword.for", "file_mode")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var OpenFileStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            [, this.filename, , this.mode] = tokens;
        }
        run(runtime) {
            const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING)[1];
            const mode = this.mode.text;
            const file = runtime.fs.getFile(name, mode == "WRITE") ?? fail(`File ${name} does not exist.`);
            if (mode == "READ") {
                runtime.openFiles[name] = {
                    file,
                    mode,
                    lines: file.text.split("\n").slice(0, -1),
                    lineNumber: 0
                };
            }
            else if (mode == "RANDOM") {
                fail(`Not yet implemented`);
            }
            else {
                if (mode == "WRITE")
                    file.text = ""; //Clear the file so it can be overwritten
                runtime.openFiles[name] = {
                    file,
                    mode,
                };
            }
        }
    };
    __setFunctionName(_classThis, "OpenFileStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        OpenFileStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return OpenFileStatement = _classThis;
})();
export { OpenFileStatement };
let CloseFileStatement = (() => {
    let _classDecorators = [statement("closefile", `CLOSEFILE "file.txt"`, "keyword.close_file", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var CloseFileStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            [, this.filename] = tokens;
        }
        run(runtime) {
            const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING)[1];
            if (runtime.openFiles[name])
                runtime.openFiles[name] = undefined;
            else if (name in runtime.openFiles)
                fail(fquote `Cannot close file ${name}, because it has already been closed.`);
            else
                fail(fquote `Cannot close file ${name}, because it was never opened.`);
        }
    };
    __setFunctionName(_classThis, "CloseFileStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CloseFileStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CloseFileStatement = _classThis;
})();
export { CloseFileStatement };
let ReadFileStatement = (() => {
    let _classDecorators = [statement("readfile", `READFILE "file.txt", OutputVar`, "keyword.read_file", "expr+", "punctuation.comma", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var ReadFileStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            [, this.filename, , this.output] = tokens;
        }
        run(runtime) {
            const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING)[1];
            const data = (runtime.openFiles[name] ?? fail(fquote `File ${name} is not open or does not exist.`));
            if (data.mode != "READ")
                fail(fquote `Reading from a file with READFILE requires the file to be opened with mode "READ", but the mode is ${data.mode}`);
            if (data.lineNumber >= data.lines.length)
                fail(`End of file reached`);
            const output = runtime.evaluateExpr(this.output, "variable");
            output.value = data.lines[data.lineNumber++];
        }
    };
    __setFunctionName(_classThis, "ReadFileStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ReadFileStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ReadFileStatement = _classThis;
})();
export { ReadFileStatement };
let WriteFileStatement = (() => {
    let _classDecorators = [statement("writefile", `WRITEFILE "file.txt", "hello world"`, "keyword.write_file", "expr+", "punctuation.comma", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var WriteFileStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            [, this.filename, , this.data] = tokens;
        }
        run(runtime) {
            const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING)[1];
            const data = (runtime.openFiles[name] ?? fail(fquote `File ${name} is not open or does not exist.`));
            if (!(data.mode == "APPEND" || data.mode == "WRITE"))
                fail(fquote `Writing to a file with WRITEFILE requires the file to be opened with mode "APPEND" or "WRITE", but the mode is ${data.mode}`);
            data.file.text += runtime.evaluateExpr(this.data, PrimitiveVariableType.STRING)[1] + "\n";
        }
    };
    __setFunctionName(_classThis, "WriteFileStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WriteFileStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WriteFileStatement = _classThis;
})();
export { WriteFileStatement };
let SeekStatement = (() => {
    let _classDecorators = [statement("seek", `SEEK "file.txt", 5`, "keyword.seek", "expr+", "punctuation.comma", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var SeekStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            [, this.filename, , this.index] = tokens;
        }
        run(runtime) {
            const index = runtime.evaluateExpr(this.index, PrimitiveVariableType.INTEGER)[1];
            if (index < 0)
                fail(`SEEK index must be positive`);
            const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING)[1];
            const data = (runtime.openFiles[name] ?? fail(fquote `File ${name} is not open or does not exist.`));
            if (data.mode != "RANDOM")
                fail(fquote `_ requires the file to be opened with mode "RANDOM", but the mode is ${data.mode}`);
            fail(`Not yet implemented`);
        }
    };
    __setFunctionName(_classThis, "SeekStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SeekStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SeekStatement = _classThis;
})();
export { SeekStatement };
let GetRecordStatement = (() => {
    let _classDecorators = [statement("getrecord", `GETRECORD "file.txt", Record`, "keyword.get_record", "expr+", "punctuation.comma", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var GetRecordStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            [, this.filename, , this.variable] = tokens;
        }
        run(runtime) {
            const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING)[1];
            const data = (runtime.openFiles[name] ?? fail(fquote `File ${name} is not open or does not exist.`));
            if (data.mode != "RANDOM")
                fail(fquote `_ requires the file to be opened with mode "RANDOM", but the mode is ${data.mode}`);
            const variable = runtime.evaluateExpr(this.variable, "variable");
            fail(`Not yet implemented`);
        }
    };
    __setFunctionName(_classThis, "GetRecordStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        GetRecordStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return GetRecordStatement = _classThis;
})();
export { GetRecordStatement };
let PutRecordStatement = (() => {
    let _classDecorators = [statement("putrecord", `PUTRECORD "file.txt", Record`, "keyword.put_record", "expr+", "punctuation.comma", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var PutRecordStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            [, this.filename, , this.variable] = tokens;
        }
        run(runtime) {
            const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING)[1];
            const data = (runtime.openFiles[name] ?? fail(fquote `File ${name} is not open or does not exist.`));
            if (data.mode != "RANDOM")
                fail(fquote `_ requires the file to be opened with mode "RANDOM", but the mode is ${data.mode}`);
            const [type, value] = runtime.evaluateExpr(this.variable);
            fail(`Not yet implemented`);
        }
    };
    __setFunctionName(_classThis, "PutRecordStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PutRecordStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PutRecordStatement = _classThis;
})();
export { PutRecordStatement };
let ClassStatement = (() => {
    let _classDecorators = [statement("class", "CLASS Dog", "block", "auto", "keyword.class", "name")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var ClassStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
        }
        runBlock(runtime, node) {
            fail(`Not yet implemented`);
        }
    };
    __setFunctionName(_classThis, "ClassStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ClassStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ClassStatement = _classThis;
})();
export { ClassStatement };
let ClassInheritsStatement = (() => {
    let _classDecorators = [statement("class.inherits", "CLASS Dog", "block", "auto", "keyword.class", "name", "keyword.inherits", "name")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = ClassStatement;
    var ClassInheritsStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
        }
        runBlock(runtime, node) {
            fail(`Not yet implemented`);
        }
    };
    __setFunctionName(_classThis, "ClassInheritsStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ClassInheritsStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ClassInheritsStatement = _classThis;
})();
export { ClassInheritsStatement };