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
import { tokenTextMapping, TokenType } from "../lexer/index.js";
import { ProgramASTBranchNodeType } from "../parser/index.js";
import { crash, errorBoundary, forceType } from "../utils/funcs.js";
import { StatementType } from "./statement-types.js";
import { Statement } from "./statement.js";
import { statements } from "./registry.js";
if (!Symbol.metadata)
    Object.defineProperty(Symbol, "metadata", {
        writable: false,
        enumerable: false,
        configurable: false,
        value: Symbol("Symbol.metadata")
    });
export function statement(type, example, ...args) {
    return function (input, context) {
        var _a, _b, _c, _d, _e, _f, _g;
        input.type = type;
        input.example = example;
        forceType(context.metadata);
        input.evaluatableFields = (context.metadata.evaluatableFields ?? []);
        context.metadata.done = true;
        if (args[0] == "block" || args[0] == "block_end" || args[0] == "block_multi_split") {
            input.category = args[0];
            args.shift();
        }
        else {
            input.category = "normal";
        }
        if (args[0] == "auto" && input.category == "block") {
            args.shift();
            let __endStatement = (() => {
                let _classDecorators = [statement(StatementType(type + ".end"), tokenTextMapping[TokenType(args[0] + "_end")] ?? "[unknown]", "block_end", TokenType(args[0] + "_end"))];
                let _classDescriptor;
                let _classExtraInitializers = [];
                let _classThis;
                let _classSuper = Statement;
                var __endStatement = _classThis = class extends _classSuper {
                };
                __setFunctionName(_classThis, "__endStatement");
                (() => {
                    const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
                    __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
                    __endStatement = _classThis = _classDescriptor.value;
                    if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
                })();
                _classThis.blockType = ProgramASTBranchNodeType(type);
                (() => {
                    __runInitializers(_classThis, _classExtraInitializers);
                })();
                return __endStatement = _classThis;
            })();
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
        input.tokens = args;
        const { run, runBlock } = input.prototype;
        input.prototype.run = errorBoundary()(run);
        input.prototype.runBlock = errorBoundary()(runBlock);
        if (statements.byType[type])
            crash(`Invalid statement definitions! Statement for type ${type} already registered`);
        statements.byType[type] = input;
        return input;
    };
}
export function finishStatements() {
    statements.irregular.sort((a, b) => a.tokensSortScore() - b.tokensSortScore());
}
export function evaluate(_, context) {
    var _a;
    forceType(context.metadata);
    if (context.metadata.done) {
        const evaluatableFields = context.metadata.evaluatableFields ?? [];
        Object.setPrototypeOf(context.metadata, null);
        context.metadata.evaluatableFields = evaluatableFields.slice();
    }
    ((_a = context.metadata).evaluatableFields ?? (_a.evaluatableFields = [])).push(context.name);
}
