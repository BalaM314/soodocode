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
import { preprocessedBuiltinFunctions } from "./builtin_functions.js";
import { configs } from "./config.js";
import { Token, TokenType } from "./lexer-types.js";
import { tokenTextMapping } from "./lexer.js";
import { ExpressionASTFunctionCallNode, ProgramASTBranchNode, ProgramASTBranchNodeType } from "./parser-types.js";
import { expressionLeafNodeTypes, isLiteral, parseExpression, parseFunctionArguments, processTypeData } from "./parser.js";
import { ClassVariableType, EnumeratedVariableType, FileMode, PointerVariableType, PrimitiveVariableType, RecordVariableType, SetVariableType } from "./runtime-types.js";
import { Runtime } from "./runtime.js";
import { Abstract, combineClasses, crash, f, fail, getTotalRange, getUniqueNamesFromCommaSeparatedTokenList, splitTokensOnComma } from "./utils.js";
export const statementTypes = [
    "declare", "define", "constant", "assignment", "output", "input", "return", "call",
    "type", "type.pointer", "type.enum", "type.set", "type.end",
    "if", "if.end", "else",
    "switch", "switch.end", "case", "case.range",
    "for", "for.step", "for.end",
    "while", "while.end",
    "dowhile", "dowhile.end",
    "function", "function.end",
    "procedure", "procedure.end",
    "openfile", "readfile", "writefile", "closefile",
    "seek", "getrecord", "putrecord",
    "class", "class.inherits", "class.end",
    "class_property",
    "class_procedure", "class_procedure.end",
    "class_function", "class_function.end",
    "illegal.assignment", "illegal.end", "illegal.for.end"
];
export function StatementType(input) {
    if (statementTypes.includes(input))
        return input;
    crash(`"${input}" is not a valid statement type`);
}
export const statements = {
    byStartKeyword: {},
    byType: {},
    irregular: [],
};
let Statement = (() => {
    let _classDecorators = [Abstract];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Statement = _classThis = class {
        constructor(tokens) {
            this.tokens = tokens;
            this.preRunDone = false;
            this.type = new.target;
            this.stype = this.type.type;
            this.category = this.type.category;
            this.range = getTotalRange(tokens);
        }
        fmtText() {
            return this.tokens.map(t => t.fmtText()).join(" ");
        }
        fmtDebug() {
            return this.tokens.map(t => t.fmtDebug()).join(" ");
        }
        static blockEndStatement() {
            if (this.category != "block")
                crash(`Statement ${this.type} has no block end statement because it is not a block statement`);
            return statements.byType[StatementType(this.type.split(".")[0] + ".end")];
        }
        example() {
            return this.type.example;
        }
        static supportsSplit(block, statement) {
            return true;
        }
        static checkBlock(block) {
        }
        static typeName(type = this.type) {
            if (!type)
                crash(`Argument must be specified when calling typeName() on base Statement`);
            return {
                "declare": "DECLARE",
                "define": "DEFINE",
                "constant": "CONSTANT",
                "assignment": "Assignment",
                "output": "OUTPUT",
                "input": "INPUT",
                "return": "RETURN",
                "call": "CALL",
                "type": "TYPE (record)",
                "type.pointer": "TYPE (pointer)",
                "type.enum": "TYPE (enum)",
                "type.set": "TYPE (set)",
                "type.end": "ENDTYPE",
                "if": "IF",
                "if.end": "ENDIF",
                "else": "ELSE",
                "switch": "CASE OF",
                "switch.end": "ENDCASE",
                "case": "Case branch",
                "case.range": "Case branch (range)",
                "for": "FOR",
                "for.step": "FOR (step)",
                "for.end": "NEXT",
                "while": "WHILE",
                "while.end": "ENDWHILE",
                "dowhile": "REPEAT",
                "dowhile.end": "UNTIL",
                "function": "FUNCTION",
                "function.end": "ENDFUNCTION",
                "procedure": "PROCEDURE",
                "procedure.end": "ENDPROCEDURE",
                "openfile": "OPENFILE",
                "readfile": "READFILE",
                "writefile": "WRITEFILE",
                "closefile": "CLOSEFILE",
                "seek": "SEEK",
                "getrecord": "GETRECORD",
                "putrecord": "PUTRECORD",
                "class": "CLASS",
                "class.inherits": "CLASS (inherits)",
                "class.end": "ENDCLASS",
                "class_property": "Class property",
                "class_procedure": "Class procedure",
                "class_procedure.end": "ENDPROCEDURE (class)",
                "class_function": "Class function",
                "class_function.end": "ENDFUNCTION (class)",
            }[type] ?? "unknown statement";
        }
        static tokensSortScore({ tokens } = this) {
            return tokens.filter(t => [".*", ".+", "expr+", "type+"].includes(t)).length * 100 - tokens.length;
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
        cacheValues(node) { }
        preRun(node) {
            if (!this.preRunDone)
                this.cacheValues(node);
            this.preRunDone = true;
        }
    };
    __setFunctionName(_classThis, "Statement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Statement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.category = null;
    _classThis.example = null;
    _classThis.tokens = null;
    _classThis.suppressErrors = false;
    _classThis.blockType = null;
    _classThis.allowOnly = null;
    _classThis.invalidMessage = null;
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Statement = _classThis;
})();
export { Statement };
function statement(type, example, ...args) {
    return function (input) {
        var _a, _b, _c, _d, _e, _f, _g;
        var _h;
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
            statement(StatementType(type + ".end"), tokenTextMapping[TokenType(args[0] + "_end")] ?? "[unknown]", "block_end", TokenType(args[0] + "_end"))((_h = class __endStatement extends Statement {
                },
                _h.blockType = ProgramASTBranchNodeType(type),
                _h));
        }
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
            switch (firstToken) {
                case ".":
                case ".*":
                case ".+":
                case "expr+":
                case "type+":
                case "literal":
                case "literal|otherwise":
                    crash(`Invalid statement definitions! Statements starting with matcher ${firstToken} must be irregular`);
                    break;
                case "class_modifier":
                    ((_a = statements.byStartKeyword)["keyword.class_modifier.private"] ?? (_a["keyword.class_modifier.private"] = [])).push(input);
                    ((_b = statements.byStartKeyword)["keyword.class_modifier.public"] ?? (_b["keyword.class_modifier.public"] = [])).push(input);
                    break;
                case "file_mode":
                    ((_c = statements.byStartKeyword)["keyword.file_mode.read"] ?? (_c["keyword.file_mode.read"] = [])).push(input);
                    ((_d = statements.byStartKeyword)["keyword.file_mode.write"] ?? (_d["keyword.file_mode.write"] = [])).push(input);
                    ((_e = statements.byStartKeyword)["keyword.file_mode.append"] ?? (_e["keyword.file_mode.append"] = [])).push(input);
                    ((_f = statements.byStartKeyword)["keyword.file_mode.random"] ?? (_f["keyword.file_mode.random"] = [])).push(input);
                    break;
                default:
                    ((_g = statements.byStartKeyword)[firstToken] ?? (_g[firstToken] = [])).push(input);
            }
        }
        if (statements.byType[type])
            crash(`Invalid statement definitions! Statement for type ${type} already registered`);
        statements.byType[type] = input;
        input.tokens = args;
        return input;
    };
}
function finishStatements() {
    statements.irregular.sort((a, b) => (a.invalidMessage ? 1 : 0) - (b.invalidMessage ? 1 : 0));
}
export class TypeStatement extends Statement {
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
        constructor(tokens) {
            super(tokens);
            this.variables = [];
            this.variables = getUniqueNamesFromCommaSeparatedTokenList(tokens.slice(1, -2), tokens.at(-2)).map(t => [t.text, t]);
            this.varType = processTypeData(tokens.at(-1));
        }
        run(runtime) {
            const varType = runtime.resolveVariableType(this.varType);
            if (varType instanceof SetVariableType)
                fail(`Cannot declare a set variable with the DECLARE statement, please use the DEFINE statement`, this.tokens.at(-1));
            for (const [variable, token] of this.variables) {
                if (runtime.getCurrentScope().variables[variable])
                    fail(`Variable ${variable} was already declared`, token);
                runtime.getCurrentScope().variables[variable] = {
                    type: varType,
                    value: varType.getInitValue(runtime, configs.initialization.normal_variables_default.value),
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
            const [_constant, name, _equals, expr] = tokens;
            this.name = name.text;
            this.expr = expr;
        }
        run(runtime) {
            if (runtime.getVariable(this.name))
                fail(`Constant ${this.name} was already declared`, this);
            const { type, value } = Runtime.evaluateToken(this.expr);
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
    let _classDecorators = [statement("define", "DEFINE PrimesBelow20 (2, 3, 5, 7, 11, 13, 17, 19): myIntegerSet", "keyword.define", "name", "parentheses.open", ".*", "parentheses.close", "punctuation.colon", "name")];
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
                value: this.values.map(t => Runtime.evaluateToken(t, type.baseType).value)
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
    let _classSuper = TypeStatement;
    var TypePointerStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            let targetType;
            [, { text: this.name }, , , targetType] = tokens;
            this.targetType = processTypeData(targetType);
        }
        createType(runtime) {
            return [this.name, new PointerVariableType(false, this.name, this.targetType)];
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
        constructor(tokens) {
            super(tokens);
            this.name = tokens[1];
            this.values = getUniqueNamesFromCommaSeparatedTokenList(tokens.slice(4, -1), tokens.at(-1));
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
        constructor(tokens) {
            super(tokens);
            this.name = tokens[1];
            this.setType = PrimitiveVariableType.get(tokens[5].text) ?? fail(`Sets of non-primitive types are not supported.`, tokens[5]);
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
        constructor(tokens) {
            super(tokens);
            this.name = tokens[1];
        }
        createTypeBlock(runtime, node) {
            const fields = {};
            for (const statement of node.nodeGroups[0]) {
                if (!(statement instanceof DeclareStatement))
                    fail(`Statements in a record type block can only be declaration statements`, statement);
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
                fail(f.quote `Cannot assign to literal token ${this.target}`, this.target, this);
        }
        run(runtime) {
            if (this.target instanceof Token && !runtime.getVariable(this.target.text)) {
                const { type, value } = runtime.evaluateExpr(this.expr);
                if (type instanceof ClassVariableType) {
                    if (configs.statements.auto_declare_classes.value) {
                        runtime.getCurrentScope().variables[this.target.text] = {
                            type, value, declaration: this, mutable: true,
                        };
                    }
                    else
                        fail(f.quote `Variable ${this.target.text} does not exist\n` + configs.statements.auto_declare_classes.errorHelp, this.target);
                }
                else
                    runtime.handleNonexistentVariable(this.target.text, this.target);
            }
            runtime.assignExpr(this.target, this.expr);
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
        constructor(tokens) {
            super(tokens);
            this.outMessage = splitTokensOnComma(tokens.slice(1)).map(parseExpression);
        }
        run(runtime) {
            runtime._output(this.outMessage.map(expr => runtime.evaluateExpr(expr)));
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
            const variable = runtime.getVariable(this.name) ?? runtime.handleNonexistentVariable(this.name, this.tokens[1].range);
            if (!variable.mutable)
                fail(`Cannot INPUT ${this.name} because it is a constant`, this.tokens[1]);
            const input = runtime._input(f.text `Enter the value for variable "${this.name}" (type: ${variable.type})`, variable.type);
            switch (variable.type) {
                case PrimitiveVariableType.BOOLEAN:
                    variable.value = input.toLowerCase() != "false";
                    break;
                case PrimitiveVariableType.INTEGER: {
                    const value = Number(input);
                    if (isNaN(value))
                        fail(`input was an invalid number`, this);
                    if (!Number.isSafeInteger(value))
                        fail(`input was an invalid integer`, this);
                    variable.value = value;
                    break;
                }
                case PrimitiveVariableType.REAL: {
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
    var ReturnStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.expr = tokens[1];
        }
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
                value: runtime.evaluateExpr(this.expr, runtime.resolveVariableType(type)).value
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
                fail(`CALL can only be used to call functions or procedures`, tokens[1]);
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
                    fail(`CALL cannot be used on functions according to Cambridge.\n${configs.statements.call_functions.errorHelp}`, this.func);
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
    var IfStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.condition = tokens[1];
        }
        runBlock(runtime, node) {
            if (runtime.evaluateExpr(this.condition, PrimitiveVariableType.BOOLEAN).value) {
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
    var SwitchStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            [, , this.expression] = tokens;
        }
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
            const { type: switchType, value: switchValue } = runtime.evaluateExpr(this.expression);
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
            if (!CaseBranchRangeStatement.allowedTypes.includes(tokens[0].type))
                fail(`Token of type ${tokens[0].type} is not valid in range cases: expected a number or character`, tokens[0]);
            if (tokens[2].type != tokens[0].type)
                fail(`Token of type ${tokens[2].type} does not match the other range bound: expected a ${tokens[0].type}`, tokens[2]);
            this.upperBound = tokens[2];
        }
        branchMatches(switchType, switchValue) {
            if (this.value.type == "keyword.otherwise")
                return true;
            const { value: lValue } = Runtime.evaluateToken(this.value, switchType);
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
    var ForStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.name = tokens[1].text;
            this.fromExpr = tokens[3];
            this.toExpr = tokens[5];
        }
        cacheValues(node) {
            this.from = Runtime.evaluateExpr(this.fromExpr, PrimitiveVariableType.INTEGER)?.value;
            this.to = Runtime.evaluateExpr(this.toExpr, PrimitiveVariableType.INTEGER)?.value;
            this.empty = node.nodeGroups[0].length == 0;
            const endStatement = node.controlStatements[1];
            if (endStatement.name !== this.name)
                fail(f.quote `Incorrect NEXT statement: expected variable ${this.name} from for loop, got variable ${endStatement.name}`, endStatement.varToken);
        }
        getStep(runtime) {
            return 1;
        }
        runBlock(runtime, node) {
            const from = this.from ?? runtime.evaluateExpr(this.fromExpr, PrimitiveVariableType.INTEGER).value;
            const to = this.to ?? runtime.evaluateExpr(this.toExpr, PrimitiveVariableType.INTEGER).value;
            const step = this.getStep(runtime);
            const direction = Math.sign(step);
            if (direction == 0)
                fail(`Invalid FOR statement: step cannot be zero`, this.stepToken);
            if (direction == 1 && to < from ||
                direction == -1 && from < to)
                return;
            for (let i = from; direction == 1 ? i <= to : i >= to; i += step) {
                if (this.empty) {
                    const result = runtime.runBlock(node.nodeGroups[0], {
                        statement: this,
                        opaque: false,
                        variables: {
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
                else {
                    runtime.statementExecuted(this);
                }
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
        cacheValues() {
            this.step = Runtime.evaluateExpr(this.stepToken, PrimitiveVariableType.INTEGER)?.value;
        }
        getStep(runtime) {
            return runtime.evaluateExpr(this.stepToken, PrimitiveVariableType.INTEGER).value;
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
            this.varToken = tokens[1];
            this.name = tokens[1].text;
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
    var WhileStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            this.condition = tokens[1];
        }
        runBlock(runtime, node) {
            while (runtime.evaluateExpr(this.condition, PrimitiveVariableType.BOOLEAN).value) {
                const result = runtime.runBlock(node.nodeGroups[0], {
                    statement: this,
                    opaque: false,
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
            do {
                const result = runtime.runBlock(node.nodeGroups[0], {
                    statement: this,
                    opaque: false,
                    variables: {},
                    types: {},
                });
                if (result)
                    return result;
            } while (!runtime.evaluateExpr(node.controlStatements[1].condition, PrimitiveVariableType.BOOLEAN).value);
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
    })();
    _classThis.blockType = "dowhile";
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
            if (this.name in runtime.functions)
                fail(`Duplicate function definition for ${this.name}`, this.nameToken);
            else if (this.name in preprocessedBuiltinFunctions)
                fail(`Function ${this.name} is already defined as a builtin function`, this.nameToken);
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
        constructor(tokens, offset = 0) {
            super(tokens);
            tokens = tokens.slice(offset);
            this.args = parseFunctionArguments(tokens.slice(3, -1));
            this.argsRange = this.args.size > 0 ? getTotalRange(tokens.slice(3, -1)) : tokens[2].rangeAfter();
            this.name = tokens[1].text;
        }
        runBlock(runtime, node) {
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
            const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING).value;
            const mode = FileMode(this.mode.type.split("keyword.file_mode.")[1].toUpperCase());
            const file = runtime.fs.getFile(name, mode == "WRITE") ?? fail(f.quote `File ${name} does not exist.`, this);
            if (mode == "READ") {
                runtime.openFiles[name] = {
                    file,
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
                if (mode == "WRITE")
                    file.text = "";
                runtime.openFiles[name] = {
                    file,
                    mode,
                    openRange: this.range,
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
            const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING).value;
            if (runtime.openFiles[name])
                runtime.openFiles[name] = undefined;
            else if (name in runtime.openFiles)
                fail(f.quote `Cannot close file ${name}, because it has already been closed.`, this);
            else
                fail(f.quote `Cannot close file ${name}, because it was never opened.`, this);
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
            const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING).value;
            const data = runtime.getOpenFile(name, ["READ"], `Reading from a file with READFILE`);
            if (data.lineNumber >= data.lines.length)
                fail(`End of file reached\nhelp: before attempting to read from the file, check if it has lines left with EOF(filename)`, this);
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
            const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING).value;
            const data = runtime.getOpenFile(name, ["WRITE", "APPEND"], `Writing to a file with WRITEFILE`);
            data.file.text += runtime.evaluateExpr(this.data, PrimitiveVariableType.STRING).value + "\n";
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
            const index = runtime.evaluateExpr(this.index, PrimitiveVariableType.INTEGER).value;
            if (index < 0)
                fail(`SEEK index must be positive`, this.index);
            const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING).value;
            const data = runtime.getOpenFile(name, ["RANDOM"], `SEEK statement`);
            fail(`Not yet implemented`, this);
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
            const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING).value;
            const data = runtime.getOpenFile(name, ["RANDOM"], `GETRECORD statement`);
            const variable = runtime.evaluateExpr(this.variable, "variable");
            fail(`Not yet implemented`, this);
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
            const name = runtime.evaluateExpr(this.filename, PrimitiveVariableType.STRING).value;
            const data = runtime.getOpenFile(name, ["RANDOM"], `PUTRECORD statement`);
            const { type, value } = runtime.evaluateExpr(this.variable);
            fail(`Not yet implemented`, this);
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
        constructor(tokens) {
            super(tokens);
            this.name = tokens[1];
        }
        initializeClass(runtime, branchNode) {
            const classData = new ClassVariableType(false, this);
            for (const node of branchNode.nodeGroups[0]) {
                if (node instanceof ProgramASTBranchNode) {
                    if (node.controlStatements[0] instanceof ClassFunctionStatement || node.controlStatements[0] instanceof ClassProcedureStatement) {
                        const method = node.controlStatements[0];
                        if (classData.ownMethods[method.name]) {
                            fail(f.quote `Duplicate declaration of class method ${method.name}`, this, classData.ownMethods[method.name]);
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
                            fail(f.quote `Duplicate declaration of class property ${variable}`, token, classData.properties[variable][1]);
                        }
                        else {
                            classData.properties[variable] = [node.varType, node];
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
    _classThis.allowOnly = new Set(["class_property", "class_procedure", "class_function", "class.end"]);
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
        constructor(tokens) {
            super(tokens);
            this.superClassName = tokens[3];
        }
        initializeClass(runtime, branchNode) {
            if (this.superClassName.text == this.name.text)
                fail(`A class cannot inherit from itself`, this.superClassName);
            const baseClass = runtime.getClass(this.superClassName.text, this.superClassName.range);
            const extensions = super.initializeClass(runtime, branchNode);
            extensions.baseClass = baseClass;
            for (const [key, value] of Object.entries(baseClass.properties)) {
                if (extensions.properties[key]) {
                    fail(f.quote `Property ${key} has already been defined in base class ${this.superClassName.text}`, extensions.properties[key][1]);
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
            this.methodKeywordToken = tokens[1];
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
            this.methodKeywordToken = tokens[1];
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
