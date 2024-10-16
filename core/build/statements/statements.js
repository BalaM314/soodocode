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
import { configs } from "../config/index.js";
import { Token } from "../lexer/index.js";
import { ExpressionASTFunctionCallNode, getUniqueNamesFromCommaSeparatedTokenList, isLiteral, literalTypes, parseExpression, parseFunctionArguments, processTypeData, ProgramASTBranchNode, splitTokensOnComma } from "../parser/index.js";
import { ClassVariableType, EnumeratedVariableType, FileMode, PointerVariableType, PrimitiveVariableType, RecordVariableType, SetVariableType, UntypedNodeValue } from "../runtime/runtime-types.js";
import { Runtime } from "../runtime/runtime.js";
import { combineClasses, crash, enableConfig, f, fail, getTotalRange } from "../utils/funcs.js";
import { evaluate, finishStatements, statement } from "./decorators.js";
import { Statement } from "./statement.js";
export class TypeStatement extends Statement {
    preRun(group, node) {
        super.preRun(group, node);
    }
    createType(runtime) {
        crash(`Missing runtime implementation for type initialization for statement ${this.stype}`);
    }
    createTypeBlock(runtime, block) {
        crash(`Missing runtime implementation for type initialization for statement ${this.stype}`);
    }
}
let DeclareStatement = (() => {
    let _classDecorators = [statement("declare", "DECLARE variable: TYPE", "keyword.declare", ".+", "punctuation.colon", "type+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var DeclareStatement = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.varType = processTypeData(this.expr(-1, "type"));
            this.variables = getUniqueNamesFromCommaSeparatedTokenList(this.tokens(1, -2), this.token(-2)).map(t => [t.text, t]);
        }
        run(runtime) {
            const varType = runtime.resolveVariableType(this.varType);
            if (varType instanceof SetVariableType)
                fail({
                    summary: `Cannot declare a set variable with the DECLARE statement`,
                    help: [f.range `use the DEFINE statement instead, like this:\nDEFINE ${this.variables[0][0]} (your comma-separated values here): ${this.expr(-1, "type")}`]
                }, this.nodes.at(-1));
            for (const [variable, token] of this.variables) {
                runtime.defineVariable(variable, {
                    type: varType,
                    value: varType.getInitValue(runtime, configs.initialization.normal_variables_default.value),
                    declaration: this,
                    mutable: true,
                }, token);
            }
        }
    };
    __setFunctionName(_classThis, "DeclareStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        DeclareStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.requiresScope = true;
    (() => {
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
        constructor() {
            super(...arguments);
            this.name = this.token(1).text;
            this.expression = this.token(3);
        }
        preRun(group, node) {
            super.preRun(group, node);
            group.hasTypesOrConstants = true;
        }
        run(runtime) {
            if (runtime.getVariable(this.name))
                fail(`Constant ${this.name} was already declared`, this);
            const { type, value } = Runtime.evaluateToken(this.expression)
                ?? crash(`evaluation of literals cannot fail`);
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
    })();
    _classThis.requiresScope = true;
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ConstantStatement = _classThis;
})();
export { ConstantStatement };
let DefineStatement = (() => {
    let _classDecorators = [statement("define", "DEFINE PrimesBelow20 (2, 3, 5, 7, 11, 13, 17, 19): myIntegerSet", "keyword.define", "name", "parentheses.open", ".*", "parentheses.close", "punctuation.colon", "name")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var DefineStatement = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.name = this.token(1);
            this.variableTypeToken = this.token(-1);
            this.variableType = processTypeData(this.variableTypeToken);
            this.values = getUniqueNamesFromCommaSeparatedTokenList(this.tokens(3, -3), this.token(-3), literalTypes);
        }
        run(runtime) {
            const type = runtime.resolveVariableType(this.variableType);
            if (!(type instanceof SetVariableType))
                fail({
                    summary: `DEFINE can only be used on set types`,
                    help: `use a DECLARE statement instead`
                }, this.variableTypeToken);
            runtime.defineVariable(this.name.text, {
                type,
                declaration: this,
                mutable: true,
                value: this.values.map(t => (Runtime.evaluateToken(t, type.baseType)
                    ?? crash(`evaluating a literal token cannot fail`)).value)
            }, this.name);
        }
    };
    __setFunctionName(_classThis, "DefineStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        DefineStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.requiresScope = true;
    (() => {
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
    let _classSuper = TypeStatement;
    var TypePointerStatement = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.name = this.token(1).text;
            this.targetType = processTypeData(this.expr(4, "type"));
        }
        createType(runtime) {
            return [this.name, new PointerVariableType(false, this.name, this.targetType, this.range)];
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
    let _classDecorators = [statement("type.enum", "TYPE Weekend = (Sunday, Saturday)", "keyword.type", "name", "operator.equal_to", "parentheses.open", ".*", "parentheses.close")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = TypeStatement;
    var TypeEnumStatement = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.name = this.token(1);
            this.values = getUniqueNamesFromCommaSeparatedTokenList(this.tokens(4, -1), this.token(-1));
        }
        createType(runtime) {
            return [this.name.text, new EnumeratedVariableType(this.name.text, this.values.map(t => t.text))];
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
    let _classSuper = TypeStatement;
    var TypeSetStatement = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.name = this.token(1);
            this.setType = PrimitiveVariableType.get(this.token(5).text)
                ?? fail(`Sets of non-primitive types are not supported.`, this.token(5));
        }
        createType(runtime) {
            return [this.name.text, new SetVariableType(false, this.name.text, this.setType)];
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
    let _classSuper = TypeStatement;
    var TypeRecordStatement = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.name = this.token(1);
        }
        createTypeBlock(runtime, node) {
            const fields = Object.create(null);
            for (const statement of node.nodeGroups[0]) {
                if (!(statement instanceof DeclareStatement))
                    crash(`allowOnly is ["declare"]`);
                statement.variables.forEach(([v, r]) => fields[v] = [statement.varType, r.range]);
            }
            return [this.name.text, new RecordVariableType(false, this.name.text, fields)];
        }
    };
    __setFunctionName(_classThis, "TypeRecordStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TypeRecordStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.propagatesControlFlowInterruptions = false;
    _classThis.allowOnly = new Set(["declare"]);
    (() => {
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
    let _expression_decorators;
    let _expression_initializers = [];
    let _expression_extraInitializers = [];
    var AssignmentStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.target = this.expr(0);
            this.expression = __runInitializers(this, _expression_initializers, this.exprT(2));
            __runInitializers(this, _expression_extraInitializers);
            if (this.target instanceof Token && isLiteral(this.target.type))
                fail(f.quote `Cannot assign to literal token ${this.target}`, this.target, this);
        }
        run(runtime) {
            if (this.target instanceof Token && !runtime.getVariable(this.target.text)) {
                const { type, value } = runtime.evaluateUntyped(this.expression);
                if (type instanceof ClassVariableType) {
                    if (configs.statements.auto_declare_classes.value) {
                        runtime.getCurrentScope().variables[this.target.text] = {
                            type, value, declaration: this, mutable: true,
                        };
                    }
                    else
                        fail({
                            summary: f.quote `Variable ${this.target.text} does not exist`,
                            help: {
                                message: `to automatically declare the variable`,
                                config: configs.statements.auto_declare_classes,
                                value: true,
                            }
                        }, this.target, this);
                }
                else
                    runtime.handleNonexistentVariable(this.target.text, this.target);
            }
            runtime.assignExpr(this.target, this.expression);
        }
    };
    __setFunctionName(_classThis, "AssignmentStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        _expression_decorators = [evaluate];
        __esDecorate(null, null, _expression_decorators, { kind: "field", name: "expression", static: false, private: false, access: { has: obj => "expression" in obj, get: obj => obj.expression, set: (obj, value) => { obj.expression = value; } }, metadata: _metadata }, _expression_initializers, _expression_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AssignmentStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.requiresScope = configs.statements.auto_declare_classes.value;
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AssignmentStatement = _classThis;
})();
export { AssignmentStatement };
let AssignmentBadStatement = (() => {
    let _classDecorators = [statement("illegal.assignment", "x = 5", "#", "expr+", "operator.equal_to", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var AssignmentBadStatement = _classThis = class extends _classSuper {
    };
    __setFunctionName(_classThis, "AssignmentBadStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AssignmentBadStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.invalidMessage = "Use the assignment operator (<-) to assign a value to a variable. The = sign is used to test for equality.";
    _classThis.suppressErrors = true;
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AssignmentBadStatement = _classThis;
})();
export { AssignmentBadStatement };
let OutputStatement = (() => {
    let _classDecorators = [statement("output", `OUTPUT "message"`, "keyword.output", ".+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var OutputStatement = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.outMessage = splitTokensOnComma(this.nodes.slice(1))
                .map(n => new UntypedNodeValue(parseExpression(n)));
        }
        run(runtime) {
            runtime._output(this.outMessage.map(expr => runtime.evaluateUntyped(expr)));
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
        constructor() {
            super(...arguments);
            this.name = this.token(1).text;
        }
        run(runtime) {
            const variable = runtime.getVariable(this.name) ?? runtime.handleNonexistentVariable(this.name, this.nodes[1].range);
            if (!variable.mutable)
                fail(f.quote `Cannot INPUT ${this.name} because it is immutable`, this.nodes[1], this);
            const input = runtime._input(f.text `Enter the value for variable "${this.name}" (type: ${variable.type})`, variable.type);
            switch (variable.type) {
                case PrimitiveVariableType.BOOLEAN:
                    if (input.toLowerCase() == "false")
                        variable.value = false;
                    else if (input.toLowerCase() == "true")
                        variable.value = true;
                    else
                        fail(`input was an invalid boolean`, this);
                    break;
                case PrimitiveVariableType.INTEGER: {
                    if (input.trim().length == 0)
                        fail(`input was empty`, this);
                    const value = Number(input);
                    if (isNaN(value))
                        fail(`input was an invalid number`, this);
                    if (!Number.isSafeInteger(value))
                        fail(`input was an invalid integer`, this);
                    variable.value = value;
                    break;
                }
                case PrimitiveVariableType.REAL: {
                    if (input.trim().length == 0)
                        fail(`input was empty`, this);
                    const value = Number(input);
                    if (isNaN(value))
                        fail(`input was an invalid number`, this);
                    if (!Number.isSafeInteger(value))
                        fail(`input was an invalid integer`, this);
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
                        fail(`input was not a valid character: contained more than one character`, this);
                    break;
                default:
                    fail(f.quote `Cannot INPUT variable of type ${variable.type}`, this);
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
    let _expression_decorators;
    let _expression_initializers = [];
    let _expression_extraInitializers = [];
    var ReturnStatement = _classThis = class extends _classSuper {
        run(runtime) {
            const fn = runtime.getCurrentFunction();
            if (!fn)
                fail(`RETURN is only valid within a function.`, this);
            let type;
            if (fn instanceof ProgramASTBranchNode) {
                const statement = fn.controlStatements[0];
                if (statement instanceof ProcedureStatement)
                    fail(`Procedures cannot return a value.`, this);
                type = statement.returnType;
            }
            else {
                if (fn instanceof ClassProcedureStatement)
                    fail(`Procedures cannot return a value.`, this);
                type = fn.returnType;
            }
            return {
                type: "function_return",
                value: runtime.evaluateUntyped(this.expression, runtime.resolveVariableType(type)).value
            };
        }
        constructor() {
            super(...arguments);
            this.expression = __runInitializers(this, _expression_initializers, this.exprT(1));
            __runInitializers(this, _expression_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "ReturnStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        _expression_decorators = [evaluate];
        __esDecorate(null, null, _expression_decorators, { kind: "field", name: "expression", static: false, private: false, access: { has: obj => "expression" in obj, get: obj => obj.expression, set: (obj, value) => { obj.expression = value; } }, metadata: _metadata }, _expression_initializers, _expression_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ReturnStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.interruptsControlFlow = true;
    (() => {
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
        constructor() {
            super(...arguments);
            this.func = this.expr(1, [ExpressionASTFunctionCallNode], `CALL can only be used to call functions or procedures`);
        }
        run(runtime) {
            const func = runtime.evaluateExpr(this.func.functionName, "function");
            if ("clazz" in func) {
                runtime.callClassMethod(func.method, func.clazz, func.instance, this.func.args, false);
            }
            else {
                if ("name" in func)
                    fail(`CALL cannot be used on builtin functions, because they have no side effects`, this.func);
                if (func.controlStatements[0] instanceof FunctionStatement && !configs.statements.call_functions.value)
                    fail({
                        summary: `CALL cannot be used on functions.`,
                        elaboration: `Cambridge says so in section 8.2 of the official pseudocode guide.`,
                        help: enableConfig(configs.statements.call_functions)
                    }, this.func);
                runtime.callFunction(func, this.func.args);
            }
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
let EndBadStatement = (() => {
    let _classDecorators = [statement("illegal.end", "END", "block_end", "keyword.end", ".*")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var EndBadStatement = _classThis = class extends _classSuper {
    };
    __setFunctionName(_classThis, "EndBadStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        EndBadStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.invalidMessage = (result, context) => [f.quote `Expected a block end statement, like ${context?.controlStatements[0].type.blockEndStatement().example ?? "ENDIF"}`];
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return EndBadStatement = _classThis;
})();
export { EndBadStatement };
let IfStatement = (() => {
    let _classDecorators = [statement("if", "IF a < 5 THEN", "block", "auto", "keyword.if", "expr+", "keyword.then")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    let _condition_decorators;
    let _condition_initializers = [];
    let _condition_extraInitializers = [];
    var IfStatement = _classThis = class extends _classSuper {
        runBlock(runtime, node) {
            const scope = {
                statement: this,
                opaque: false,
                variables: Object.create(null),
                types: Object.create(null),
            };
            if (runtime.evaluate(this.condition)) {
                return runtime.runBlock(node.nodeGroups[0], true, scope);
            }
            else if (node.controlStatements[1] instanceof ElseStatement && node.nodeGroups[1]) {
                return runtime.runBlock(node.nodeGroups[1], true, scope);
            }
        }
        constructor() {
            super(...arguments);
            this.condition = __runInitializers(this, _condition_initializers, this.exprT(1, "BOOLEAN"));
            __runInitializers(this, _condition_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "IfStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        _condition_decorators = [evaluate];
        __esDecorate(null, null, _condition_decorators, { kind: "field", name: "condition", static: false, private: false, access: { has: obj => "condition" in obj, get: obj => obj.condition, set: (obj, value) => { obj.condition = value; } }, metadata: _metadata }, _condition_initializers, _condition_extraInitializers);
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
    })();
    _classThis.blockType = "if";
    (() => {
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
    let _expression_decorators;
    let _expression_initializers = [];
    let _expression_extraInitializers = [];
    var SwitchStatement = _classThis = class extends _classSuper {
        static supportsSplit(block, statement) {
            if (block.nodeGroups.at(-1).length == 0 && block.nodeGroups.length != 1)
                return `Previous case branch was empty. (Fallthrough is not supported.)`;
            return true;
        }
        static checkBlock({ nodeGroups, controlStatements }) {
            if (nodeGroups[0].length > 0)
                fail(`Statements are not allowed before the first case branch`, nodeGroups[0]);
            let err;
            if (err = controlStatements.slice(1, -1).find((s, i, arr) => s instanceof CaseBranchStatement && s.value.type == "keyword.otherwise" && i != arr.length - 1))
                fail(`OTHERWISE case branch must be the last case branch`, err);
        }
        runBlock(runtime, { controlStatements, nodeGroups }) {
            const { type: switchType, value: switchValue } = runtime.evaluateUntyped(this.expression);
            for (const [i, statement] of controlStatements.entries()) {
                if (i == 0)
                    continue;
                if (statement instanceof this.type.blockEndStatement())
                    break;
                else if (statement instanceof CaseBranchStatement) {
                    const caseToken = statement.value;
                    if (caseToken.type == "keyword.otherwise" && i != controlStatements.length - 2)
                        crash(`OTHERWISE case branch must be the last case branch`);
                    if (statement.branchMatches(switchType, switchValue)) {
                        return runtime.runBlock(nodeGroups[i] ?? crash(`Missing node group in switch block`), true, {
                            statement: this,
                            opaque: false,
                            variables: Object.create(null),
                            types: Object.create(null),
                        });
                    }
                }
                else {
                    console.error(controlStatements, nodeGroups);
                    crash(`Invalid set of control statements for switch block`);
                }
            }
        }
        constructor() {
            super(...arguments);
            this.expression = __runInitializers(this, _expression_initializers, this.exprT(2));
            __runInitializers(this, _expression_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "SwitchStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        _expression_decorators = [evaluate];
        __esDecorate(null, null, _expression_decorators, { kind: "field", name: "expression", static: false, private: false, access: { has: obj => "expression" in obj, get: obj => obj.expression, set: (obj, value) => { obj.expression = value; } }, metadata: _metadata }, _expression_initializers, _expression_extraInitializers);
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
        constructor() {
            super(...arguments);
            this.value = this.token(0);
        }
        branchMatches(switchType, switchValue) {
            if (this.value.type == "keyword.otherwise")
                return true;
            const { value: caseValue } = Runtime.evaluateToken(this.value, switchType);
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
    _classThis.blockType = "switch";
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
            this.lowerBound = this.token(0);
            this.upperBound = this.token(2);
            if (!CaseBranchRangeStatement.allowedTypes.includes(this.lowerBound.type))
                fail({
                    summary: f.range `Range bound ${this.lowerBound} is not valid`,
                    elaboration: `expected a number or character`
                }, this.lowerBound);
            if (this.lowerBound.type != this.upperBound.type) {
                const lowerBoundType = this.lowerBound.type == "number.decimal" ? `number` : `char`;
                const upperBoundType = this.upperBound.type == "number.decimal" ? `number` : `char`;
                fail({
                    summary: f.quote `Range bound ${this.upperBound} is not valid`,
                    elaboration: [
                        f.range `the other range bound (${this.lowerBound}) was a ${lowerBoundType}`,
                        f.range `expected another ${lowerBoundType}, not a ${upperBoundType}`
                    ]
                }, this.upperBound);
            }
        }
        branchMatches(switchType, switchValue) {
            if (this.value.type == "keyword.otherwise")
                return true;
            const { value: lValue } = Runtime.evaluateToken(this.lowerBound, switchType);
            const { value: uValue } = Runtime.evaluateToken(this.upperBound, switchType);
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
    _classThis.blockType = "switch";
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
    let _from_decorators;
    let _from_initializers = [];
    let _from_extraInitializers = [];
    let _to_decorators;
    let _to_initializers = [];
    let _to_extraInitializers = [];
    var ForStatement = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.name = this.token(1).text;
            this.from = __runInitializers(this, _from_initializers, this.exprT(3, "INTEGER"));
            this.to = (__runInitializers(this, _from_extraInitializers), __runInitializers(this, _to_initializers, this.exprT(5, "INTEGER")));
            this.empty = __runInitializers(this, _to_extraInitializers);
        }
        preRun(group, node) {
            super.preRun(group, node);
            this.empty = node.nodeGroups[0].length == 0;
            const endStatement = node.controlStatements[1];
            if (endStatement.name.text !== this.name)
                fail({
                    summary: f.quote `Incorrect NEXT statement`,
                    elaboration: [
                        `the variables in the FOR statement and NEXT statement should match`,
                        f.quote `expected variable ${this.name} from for loop, got variable ${endStatement.name}`
                    ]
                }, endStatement.name);
        }
        getStep(runtime) {
            return 1;
        }
        runBlock(runtime, node) {
            const from = BigInt(runtime.evaluate(this.from));
            const to = BigInt(runtime.evaluate(this.to));
            const _step = this.getStep(runtime), step = BigInt(_step);
            const direction = Math.sign(_step);
            if (direction == 0)
                fail(`Invalid FOR statement: step cannot be zero`, this.step);
            if (direction == 1 && to < from ||
                direction == -1 && from < to)
                return;
            if (this.empty) {
                runtime.statementExecuted(this, Number(to - from) / _step);
                return;
            }
            const variable = {
                declaration: this,
                mutable: false,
                type: PrimitiveVariableType.INTEGER,
                value: null,
            };
            if (node.nodeGroups[0].simple()) {
                const scope = {
                    statement: this,
                    opaque: false,
                    variables: Object.setPrototypeOf({
                        [this.name]: variable
                    }, null),
                    types: Object.create(null),
                };
                runtime.scopes.push(scope);
                for (let i = from; direction == 1 ? i <= to : i >= to; i += step) {
                    variable.value = Number(i);
                    runtime.runBlockFast(node.nodeGroups[0]);
                }
                runtime.scopes.pop();
            }
            else {
                for (let i = from; direction == 1 ? i <= to : i >= to; i += step) {
                    variable.value = Number(i);
                    const result = runtime.runBlock(node.nodeGroups[0], false, {
                        statement: this,
                        opaque: false,
                        variables: Object.setPrototypeOf({
                            [this.name]: variable
                        }, null),
                        types: Object.create(null)
                    });
                    if (result)
                        return result;
                }
            }
        }
    };
    __setFunctionName(_classThis, "ForStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        _from_decorators = [evaluate];
        _to_decorators = [evaluate];
        __esDecorate(null, null, _from_decorators, { kind: "field", name: "from", static: false, private: false, access: { has: obj => "from" in obj, get: obj => obj.from, set: (obj, value) => { obj.from = value; } }, metadata: _metadata }, _from_initializers, _from_extraInitializers);
        __esDecorate(null, null, _to_decorators, { kind: "field", name: "to", static: false, private: false, access: { has: obj => "to" in obj, get: obj => obj.to, set: (obj, value) => { obj.to = value; } }, metadata: _metadata }, _to_initializers, _to_extraInitializers);
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
    let _step_decorators;
    let _step_initializers = [];
    let _step_extraInitializers = [];
    var ForStepStatement = _classThis = class extends _classSuper {
        getStep(runtime) {
            return runtime.evaluate(this.step);
        }
        constructor() {
            super(...arguments);
            this.step = __runInitializers(this, _step_initializers, this.exprT(7, "INTEGER"));
            __runInitializers(this, _step_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "ForStepStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        _step_decorators = [evaluate];
        __esDecorate(null, null, _step_decorators, { kind: "field", name: "step", static: false, private: false, access: { has: obj => "step" in obj, get: obj => obj.step, set: (obj, value) => { obj.step = value; } }, metadata: _metadata }, _step_initializers, _step_extraInitializers);
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
        constructor() {
            super(...arguments);
            this.name = this.token(1);
        }
    };
    __setFunctionName(_classThis, "ForEndStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ForEndStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.blockType = "for";
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ForEndStatement = _classThis;
})();
export { ForEndStatement };
let ForEndBadStatement = (() => {
    let _classDecorators = [statement("illegal.for.end", "NEXT", "block_end", "keyword.for_end")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var ForEndBadStatement = _classThis = class extends _classSuper {
    };
    __setFunctionName(_classThis, "ForEndBadStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ForEndBadStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.blockType = "for";
    _classThis.invalidMessage = (result, context) => [`Expected ${context.controlStatements[0].name}, got end of line`, result[0].rangeAfter()];
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ForEndBadStatement = _classThis;
})();
export { ForEndBadStatement };
let WhileStatement = (() => {
    let _classDecorators = [statement("while", "WHILE c < 20", "block", "auto", "keyword.while", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    let _condition_decorators;
    let _condition_initializers = [];
    let _condition_extraInitializers = [];
    var WhileStatement = _classThis = class extends _classSuper {
        runBlock(runtime, node) {
            if (node.nodeGroups[0].length == 0 && this.condition.value === true)
                runtime.statementExecuted(this, Infinity);
            while (runtime.evaluate(this.condition)) {
                const result = runtime.runBlock(node.nodeGroups[0], true, {
                    statement: this,
                    opaque: false,
                    variables: Object.create(null),
                    types: Object.create(null),
                });
                if (result)
                    return result;
            }
        }
        constructor() {
            super(...arguments);
            this.condition = __runInitializers(this, _condition_initializers, this.exprT(1, "BOOLEAN"));
            __runInitializers(this, _condition_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "WhileStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        _condition_decorators = [evaluate];
        __esDecorate(null, null, _condition_decorators, { kind: "field", name: "condition", static: false, private: false, access: { has: obj => "condition" in obj, get: obj => obj.condition, set: (obj, value) => { obj.condition = value; } }, metadata: _metadata }, _condition_initializers, _condition_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WhileStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WhileStatement = _classThis;
})();
export { WhileStatement };
let DoWhileStatement = (() => {
    let _classDecorators = [statement("do_while", "REPEAT", "block", "keyword.do_while")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var DoWhileStatement = _classThis = class extends _classSuper {
        runBlock(runtime, node) {
            if (node.nodeGroups[0].length == 0 && node.controlStatements[1].condition.value === false)
                runtime.statementExecuted(this, Infinity);
            do {
                const result = runtime.runBlock(node.nodeGroups[0], true, {
                    statement: this,
                    opaque: false,
                    variables: Object.create(null),
                    types: Object.create(null),
                });
                if (result)
                    return result;
            } while (!runtime.evaluate(node.controlStatements[1].condition));
        }
    };
    __setFunctionName(_classThis, "DoWhileStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        DoWhileStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return DoWhileStatement = _classThis;
})();
export { DoWhileStatement };
let DoWhileEndStatement = (() => {
    let _classDecorators = [statement("do_while.end", "UNTIL flag = false", "block_end", "keyword.dowhile_end", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    let _condition_decorators;
    let _condition_initializers = [];
    let _condition_extraInitializers = [];
    var DoWhileEndStatement = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.condition = __runInitializers(this, _condition_initializers, this.exprT(1, "BOOLEAN"));
            __runInitializers(this, _condition_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "DoWhileEndStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        _condition_decorators = [evaluate];
        __esDecorate(null, null, _condition_decorators, { kind: "field", name: "condition", static: false, private: false, access: { has: obj => "condition" in obj, get: obj => obj.condition, set: (obj, value) => { obj.condition = value; } }, metadata: _metadata }, _condition_initializers, _condition_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        DoWhileEndStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.blockType = "do_while";
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return DoWhileEndStatement = _classThis;
})();
export { DoWhileEndStatement };
let FunctionStatement = (() => {
    let _classDecorators = [statement("function", "FUNCTION name(arg1: TYPE) RETURNS INTEGER", "block", "auto", "keyword.function", "name", "parentheses.open", ".*", "parentheses.close", "keyword.returns", "type+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var FunctionStatement = _classThis = class extends _classSuper {
        constructor(tokens, offset = 0) {
            super(tokens);
            tokens = tokens.slice(offset);
            this.args = parseFunctionArguments(tokens.slice(3, -3));
            this.argsRange = this.args.size > 0 ? getTotalRange(tokens.slice(3, -3)) : tokens[2].rangeAfter();
            this.returnType = processTypeData(tokens.at(-1));
            this.returnTypeToken = tokens.at(-1);
            this.nameToken = tokens[1];
            this.name = tokens[1].text;
        }
        runBlock(runtime, node) {
            runtime.defineFunction(this.name, node, this.nameToken.range);
        }
    };
    __setFunctionName(_classThis, "FunctionStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FunctionStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.propagatesControlFlowInterruptions = false;
    (() => {
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
        constructor(tokens, offset = 0) {
            super(tokens);
            tokens = tokens.slice(offset);
            this.args = parseFunctionArguments(tokens.slice(3, -1));
            this.argsRange = this.args.size > 0 ? getTotalRange(tokens.slice(3, -1)) : tokens[2].rangeAfter();
            this.nameToken = tokens[1];
            this.name = tokens[1].text;
        }
        runBlock(runtime, node) {
            runtime.defineFunction(this.name, node, this.nameToken.range);
        }
    };
    __setFunctionName(_classThis, "ProcedureStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ProcedureStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.propagatesControlFlowInterruptions = false;
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ProcedureStatement = _classThis;
})();
export { ProcedureStatement };
let OpenFileStatement = (() => {
    let _classDecorators = [statement("open_file", `OPENFILE "file.txt" FOR READ`, "keyword.open_file", "expr+", "keyword.for", "file_mode")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    let _filename_decorators;
    let _filename_initializers = [];
    let _filename_extraInitializers = [];
    var OpenFileStatement = _classThis = class extends _classSuper {
        run(runtime) {
            const name = runtime.evaluate(this.filename);
            const mode = FileMode(this.mode.type.split("keyword.file_mode.")[1].toUpperCase());
            const file = runtime.fs.openFile(name, ["WRITE", "APPEND"].includes(mode))
                ?? fail(f.quote `File ${name} does not exist.`, this.filename);
            if (runtime.openFiles[name])
                fail(f.quote `File ${name} has already been opened.`, this.filename);
            if (mode == "READ") {
                runtime.openFiles[name] = {
                    ...file,
                    mode,
                    lines: file.text.split("\n").slice(0, -1),
                    lineNumber: 0,
                    openRange: this.range,
                };
            }
            else if (mode == "RANDOM") {
                fail(`Not yet implemented`, this.mode);
            }
            else {
                runtime.openFiles[name] = {
                    name: file.name,
                    text: mode == "APPEND" ? file.text : "",
                    mode,
                    openRange: this.range,
                };
            }
        }
        constructor() {
            super(...arguments);
            this.mode = this.token(3);
            this.filename = __runInitializers(this, _filename_initializers, this.exprT(1, "STRING"));
            __runInitializers(this, _filename_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "OpenFileStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        _filename_decorators = [evaluate];
        __esDecorate(null, null, _filename_decorators, { kind: "field", name: "filename", static: false, private: false, access: { has: obj => "filename" in obj, get: obj => obj.filename, set: (obj, value) => { obj.filename = value; } }, metadata: _metadata }, _filename_initializers, _filename_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        OpenFileStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return OpenFileStatement = _classThis;
})();
export { OpenFileStatement };
let CloseFileStatement = (() => {
    let _classDecorators = [statement("close_file", `CLOSEFILE "file.txt"`, "keyword.close_file", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    let _filename_decorators;
    let _filename_initializers = [];
    let _filename_extraInitializers = [];
    var CloseFileStatement = _classThis = class extends _classSuper {
        run(runtime) {
            const name = runtime.evaluate(this.filename);
            const openFile = runtime.openFiles[name];
            if (openFile) {
                if (["WRITE", "APPEND", "RANDOM"].includes(openFile.mode)) {
                    runtime.fs.updateFile(name, openFile.text);
                }
                runtime.openFiles[name] = undefined;
                runtime.fs.closeFile(name);
            }
            else if (name in runtime.openFiles) {
                fail(f.quote `File ${name} has already been closed, cannot close it again`, this);
            }
            else {
                fail(f.quote `File ${name} was never opened, cannot close it`, this);
            }
        }
        constructor() {
            super(...arguments);
            this.filename = __runInitializers(this, _filename_initializers, this.exprT(1, "STRING"));
            __runInitializers(this, _filename_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "CloseFileStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        _filename_decorators = [evaluate];
        __esDecorate(null, null, _filename_decorators, { kind: "field", name: "filename", static: false, private: false, access: { has: obj => "filename" in obj, get: obj => obj.filename, set: (obj, value) => { obj.filename = value; } }, metadata: _metadata }, _filename_initializers, _filename_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CloseFileStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CloseFileStatement = _classThis;
})();
export { CloseFileStatement };
let ReadFileStatement = (() => {
    let _classDecorators = [statement("read_file", `READFILE "file.txt", OutputVar`, "keyword.read_file", "expr+", "punctuation.comma", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    let _filename_decorators;
    let _filename_initializers = [];
    let _filename_extraInitializers = [];
    var ReadFileStatement = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.filename = __runInitializers(this, _filename_initializers, this.exprT(1, "STRING"));
            this.output = (__runInitializers(this, _filename_extraInitializers), this.expr(3));
        }
        run(runtime) {
            const name = runtime.evaluate(this.filename);
            const data = runtime.getOpenFile(name, ["READ"], `Reading from a file with READFILE`);
            if (data.lineNumber >= data.lines.length)
                fail({
                    summary: `End of file reached`,
                    help: `before attempting to read from the file, check if it has lines left with the EOF function, like "EOF(filename)"`
                }, this);
            const output = runtime.evaluateExpr(this.output, "variable");
            output.value = data.lines[data.lineNumber++];
        }
    };
    __setFunctionName(_classThis, "ReadFileStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        _filename_decorators = [evaluate];
        __esDecorate(null, null, _filename_decorators, { kind: "field", name: "filename", static: false, private: false, access: { has: obj => "filename" in obj, get: obj => obj.filename, set: (obj, value) => { obj.filename = value; } }, metadata: _metadata }, _filename_initializers, _filename_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ReadFileStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ReadFileStatement = _classThis;
})();
export { ReadFileStatement };
let WriteFileStatement = (() => {
    let _classDecorators = [statement("write_file", `WRITEFILE "file.txt", "hello world"`, "keyword.write_file", "expr+", "punctuation.comma", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    let _filename_decorators;
    let _filename_initializers = [];
    let _filename_extraInitializers = [];
    let _data_decorators;
    let _data_initializers = [];
    let _data_extraInitializers = [];
    var WriteFileStatement = _classThis = class extends _classSuper {
        run(runtime) {
            const name = runtime.evaluate(this.filename);
            const data = runtime.getOpenFile(name, ["WRITE", "APPEND"], `Writing to a file with WRITEFILE`);
            data.text += runtime.evaluate(this.data) + "\n";
        }
        constructor() {
            super(...arguments);
            this.filename = __runInitializers(this, _filename_initializers, this.exprT(1, "STRING"));
            this.data = (__runInitializers(this, _filename_extraInitializers), __runInitializers(this, _data_initializers, this.exprT(3, "STRING")));
            __runInitializers(this, _data_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "WriteFileStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        _filename_decorators = [evaluate];
        _data_decorators = [evaluate];
        __esDecorate(null, null, _filename_decorators, { kind: "field", name: "filename", static: false, private: false, access: { has: obj => "filename" in obj, get: obj => obj.filename, set: (obj, value) => { obj.filename = value; } }, metadata: _metadata }, _filename_initializers, _filename_extraInitializers);
        __esDecorate(null, null, _data_decorators, { kind: "field", name: "data", static: false, private: false, access: { has: obj => "data" in obj, get: obj => obj.data, set: (obj, value) => { obj.data = value; } }, metadata: _metadata }, _data_initializers, _data_extraInitializers);
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
    let _filename_decorators;
    let _filename_initializers = [];
    let _filename_extraInitializers = [];
    let _index_decorators;
    let _index_initializers = [];
    let _index_extraInitializers = [];
    var SeekStatement = _classThis = class extends _classSuper {
        run(runtime) {
            const index = runtime.evaluate(this.index);
            if (index < 0)
                fail(`SEEK index must be positive`, this.index);
            const name = runtime.evaluate(this.filename);
            const data = runtime.getOpenFile(name, ["RANDOM"], `SEEK statement`);
            fail(`Not yet implemented`, this);
        }
        constructor() {
            super(...arguments);
            this.filename = __runInitializers(this, _filename_initializers, this.exprT(1, "STRING"));
            this.index = (__runInitializers(this, _filename_extraInitializers), __runInitializers(this, _index_initializers, this.exprT(3, "INTEGER")));
            __runInitializers(this, _index_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "SeekStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        _filename_decorators = [evaluate];
        _index_decorators = [evaluate];
        __esDecorate(null, null, _filename_decorators, { kind: "field", name: "filename", static: false, private: false, access: { has: obj => "filename" in obj, get: obj => obj.filename, set: (obj, value) => { obj.filename = value; } }, metadata: _metadata }, _filename_initializers, _filename_extraInitializers);
        __esDecorate(null, null, _index_decorators, { kind: "field", name: "index", static: false, private: false, access: { has: obj => "index" in obj, get: obj => obj.index, set: (obj, value) => { obj.index = value; } }, metadata: _metadata }, _index_initializers, _index_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SeekStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SeekStatement = _classThis;
})();
export { SeekStatement };
let GetRecordStatement = (() => {
    let _classDecorators = [statement("get_record", `GETRECORD "file.txt", Record`, "keyword.get_record", "expr+", "punctuation.comma", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    let _filename_decorators;
    let _filename_initializers = [];
    let _filename_extraInitializers = [];
    var GetRecordStatement = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.filename = __runInitializers(this, _filename_initializers, this.exprT(1, "STRING"));
            this.variable = (__runInitializers(this, _filename_extraInitializers), this.expr(3));
        }
        run(runtime) {
            const name = runtime.evaluate(this.filename);
            const data = runtime.getOpenFile(name, ["RANDOM"], `GETRECORD statement`);
            const variable = runtime.evaluateExpr(this.variable, "variable");
            fail(`Not yet implemented`, this);
        }
    };
    __setFunctionName(_classThis, "GetRecordStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        _filename_decorators = [evaluate];
        __esDecorate(null, null, _filename_decorators, { kind: "field", name: "filename", static: false, private: false, access: { has: obj => "filename" in obj, get: obj => obj.filename, set: (obj, value) => { obj.filename = value; } }, metadata: _metadata }, _filename_initializers, _filename_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        GetRecordStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return GetRecordStatement = _classThis;
})();
export { GetRecordStatement };
let PutRecordStatement = (() => {
    let _classDecorators = [statement("put_record", `PUTRECORD "file.txt", Record`, "keyword.put_record", "expr+", "punctuation.comma", "expr+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    let _filename_decorators;
    let _filename_initializers = [];
    let _filename_extraInitializers = [];
    var PutRecordStatement = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.filename = __runInitializers(this, _filename_initializers, this.exprT(1, "STRING"));
            this.variable = (__runInitializers(this, _filename_extraInitializers), this.expr(3));
        }
        run(runtime) {
            const name = runtime.evaluate(this.filename);
            const data = runtime.getOpenFile(name, ["RANDOM"], `PUTRECORD statement`);
            const { type, value } = runtime.evaluateExpr(this.variable);
            fail(`Not yet implemented`, this);
        }
    };
    __setFunctionName(_classThis, "PutRecordStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        _filename_decorators = [evaluate];
        __esDecorate(null, null, _filename_decorators, { kind: "field", name: "filename", static: false, private: false, access: { has: obj => "filename" in obj, get: obj => obj.filename, set: (obj, value) => { obj.filename = value; } }, metadata: _metadata }, _filename_initializers, _filename_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PutRecordStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PutRecordStatement = _classThis;
})();
export { PutRecordStatement };
class ClassMemberStatement {
    constructor(tokens) {
        this.accessModifierToken = tokens[0];
        this.accessModifier = this.accessModifierToken.type.split("keyword.class_modifier.")[1];
    }
    run() {
        crash(`Class sub-statements cannot be run normally`);
    }
    runBlock() {
        crash(`Class sub-statements cannot be run normally`);
    }
}
let ClassStatement = (() => {
    let _classDecorators = [statement("class", "CLASS Dog", "block", "auto", "keyword.class", "name")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = TypeStatement;
    var ClassStatement = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.name = this.token(1);
        }
        initializeClass(runtime, branchNode) {
            const classData = new ClassVariableType(false, this);
            for (const node of branchNode.nodeGroups[0]) {
                if (node instanceof ProgramASTBranchNode) {
                    if (node.controlStatements[0] instanceof ClassFunctionStatement || node.controlStatements[0] instanceof ClassProcedureStatement) {
                        const method = node.controlStatements[0];
                        if (classData.ownMethods[method.name]) {
                            fail(f.quote `Duplicate declaration of class method ${method.name}`, method.nameToken, method);
                        }
                        else {
                            node.controlStatements[0];
                            classData.allMethods[method.name] = [
                                classData,
                                classData.ownMethods[method.name] = node
                            ];
                        }
                    }
                    else {
                        console.error({ branchNode, node });
                        crash(`Invalid node in class block`);
                    }
                }
                else if (node instanceof ClassPropertyStatement) {
                    for (const [variable, token] of node.variables) {
                        if (classData.properties[variable]) {
                            fail(f.quote `Duplicate declaration of class property ${variable}`, token, node);
                        }
                        else {
                            classData.properties[variable] = [node.varType, node, token];
                        }
                    }
                    classData.propertyStatements.push(node);
                }
                else {
                    console.error({ branchNode, node });
                    crash(`Invalid node in class block`);
                }
            }
            return classData;
        }
        createTypeBlock(runtime, branchNode) {
            return [this.name.text, this.initializeClass(runtime, branchNode)];
        }
    };
    __setFunctionName(_classThis, "ClassStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ClassStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.allowOnly = new Set(["class_property", "class_procedure", "class_function"]);
    _classThis.propagatesControlFlowInterruptions = false;
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ClassStatement = _classThis;
})();
export { ClassStatement };
let ClassInheritsStatement = (() => {
    let _classDecorators = [statement("class.inherits", "CLASS Dog INHERITS Animal", "block", "keyword.class", "name", "keyword.inherits", "name")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = ClassStatement;
    var ClassInheritsStatement = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.superClassName = this.token(3);
        }
        initializeClass(runtime, branchNode) {
            if (this.superClassName.text == this.name.text)
                fail(`A class cannot inherit from itself`, this.superClassName, this);
            const baseClass = runtime.getClass(this.superClassName.text, this.superClassName.range, this);
            const extensions = super.initializeClass(runtime, branchNode);
            extensions.baseClass = baseClass;
            for (const [key, value] of Object.entries(baseClass.properties)) {
                if (extensions.properties[key]) {
                    fail(f.quote `Property ${key} has already been declared in the base class, cannot declare it again`, extensions.properties[key][2], extensions.properties[key][1]);
                }
                else {
                    extensions.properties[key] = value;
                }
            }
            for (const [name, value] of Object.entries(baseClass.allMethods)) {
                if (!extensions.ownMethods[name]) {
                    extensions.allMethods[name] = value;
                }
            }
            return extensions;
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
let ClassPropertyStatement = (() => {
    let _classDecorators = [statement("class_property", "PUBLIC variable: TYPE", "class_modifier", ".+", "punctuation.colon", "type+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = combineClasses(DeclareStatement, ClassMemberStatement);
    var ClassPropertyStatement = _classThis = class extends _classSuper {
    };
    __setFunctionName(_classThis, "ClassPropertyStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ClassPropertyStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.blockType = "class";
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ClassPropertyStatement = _classThis;
})();
export { ClassPropertyStatement };
let ClassProcedureStatement = (() => {
    let _classDecorators = [statement("class_procedure", "PUBLIC PROCEDURE func(arg1: INTEGER, arg2: pDATE)", "block", "class_modifier", "keyword.procedure", "name", "parentheses.open", ".*", "parentheses.close")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = combineClasses(ProcedureStatement, ClassMemberStatement);
    var ClassProcedureStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens, 1);
            this.methodKeywordToken = this.token(1);
        }
        preRun(group, node) {
            super.preRun(group, node);
            if (this.name == "NEW" && this.accessModifier == "private")
                fail(`Constructors cannot be private, because running private constructors is impossible`, this.accessModifierToken);
        }
    };
    __setFunctionName(_classThis, "ClassProcedureStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ClassProcedureStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.blockType = "class";
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ClassProcedureStatement = _classThis;
})();
export { ClassProcedureStatement };
let ClassProcedureEndStatement = (() => {
    let _classDecorators = [statement("class_procedure.end", "ENDPROCEDURE", "block_end", "keyword.procedure_end")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var ClassProcedureEndStatement = _classThis = class extends _classSuper {
    };
    __setFunctionName(_classThis, "ClassProcedureEndStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ClassProcedureEndStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ClassProcedureEndStatement = _classThis;
})();
export { ClassProcedureEndStatement };
let ClassFunctionStatement = (() => {
    let _classDecorators = [statement("class_function", "PUBLIC FUNCTION func(arg1: INTEGER, arg2: pDATE) RETURNS INTEGER", "block", "class_modifier", "keyword.function", "name", "parentheses.open", ".*", "parentheses.close", "keyword.returns", "type+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = combineClasses(FunctionStatement, ClassMemberStatement);
    var ClassFunctionStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens, 1);
            this.methodKeywordToken = this.token(1);
        }
    };
    __setFunctionName(_classThis, "ClassFunctionStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ClassFunctionStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.blockType = "class";
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ClassFunctionStatement = _classThis;
})();
export { ClassFunctionStatement };
let ClassFunctionEndStatement = (() => {
    let _classDecorators = [statement("class_function.end", "ENDFUNCTION", "block_end", "keyword.function_end")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var ClassFunctionEndStatement = _classThis = class extends _classSuper {
    };
    __setFunctionName(_classThis, "ClassFunctionEndStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ClassFunctionEndStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ClassFunctionEndStatement = _classThis;
})();
export { ClassFunctionEndStatement };
finishStatements();
