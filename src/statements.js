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
import { Runtime } from "./runtime.js";
import { Token } from "./lexer-types.js";
import { ArrayTypeData, ExpressionASTBranchNode } from "./parser-types.js";
import { isLiteral, parseExpression, parseFunctionArguments, processTypeData } from "./parser.js";
import { displayExpression, fail, crash, escapeHTML, isVarType, splitTokensOnComma, getTotalRange, SoodocodeError, fquote } from "./utils.js";
import { builtinFunctions } from "./builtin_functions.js";
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
    toString(html = false) {
        if (html) {
            return this.tokens.map(t => t instanceof Token ? escapeHTML(t.text) : `<span class="expression-container">${displayExpression(t, false, true)}</span>`).join(" ");
        }
        else {
            return this.tokens.map(t => displayExpression(t, false)).join(" ");
        }
    }
    blockEndStatement() {
        if (this.category != "block")
            crash(`Statement ${this.stype} has no block end statement because it is not a block statement`);
        return statements.byType[this.stype + ".end"]; //REFACTOR CHECK
    }
    example() {
        return this.type.example;
    }
    /** Warning: block will not include the usual end statement. */
    static supportsSplit(block, statement) {
        return fquote `current block of type ${block.type} cannot be split by ${statement.toString()}`;
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
Statement.tokens = null; //Assigned in the decorator
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
let DeclarationStatement = (() => {
    let _classDecorators = [statement("declaration", "DECLARE variable: TYPE", "keyword.declare", ".+", "punctuation.colon", "type+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var DeclarationStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.variables = [];
            //parse the variable list
            let expected = "name";
            for (const token of tokens.slice(1, -2)) {
                if (expected == "name") {
                    if (token.type == "name") {
                        this.variables.push(token.text);
                        expected = "commaOrColon";
                    }
                    else
                        fail(`Expected name, got ${token}`);
                }
                else {
                    if (token.type == "punctuation.comma")
                        expected = "name";
                    else
                        fail(`Expected comma, got ${token}`);
                }
            }
            if (expected == "name")
                fail(`Expected name, found ${tokens.at(-2)}`);
            this.varType = processTypeData(tokens.at(-1));
        }
        run(runtime) {
            for (const variable of this.variables) {
                if (runtime.getVariable(variable))
                    fail(`Variable ${variable} was already declared`);
                runtime.getCurrentScope().variables[variable] = {
                    type: this.varType,
                    value: this.varType instanceof ArrayTypeData ? Array(this.varType.totalLength).fill(null) : null,
                    declaration: this,
                    mutable: true,
                };
            }
        }
    };
    __setFunctionName(_classThis, "DeclarationStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        DeclarationStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return DeclarationStatement = _classThis;
})();
export { DeclarationStatement };
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
                value,
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
let AssignmentStatement = (() => {
    let _classDecorators = [statement("assignment", "x <- 5", "#", "expr+", "operator.assignment", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var AssignmentStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            [this.name, , this.expr] = tokens;
            if (this.name instanceof ExpressionASTBranchNode) {
                if (this.name.operator != "array access")
                    fail(`Expression ${displayExpression(this.name)} cannot be assigned to`, this.name, this);
            }
            else {
                if (isLiteral(this.name.type))
                    fail(fquote `Cannot assign to literal token ${this.name.text}`, this.name, this);
            }
        }
        run(runtime) {
            if (this.name instanceof ExpressionASTBranchNode) {
                runtime.processArrayAccess(this.name, "set", this.expr);
            }
            else {
                const variable = runtime.getVariable(this.name.text);
                if (!variable)
                    fail(`Undeclared variable ${this.name.text}`);
                if (!variable.mutable)
                    fail(`Cannot assign to constant ${this.name.text}`);
                variable.value = runtime.evaluateExpr(this.expr, variable.type)[1];
            }
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
                const expr = runtime.evaluateExpr(token, "STRING")[1];
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
                case "BOOLEAN":
                    variable.value = input.toLowerCase() != "false";
                    break;
                case "INTEGER": {
                    const value = Number(input);
                    if (isNaN(value))
                        fail(`input was an invalid number`);
                    if (!Number.isSafeInteger(value))
                        fail(`input was an invalid integer`);
                    variable.value = value;
                    break;
                }
                case "REAL": {
                    const value = Number(input);
                    if (isNaN(value))
                        fail(`input was an invalid number`);
                    if (!Number.isSafeInteger(value))
                        fail(`input was an invalid integer`);
                    variable.value = value;
                    break;
                }
                case "STRING":
                    variable.value = input;
                    break;
                case "CHAR":
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
                value: runtime.evaluateExpr(this.expr, statement.returnType)[1]
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
            if (!(tokens[1] instanceof Token) && tokens[1].operator == "function call") {
                this.func = tokens[1];
            }
            else
                crash(`CALL can only be used to call functions or procedures`);
        }
        run(runtime) {
            const name = this.func.operatorToken.text;
            const func = runtime.getFunction(name);
            if ("name" in func)
                fail(`CALL cannot be used on builtin functions, because they have no side effects`);
            if (func.controlStatements[0] instanceof FunctionStatement)
                fail(`CALL cannot be used on functions because "Functions should only be called as part of an expression." according to Cambridge.`);
            runtime.callFunction(func, this.func.nodes);
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
            if (runtime.evaluateExpr(this.condition, "BOOLEAN")[1]) {
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
    let _classDecorators = [statement("switch", "CASE OF x", "block", "keyword.case", "keyword.of", "expr+")];
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
            if (statement.stype != "case")
                return `${statement.stype} statements are not valid in CASE OF blocks`;
            if (block.nodeGroups.at(-1).length == 0 && block.nodeGroups.length != 1)
                return `Previous case branch was empty.`;
            return true;
        }
        runBlock(runtime, { controlStatements, nodeGroups }) {
            const [switchType, switchValue] = runtime.evaluateExpr(this.expression);
            if (nodeGroups[0].length > 0)
                fail(`Statements are not allowed before the first case branch`, nodeGroups[0]); //TODO this is a syntax error and should error at parse
            for (let i = 1; i < controlStatements.length; i++) {
                //skip the first one as that is the switch statement
                if (controlStatements[i] instanceof SwitchEndStatement)
                    break; //end of statements
                else if (controlStatements[i] instanceof CaseBranchStatement) {
                    const caseToken = controlStatements[i].value;
                    //Ensure that OTHERWISE is the last branch
                    if (caseToken.type == "keyword.otherwise" && i != controlStatements.length - 2)
                        fail(`OTHERWISE case branch must be the last case branch`, controlStatements[i]);
                    if ((function branchMatches() {
                        if (caseToken.type == "keyword.otherwise")
                            return true;
                        try {
                            //Try to evaluate the case token with the same type as the switch target
                            const [caseType, caseValue] = Runtime.evaluateToken(caseToken, switchType);
                            return switchValue == caseValue;
                        }
                        catch (err) {
                            if (err instanceof SoodocodeError) {
                                //type error (TODO make sure it is actually a type error)
                                //try again leaving the type blank, this will probably evaluate to false and it will try the next branch
                                const [caseType, caseValue] = Runtime.evaluateToken(caseToken);
                                return switchType == caseType && switchValue == caseValue;
                            }
                            else
                                throw err;
                        }
                    })()) {
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
let SwitchEndStatement = (() => {
    let _classDecorators = [statement("switch.end", "ENDCASE", "block_end", "keyword.case_end")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var SwitchEndStatement = _classThis = class extends _classSuper {
    };
    __setFunctionName(_classThis, "SwitchEndStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SwitchEndStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SwitchEndStatement = _classThis;
})();
export { SwitchEndStatement };
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
    };
    __setFunctionName(_classThis, "CaseBranchStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CaseBranchStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CaseBranchStatement = _classThis;
})();
export { CaseBranchStatement };
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
        runBlock(runtime, node) {
            const lower = runtime.evaluateExpr(this.lowerBound, "INTEGER")[1];
            const upper = runtime.evaluateExpr(this.upperBound, "INTEGER")[1];
            if (upper < lower)
                return;
            const end = node.controlStatements[1];
            if (end.name !== this.name)
                fail(`Incorrect NEXT statement: expected variable "${this.name}" from for loop, got variable "${end.name}"`);
            for (let i = lower; i <= upper; i++) {
                const result = runtime.runBlock(node.nodeGroups[0], {
                    statement: this,
                    variables: {
                        //Set the loop variable in the loop scope
                        [this.name]: {
                            declaration: this,
                            mutable: false,
                            type: "INTEGER",
                            value: i
                        }
                    }
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
            while (runtime.evaluateExpr(this.condition, "BOOLEAN")[1]) {
                const result = runtime.runBlock(node.nodeGroups[0], {
                    statement: this,
                    variables: {}
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
                    variables: {}
                });
                if (result)
                    return result;
                if (++i > DoWhileStatement.maxLoops)
                    fail(`Too many loop iterations`, node.controlStatements[0], node.controlStatements);
            } while (!runtime.evaluateExpr(node.controlStatements[1].condition, "BOOLEAN")[1]);
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
            const returnType = tokens.at(-1).text;
            if (!isVarType(returnType))
                fail(`Invalid type ${returnType}`);
            this.returnType = returnType;
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
