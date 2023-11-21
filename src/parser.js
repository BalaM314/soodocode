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
import { getText } from "./lexer.js";
export const statements = {
    startKeyword: {},
    irregular: [],
};
function statement(type, ...args) {
    return function (input) {
        input.type = type;
        if (args[0] == "block") {
            args.unshift();
            input.category = "block";
        }
        else {
            input.category = "normal";
        }
        if (args[0] == "auto" && input.category == "block") {
            args.unshift();
            statement(type + ".end", args[0] + "_end")(//REFACTOR CHECK
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
        return input;
    };
}
export class Statement {
    static check(input) {
        for (let i = this.tokens[0] == "#" ? 1 : 0, j = 0; i < this.tokens.length; i++) {
            if (this.tokens[i] == "...") {
                if (i == this.tokens.length - 1)
                    return true; //Last token is a wildcard
                else
                    throw new Error("todo");
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
    let _classDecorators = [statement("assignment", "#", "name", "operator.assignment", "...")];
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
    let _classDecorators = [statement("output", "keyword.output", "...")];
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
    let _classDecorators = [statement("if", "block", "auto", "keyword.if", "...", "keyword.then")];
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
    let _classDecorators = [statement("while", "block", "auto", "keyword.while", "...")];
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
    let _classDecorators = [statement("function", "block", "auto", "keyword.function", "name", "parentheses.open", "...", "parentheses.close", "keyword.returns", "name")];
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
    let _classDecorators = [statement("procedure", "block", "auto", "keyword.procedure", "name", "parentheses.open", "...", "parentheses.close")];
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
/** `low` and `high` must correspond to the indexes of the lowest and highest elements in the function arguments. */
export function parseFunctionArguments(tokens, low, high) {
    const size = high - low + 1;
    if (!(size != 0 || size % 4 != 3))
        return `Incorrect number of tokens (${size}), must be 0 or 3 above a multiple of 4`;
    const numArgs = Math.ceil(size / 4);
    const args = new Map();
    for (let i = 0; i < numArgs; i++) {
        const name = tokens[low + 4 * i + 0];
        const colon = tokens[low + 4 * i + 1];
        const type = tokens[low + 4 * i + 2];
        const comma = tokens[low + 4 * i + 3];
        if (!name)
            return `Missing name`;
        if (name.type != "name")
            return `Expected a name, got ${name.text} (${name.type})`;
        if (!colon)
            return `Missing colon`;
        if (colon.type != "punctuation.colon")
            return `Expected a name, got ${colon.text} (${colon.type})`;
        if (!type)
            return `Missing type`;
        if (type.type != "name")
            return `Expected a name, got ${type.text} (${type.type})`;
        if (!comma)
            return `Missing comma`;
        if (i == numArgs - 1 && comma.type == "parentheses.close") //Last argument and the 4th token is the closing paren
            return `Expected closing parentheses, got ${comma.text} (${comma.type})`;
        if (i != numArgs - 1 && comma.type == "punctuation.comma") //Not the last argument and the token is a comma
            return `Expected a comma, got ${comma.text} (${comma.type})`;
        args.set(name.text, type.text.toUpperCase());
    }
    return args;
}
export function parse(tokens) {
    const lines = [[]];
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type == "newline") {
            if (i != (tokens.length - 1) && lines.at(-1).length != 0)
                lines.push([]);
        }
        else {
            lines.at(-1).push(tokens[i]);
        }
    }
    const statements = lines.map(parseStatement);
    const program = [];
    function getActiveBuffer() {
        if (blockStack.length == 0)
            return program;
        else
            return blockStack.at(-1).nodes;
    }
    const blockStack = [];
    for (const statement of statements) {
        if (statement.category == "normal") {
            getActiveBuffer().push(statement);
        }
        else if (statement.category == "block") {
            const node = {
                startStatement: statement,
                endStatement: null,
                type: statement.stype,
                nodes: []
            };
            getActiveBuffer().push(node);
            blockStack.push(node);
        }
        else if (statement.category == "block_end") {
            const lastNode = blockStack.at(-1);
            if (!lastNode)
                throw new Error(`Invalid statement ${stringifyStatement(statement)}: no open blocks`);
            else if (lastNode.startStatement.stype == statement.stype.split(".")[0]) { //probably bad code
                lastNode.endStatement = statement;
                blockStack.pop();
            }
            else
                throw new Error(`Invalid statement ${stringifyStatement(statement)}: current block is of type ${lastNode.startStatement.type}`);
        }
    }
    if (blockStack.length)
        throw new Error(`There were unclosed blocks: ${stringifyStatement(blockStack.at(-1).startStatement)}`);
    return program;
}
/**
 * Parses a string of tokens into a Statement.
 * @argument tokens must not contain any newlines.
 **/
export function parseStatement(tokens) {
    const statement = getStatement(tokens);
    if (typeof statement == "string")
        throw new Error(`Invalid line ${tokens.map(t => t.type).join(" ")}: ${statement}`);
    return new statement(tokens);
}
export function getStatement(tokens) {
    if (tokens.length < 1)
        return "Empty statement";
    let possibleStatements;
    if (tokens[0].type in statements.startKeyword)
        possibleStatements = [statements.startKeyword[tokens[0].type]];
    else
        possibleStatements = statements.irregular;
    if (possibleStatements.length == 0)
        return `No possible statements`;
    let errors = [];
    for (const possibleStatement of possibleStatements) {
        const result = possibleStatement.check(tokens);
        if (Array.isArray(result))
            errors.push(result);
        else
            return possibleStatement;
    }
    let maxError = errors[0];
    for (const error of errors) {
        if (error[1] > maxError[1])
            maxError = error;
    }
    return maxError[0];
}
export function stringifyStatement(statement) {
    return statement.tokens.map(t => t.text).join(" ");
}
const operators = [["multiply", "divide"], ["add", "subtract"]].reverse();
export function parseExpression(input) {
    //If there is only one token
    if (input.length == 1) {
        if (input[0].type == "number.decimal") //and it's a number
            return input[0]; //nothing to parse, just return the number
        else
            throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: not a number`);
    }
    //If the whole expression is surrounded by parentheses, parse the inner expression
    if (input[0]?.type == "parentheses.open" && input.at(-1)?.type == "parentheses.close")
        return parseExpression(input.slice(1, -1));
    //Go through P E M-D A-S in reverse order to find the operator with the lowest priority
    for (const operatorsOfPriority of operators) {
        let parenNestLevel = 0;
        //Find the index of the last (lowest priority) operator of the current priority
        //Iterate through string backwards
        for (let i = input.length - 1; i >= 0; i--) {
            //Handle parentheses
            //The string is being iterated through backwards, so ) means go up a level and ( means go down a level
            if (input[i].type == "parentheses.close")
                parenNestLevel++;
            else if (input[i].type == "parentheses.open")
                parenNestLevel--;
            if (parenNestLevel < 0)
                //nest level going below 0 means too many (, so unclosed parens
                throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: unclosed parentheses`);
            if (parenNestLevel == 0 && //the operator is not inside parentheses and
                operatorsOfPriority.map(o => `operator.${o}`).includes(input[i].type) //it is currently being searched for
            ) {
                //this is the lowest priority operator in the expression and should become the root node
                const left = input.slice(0, i);
                const right = input.slice(i + 1);
                //Make sure there is something on left and right of the operator
                if (left.length == 0)
                    throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no expression on left side of operator ${input[i].text}`);
                if (right.length == 0)
                    throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no expression on right side of operator ${input[i].text}`);
                return {
                    token: input[i],
                    nodes: [parseExpression(left), parseExpression(right)]
                };
            }
        }
        //Nest level being above zero at the end of the string means too many )
        if (parenNestLevel != 0)
            throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no parentheses group to close`);
        //No operators of the current priority found, look for operator with the next level higher priority
    }
    //No operators found at all, something went wrong
    throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no operators found`);
}
