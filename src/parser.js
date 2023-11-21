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
const statements = {
    startKeyword: {},
    irregular: [],
};
function statement(...tokens) {
    return function (input, context) {
        if (tokens.length < 1)
            throw new Error(`All statements must contain at least one token`);
        if (tokens[0] == "#") {
            statements.irregular.push(input);
        }
        else {
            if (statements.startKeyword[tokens[0]])
                throw new Error(`Statement starting with ${tokens[0]} already registered`); //TODO overloads, eg FOR STEP
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
    }
    toString() {
        return this.tokens.map(t => t.text).join(" ");
    }
}
Statement.tokens = null;
let FunctionStatement = (() => {
    let _classDecorators = [statement("keyword.function", "name", "parentheses.open", "...", "parentheses.close", "keyword.returns", "name")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Statement;
    var FunctionStatement = _classThis = class extends _classSuper {
        constructor(tokens) {
            super(tokens);
            if (tokens.length >= 6 &&
                //tokens[0] is the keyword function, which was used to determine the statement type
                tokens[1].type == "name" &&
                tokens[2].type == "parentheses.open" &&
                //variable number of arguments
                tokens.at(-3).type == "parentheses.close" &&
                tokens.at(-2).type == "keyword.returns" &&
                tokens.at(-1).type == "name") {
                this.args = parseFunctionArguments(tokens, 3, tokens.length - 4);
                this.returnType = tokens.at(-1).text.toUpperCase();
            }
            else
                throw new Error("Invalid statement");
        }
    };
    __setFunctionName(_classThis, "FunctionStatement");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        FunctionStatement = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.type = "function";
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return FunctionStatement = _classThis;
})();
export { FunctionStatement };
let AssignmentStatement = (() => {
    let _classDecorators = [statement("#", "name", "operator.assignment", "...")];
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
    })();
    _classThis.type = "assignment";
    (() => {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AssignmentStatement = _classThis;
})();
/** `low` and `high` must correspond to the indexes of the lowest and highest elements in the function arguments. */
export function parseFunctionArguments(tokens, low, high) {
    const size = high - low + 1;
    if (!(size != 0 || size % 4 != 3))
        throw new Error(`Invalid function arguments: incorrect number of tokens (${size}), must be 0 or 3 above a multiple of 4`);
    const numArgs = Math.ceil(size / 4);
    const args = new Map();
    for (let i = 0; i < numArgs; i++) {
        const name = tokens[low + 4 * i + 0];
        const colon = tokens[low + 4 * i + 1];
        const type = tokens[low + 4 * i + 2];
        const comma = tokens[low + 4 * i + 3];
        if (name.type == "name" &&
            colon.type == "punctuation.colon" &&
            type.type == "name" &&
            (i == numArgs - 1
                ? comma.type == "parentheses.close" //Last argument and the 4th token is the closing paren
                : comma.type == "punctuation.comma") //Not the last argument and the token is a comma
        )
            args.set(name.text, type.text.toUpperCase());
        else
            throw new Error("Invalid function arguments");
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
        switch (statement.stype) {
            case "assignment":
            case "declaration":
            case "output":
            case "input":
            case "return":
                getActiveBuffer().push(statement);
                break;
            case "if":
            case "for":
            case "while":
            case "dowhile":
            case "function":
            case "procedure":
                const node = {
                    startStatement: statement,
                    endStatement: null,
                    type: statement.stype,
                    nodes: []
                };
                getActiveBuffer().push(node);
                blockStack.push(node);
                break;
            case "if.end":
            case "for.end":
            case "while.end":
            case "dowhile.end":
            case "function.end":
            case "procedure.end":
                const lastNode = blockStack.at(-1);
                if (!lastNode)
                    throw new Error(`Invalid statement ${stringifyStatement(statement)}: no open blocks`);
                else if (lastNode.startStatement.stype == statement.stype.split(".")[0]) { //probably bad code
                    lastNode.endStatement = statement;
                    blockStack.pop();
                }
                else
                    throw new Error(`Invalid statement ${stringifyStatement(statement)}: current block is of type ${lastNode.startStatement.type}`);
                break;
            default:
                statement.stype;
                break;
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
const out = {
    token: { text: "+", type: "operator.add" },
    nodes: [
        {
            token: { text: "-", type: "operator.subtract" },
            nodes: [
                { text: "5", type: "number.decimal" },
                { text: "6", type: "number.decimal" },
            ]
        },
        {
            token: { text: "*", type: "operator.multiply" },
            nodes: [
                { text: "1", type: "number.decimal" },
                {
                    token: { text: "/", type: "operator.divide" },
                    nodes: [
                        { text: "2", type: "number.decimal" },
                        { text: "3", type: "number.decimal" },
                    ]
                },
            ]
        }
    ]
};
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
// const x:ProgramAST = {nodes: [
// 	{nodes: ["DECLARE" , "Count", ":", "INTEGER"]},
// 	Count <- 1
// 	REPEAT
// 		OUTPUT Count
// 		OUTPUT "Sussy Baka"
// 		Count <- Count + 1
// 	UNTIL Count < 200
// ]};
