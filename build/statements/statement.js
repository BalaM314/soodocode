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
import { Token } from "../lexer/lexer-types.js";
import { ExpressionASTNodes, ExpressionASTTypeNodes } from "../parser/parser-types.js";
import { TypedNodeValue, UntypedNodeValue } from "../runtime/runtime-types.js";
import { Abstract, crash, fail, getTotalRange } from "../utils/funcs.js";
import { StatementType } from "./statement-types.js";
import { statements } from "./registry.js";
let Statement = (() => {
    let _classDecorators = [Abstract];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var Statement = _classThis = class {
        constructor(nodes) {
            this.nodes = nodes;
            this.range = getTotalRange(this.nodes);
            this.preRunDone = false;
            this.type = new.target;
            this.stype = this.type.type;
            this.category = this.type.category;
        }
        token(ind) {
            const node = this.nodes.at(ind);
            if (node instanceof Token)
                return node;
            else
                crash(`Assertion failed: node at index ${ind} was not a token`);
        }
        tokens(from, to) {
            const tokens = this.nodes.slice(from, to);
            tokens.forEach((t, i) => t instanceof Token || crash(`Assertion failed: node at index ${i} was not a token`));
            return tokens;
        }
        tokenT(ind, type) {
            return new TypedNodeValue(this.token(ind), type);
        }
        expr(ind, allowed = "expr", error) {
            if (allowed === "type")
                allowed = ExpressionASTTypeNodes;
            if (allowed === "expr")
                allowed = ExpressionASTNodes;
            if (allowed.some(c => this.nodes.at(ind) instanceof c))
                return this.nodes.at(ind);
            if (error != undefined)
                fail(error, this.nodes.at(ind));
            else
                crash(`Assertion failed: node at index ${ind} was not an expression`);
        }
        exprT(ind, type) {
            if (type)
                return new TypedNodeValue(this.expr(ind), type);
            else
                return new UntypedNodeValue(this.expr(ind));
        }
        fmtText() {
            return this.nodes.map(t => t.fmtText()).join(" ");
        }
        fmtDebug() {
            return this.nodes.map(t => t.fmtDebug()).join(" ");
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
        static tokensSortScore({ tokens, invalidMessage } = this) {
            return invalidMessage != null ? tokens.filter(t => [".*", ".+", "expr+", "type+"].includes(t)).length * 100 - tokens.length : 10000;
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
        preRun(group, node) {
            if (this.type.requiresScope)
                group.requiresScope = true;
            if (this.type.interruptsControlFlow)
                group.hasReturn = true;
            for (const field of this.type.evaluatableFields) {
                const nodeValue = this[field];
                if (!(nodeValue instanceof TypedNodeValue || nodeValue instanceof UntypedNodeValue))
                    crash(`Decorated invalid field ${field}`);
                nodeValue.init();
            }
        }
        triggerPreRun(group, node) {
            if (!this.preRunDone)
                this.preRun(group, node);
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
    _classThis.type = null;
    _classThis.category = null;
    _classThis.example = null;
    _classThis.tokens = null;
    _classThis.suppressErrors = false;
    _classThis.blockType = null;
    _classThis.allowOnly = null;
    _classThis.invalidMessage = null;
    _classThis.requiresScope = false;
    _classThis.interruptsControlFlow = false;
    _classThis.propagatesControlFlowInterruptions = true;
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Statement = _classThis;
})();
export { Statement };
