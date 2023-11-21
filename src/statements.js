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
export const statements = {
    startKeyword: {},
    irregular: [],
};
function statement(type, ...args) {
    return function (input) {
        input.type = type;
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
        input.tokens = args;
        return input;
    };
}
export class Statement {
    static check(input) {
        for (let i = this.tokens[0] == "#" ? 1 : 0, j = 0; i < this.tokens.length; i++) {
            if (this.tokens[i] == ".+" || this.tokens[i] == ".*") {
                const allowEmpty = this.tokens[i] == ".*";
                if (i == this.tokens.length - 1)
                    return true; //Last token is a wildcard
                else {
                    let anyTokensSkipped = false;
                    while (this.tokens[i + 1] != input[j].type) {
                        j++;
                        anyTokensSkipped = true;
                        if (j == input.length)
                            return [`Expected a ${this.tokens[i + 1]}, but none were found`, 4];
                    }
                    if (!anyTokensSkipped && !allowEmpty)
                        return [`Expected one or more tokens, but found zero`, 6];
                }
            }
            else if (this.tokens[i] == "#")
                throw new Error(`absurd`);
            else if (this.tokens[i] == input[j].type)
                j++; //Token matches, move to next one
            else
                return [`Expected a ${this.tokens[i]}, got "${input[j].text}" (${input[j].type})`, 5];
        }
        return true;
    }
    constructor(tokens) {
        this.tokens = tokens;
        this.type = this.constructor;
        this.stype = this.type.type;
        this.category = this.type.category;
    }
    toString() {
        return this.tokens.map(t => t.text).join(" ");
    }
}
Statement.tokens = null;
let DeclarationStatement = (() => {
    let _classDecorators = [statement("declaration", "keyword.declare")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var DeclarationStatement = _classThis = class extends _classSuper {
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
let AssignmentStatement = (() => {
    let _classDecorators = [statement("assignment", "#", "name", "operator.assignment", ".+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var AssignmentStatement = _classThis = class extends _classSuper {
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
    let _classDecorators = [statement("output", "keyword.output", ".+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var OutputStatement = _classThis = class extends _classSuper {
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
    let _classDecorators = [statement("input", "keyword.input", "name")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var InputStatement = _classThis = class extends _classSuper {
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
    let _classDecorators = [statement("return", "keyword.return")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var ReturnStatement = _classThis = class extends _classSuper {
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
let IfStatement = (() => {
    let _classDecorators = [statement("if", "block", "auto", "keyword.if", ".+", "keyword.then")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var IfStatement = _classThis = class extends _classSuper {
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
let ForStatement = (() => {
    let _classDecorators = [statement("for", "block", "auto", "keyword.for", "name", "operator.assignment", "number.decimal", "keyword.to", "number.decimal")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var ForStatement = _classThis = class extends _classSuper {
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
})(); //TODO fix endfor: should be `NEXT i`, not `NEXT`
export { ForStatement };
let WhileStatement = (() => {
    let _classDecorators = [statement("while", "block", "auto", "keyword.while", ".+")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var WhileStatement = _classThis = class extends _classSuper {
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
    let _classDecorators = [statement("dowhile", "block", "auto", "keyword.dowhile")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var DoWhileStatement = _classThis = class extends _classSuper {
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
let FunctionStatement = (() => {
    let _classDecorators = [statement("function", "block", "auto", "keyword.function", "name", "parentheses.open", ".*", "parentheses.close", "keyword.returns", "name")];
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
let ProcedueStatement = (() => {
    let _classDecorators = [statement("procedure", "block", "auto", "keyword.procedure", "name", "parentheses.open", ".*", "parentheses.close")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var ProcedueStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            const args = parseFunctionArguments(tokens, 3, tokens.length - 2);
            if (typeof args == "string")
                throw new Error(`Invalid function arguments: ${args}`);
            this.args = args;
        }
    };
    __setFunctionName(_classThis, "ProcedueStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ProcedueStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ProcedueStatement = _classThis;
})();
export { ProcedueStatement };
