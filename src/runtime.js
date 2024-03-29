/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the runtime, which executes the program AST.
*/
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
import { builtinFunctions } from "./builtin_functions.js";
import { Token } from "./lexer-types.js";
import { ArrayTypeData } from "./parser-types.js";
import { operators } from "./parser.js";
import { ProcedureStatement, Statement, FunctionStatement } from "./statements.js";
import { crash, errorBoundary, fail } from "./utils.js";
let Runtime = (() => {
    var _a;
    let _instanceExtraInitializers = [];
    let _processArrayAccess_decorators;
    return _a = class Runtime {
            constructor(_input, _output) {
                this._input = (__runInitializers(this, _instanceExtraInitializers), _input);
                this._output = _output;
                this.scopes = [{
                        statement: "global",
                        variables: {}
                    }];
                this.functions = {};
                this.types = {};
                this.files = {};
            }
            processArrayAccess(expr, operation, arg2) {
                //Make sure the variable exists and is an array
                const variable = this.getVariable(expr.operatorToken.text);
                if (!variable)
                    fail(`Undeclared variable ${expr.operatorToken.text}`, expr.operatorToken);
                if (!(variable.type instanceof ArrayTypeData))
                    fail(`Cannot convert variable of type ${variable.type} to an array`, expr.operatorToken);
                const varTypeData = variable.type;
                //TODO is there any way of getting a 1D array out of a 2D array?
                //Forbids getting any arrays from arrays
                if (arg2 instanceof ArrayTypeData)
                    fail(`Cannot evaluate expression starting with "array access": expected the expression to evaluate to a value of type ${arg2}, but the operator produces a result of type ${varTypeData.type}`, expr.operatorToken);
                if (expr.nodes.length != variable.type.lengthInformation.length)
                    fail(`Cannot evaluate expression starting with "array access": \
${variable.type.lengthInformation.length}-dimensional array requires ${variable.type.lengthInformation.length} indices, \
but found ${expr.nodes.length} indices`, expr.nodes);
                const indexes = expr.nodes.map(e => [e, this.evaluateExpr(e, "INTEGER")[1]]);
                let invalidIndexIndex;
                if ((invalidIndexIndex = indexes.findIndex(([expr, value], index) => value > varTypeData.lengthInformation[index][1] ||
                    value < varTypeData.lengthInformation[index][0]))
                    != -1)
                    fail(`Array index out of bounds: value ${indexes[invalidIndexIndex][1]} was not in range (${varTypeData.lengthInformation[invalidIndexIndex].join(" to ")})`, indexes[invalidIndexIndex][0]);
                const index = indexes.reduce((acc, [e, value], index) => (acc + value - varTypeData.lengthInformation[index][0]) * (index == indexes.length - 1 ? 1 : varTypeData.lengthInformation_[index]), 0);
                if (operation == "get") {
                    const output = variable.value[index];
                    if (output == null)
                        fail(`Cannot use the value of uninitialized variable ${expr.operatorToken.text}[${indexes.map(([name, val]) => val).join(", ")}]`, expr.operatorToken);
                    if (arg2)
                        return [arg2, this.coerceValue(output, variable.type.type, arg2)];
                    else
                        return [variable.type.type, output];
                }
                else {
                    variable.value[index] = this.evaluateExpr(arg2, varTypeData.type)[1];
                }
            }
            evaluateExpr(expr, type) {
                if (expr instanceof Token)
                    return this.evaluateToken(expr, type);
                //Branch node
                //Special cases
                switch (expr.operator) {
                    case "array access":
                        return this.processArrayAccess(expr, "get", type);
                    case "function call":
                        const fn = this.getFunction(expr.operatorToken.text);
                        if ("name" in fn) {
                            const output = this.callBuiltinFunction(fn, expr.nodes);
                            if (type)
                                return [type, this.coerceValue(output[1], output[0], type)];
                            else
                                return output;
                        }
                        else {
                            if (fn.type == "procedure")
                                fail(`Procedure ${expr.operatorToken.text} does not return a value.`);
                            const statement = fn.controlStatements[0];
                            const output = this.callFunction(fn, expr.nodes, true);
                            if (type)
                                return [type, this.coerceValue(output, statement.returnType, type)];
                            else
                                return [statement.returnType, output];
                        }
                }
                //arithmetic
                if (type == "REAL" || type == "INTEGER" || expr.operator.category == "arithmetic") {
                    if (type && !(type == "REAL" || type == "INTEGER"))
                        fail(`Cannot evaluate expression starting with ${expr.operator.name}: expected the expression to evaluate to a value of type ${type}, but the operator produces a numeric result`);
                    const guessedType = type ?? "REAL"; //Use this type to evaluate the expression
                    let value;
                    //if the requested type is INTEGER, the sub expressions will be evaluated as integers and return an error if not possible
                    if (expr.operator.unary) {
                        const [operandType, operand] = this.evaluateExpr(expr.nodes[0], guessedType);
                        switch (expr.operator) {
                            case operators.negate:
                                return ["INTEGER", -operand];
                            default: crash("impossible");
                        }
                    }
                    const [leftType, left] = this.evaluateExpr(expr.nodes[0], guessedType);
                    const [rightType, right] = this.evaluateExpr(expr.nodes[1], guessedType);
                    switch (expr.operator) {
                        case operators.add:
                            value = left + right;
                            break;
                        case operators.subtract:
                            value = left - right;
                            break;
                        case operators.multiply:
                            value = left * right;
                            break;
                        case operators.divide:
                            if (right == 0)
                                fail(`Division by zero`);
                            value = left / right;
                            if (type == "INTEGER")
                                fail(`Arithmetic operation evaluated to value of type REAL, cannot be coerced to INTEGER
help: try using DIV instead of / to produce an integer as the result`);
                            break;
                        case operators.integer_divide:
                            if (right == 0)
                                fail(`Division by zero`);
                            value = Math.trunc(left / right);
                            break;
                        case operators.mod:
                            if (right == 0)
                                fail(`Division by zero`);
                            value = left % right;
                            break;
                        default:
                            fail(`Cannot evaluate expression starting with ${expr.operator.name}: expected the expression to evaluate to a value of type ${type}, but the operator produces a numeric result`);
                    }
                    return [guessedType, value];
                }
                //logical
                if (type == "BOOLEAN" || expr.operator.category == "logical") {
                    if (type && !(type == "BOOLEAN"))
                        fail(`Cannot evaluate expression starting with ${expr.operator.name}: expected the expression to evaluate to a value of type ${type}, but the operator produces a boolean result`);
                    if (expr.operator.unary) {
                        switch (expr.operator) {
                            case operators.not:
                                return ["BOOLEAN", !this.evaluateExpr(expr.nodes[0], "BOOLEAN")[1]];
                            default: crash("impossible");
                        }
                    }
                    switch (expr.operator) {
                        case operators.and:
                            return ["BOOLEAN", this.evaluateExpr(expr.nodes[0], "BOOLEAN")[1] && this.evaluateExpr(expr.nodes[1], "BOOLEAN")[1]];
                        case operators.or:
                            return ["BOOLEAN", this.evaluateExpr(expr.nodes[0], "BOOLEAN")[1] || this.evaluateExpr(expr.nodes[1], "BOOLEAN")[1]];
                        case operators.equal_to:
                        case operators.not_equal_to:
                            //Type is unknown
                            const [leftType, left] = this.evaluateExpr(expr.nodes[0]);
                            const [rightType, right] = this.evaluateExpr(expr.nodes[1]);
                            const typesMatch = (leftType == rightType) ||
                                (leftType == "INTEGER" && rightType == "REAL") ||
                                (leftType == "REAL" && rightType == "INTEGER");
                            const is_equal = typesMatch && (left == right);
                            if (expr.operator == operators.equal_to)
                                return ["BOOLEAN", is_equal];
                            else
                                return ["BOOLEAN", !is_equal];
                        case operators.greater_than:
                            return ["BOOLEAN", this.evaluateExpr(expr.nodes[0], "REAL")[1] > this.evaluateExpr(expr.nodes[1], "REAL")[1]];
                        case operators.greater_than_equal:
                            return ["BOOLEAN", this.evaluateExpr(expr.nodes[0], "REAL")[1] >= this.evaluateExpr(expr.nodes[1], "REAL")[1]];
                        case operators.less_than:
                            return ["BOOLEAN", this.evaluateExpr(expr.nodes[0], "REAL")[1] < this.evaluateExpr(expr.nodes[1], "REAL")[1]];
                        case operators.less_than_equal:
                            return ["BOOLEAN", this.evaluateExpr(expr.nodes[0], "REAL")[1] <= this.evaluateExpr(expr.nodes[1], "REAL")[1]];
                        default:
                            fail(`Cannot evaluate expression starting with ${expr.operator}: expected the expression to evaluate to a value of type ${type}`);
                    }
                }
                //string
                if (type == "STRING" || expr.operator.category == "string") {
                    if (type && !(type == "STRING"))
                        fail(`Cannot evaluate expression starting with ${expr.operator.name}: expected the expression to evaluate to a value of type ${type}, but the operator produces a string result`);
                    switch (expr.operator) {
                        case operators.string_concatenate:
                            return ["STRING", this.evaluateExpr(expr.nodes[0], "STRING")[1] + this.evaluateExpr(expr.nodes[1], "STRING")[1]];
                        default:
                            fail(`Cannot evaluate expression starting with ${expr.operator}: expected the expression to evaluate to a value of type ${type}`);
                    }
                }
                crash(`This should not be possible`);
            }
            evaluateToken(token, type) {
                switch (token.type) {
                    case "boolean.false":
                        if (!type || type == "BOOLEAN")
                            return ["BOOLEAN", false];
                        else if (type == "STRING")
                            return ["STRING", "FALSE"];
                        else
                            fail(`Cannot convert value FALSE to ${type}`);
                    case "boolean.true":
                        if (!type || type == "BOOLEAN")
                            return ["BOOLEAN", true];
                        else if (type == "STRING")
                            return ["STRING", "TRUE"];
                        else
                            fail(`Cannot convert value TRUE to ${type}`);
                    case "number.decimal":
                        if (!type || type == "INTEGER" || type == "REAL" || type == "STRING") {
                            const val = Number(token.text);
                            if (!Number.isFinite(val))
                                fail(`Value ${token.text} cannot be converted to a number: too large`);
                            if (type == "INTEGER") {
                                if (type == "INTEGER" && !Number.isInteger(val))
                                    fail(`Value ${token.text} cannot be converted to an integer`);
                                if (type == "INTEGER" && !Number.isSafeInteger(val))
                                    fail(`Value ${token.text} cannot be converted to an integer: too large`);
                                return ["INTEGER", val];
                            }
                            else if (type == "STRING")
                                return ["STRING", token.text];
                            else {
                                return ["REAL", val];
                            }
                        }
                        else
                            fail(`Cannot convert number to type ${type}`);
                    case "string":
                        if (!type || type == "STRING")
                            return ["STRING", token.text.slice(1, -1)]; //remove the quotes
                        else
                            fail(`Cannot convert value ${token.text} to ${type}`);
                    case "char":
                        if (!type || type == "CHAR")
                            return ["CHAR", token.text.slice(1, -1)]; //remove the quotes
                        else
                            fail(`Cannot convert value ${token.text} to ${type}`);
                    case "name":
                        const variable = this.getVariable(token.text);
                        if (!variable)
                            fail(`Undeclared variable ${token.text}`);
                        if (variable.value == null)
                            fail(`Cannot use the value of uninitialized variable ${token.text}`);
                        if (type)
                            return [type, this.coerceValue(variable.value, variable.type, type)];
                        else
                            return [variable.type, variable.value];
                    default: fail(`Cannot evaluate token of type ${token.type}`);
                }
            }
            static evaluateToken(token, type) {
                //major shenanigans
                try {
                    return this.prototype.evaluateToken.call(new Proxy({}, {
                        get() { throw new _a.NotStaticError(); },
                    }), token, type);
                }
                catch (err) {
                    if (err instanceof _a.NotStaticError)
                        fail(`Cannot evaluate token ${token} in a static context`, token);
                    else
                        throw err;
                }
            }
            /** Returned variable may not be initialized */
            getVariable(name) {
                for (let i = this.scopes.length - 1; i >= 0; i--) {
                    if (this.scopes[i].variables[name])
                        return this.scopes[i].variables[name];
                }
                return null;
            }
            getCurrentScope() {
                return this.scopes.at(-1) ?? crash(`No scope?`);
            }
            getFunction(name) {
                return this.functions[name] ?? builtinFunctions[name] ?? fail(`Function "${name}" is not defined.`);
            }
            getCurrentFunction() {
                const scope = this.scopes.findLast((s) => s.statement instanceof FunctionStatement || s.statement instanceof ProcedureStatement);
                if (!scope)
                    return null;
                return this.functions[scope.statement.name] ?? crash(`impossible`);
            }
            coerceValue(value, from, to) {
                //typescript really hates this function, beware
                if (from == to)
                    return value;
                if (from == "STRING" && to == "CHAR")
                    return value;
                if (from == "INTEGER" && to == "REAL")
                    return value;
                if (from == "REAL" && to == "INTEGER")
                    return Math.trunc(value);
                if (to == "STRING") {
                    if (from == "BOOLEAN" || from == "CHAR" || from == "DATE" || from == "INTEGER" || from == "REAL" || from == "STRING")
                        return value.toString();
                    else if (from instanceof ArrayTypeData)
                        return `[${value.join(",")}]`;
                }
                fail(`Cannot coerce value of type ${from} to ${to}`);
            }
            callFunction(funcNode, args, requireReturnValue = false) {
                const func = funcNode.controlStatements[0];
                if (func instanceof ProcedureStatement) {
                    if (requireReturnValue)
                        fail(`Cannot use return value of ${func.name}() as it is a procedure`);
                }
                else if (func instanceof FunctionStatement) {
                    //all good
                }
                else
                    crash(`Invalid function ${func.stype}`); //unreachable
                //Assemble scope
                if (func.args.size != args.length)
                    fail(`Incorrect number of arguments for function ${func.name}`);
                const scope = {
                    statement: func,
                    variables: {}
                };
                let i = 0;
                for (const [name, { type, passMode }] of func.args) {
                    scope.variables[name] = {
                        declaration: func,
                        mutable: passMode == "reference",
                        type,
                        value: this.evaluateExpr(args[i], type)[1]
                    };
                    i++;
                }
                const output = this.runBlock(funcNode.nodeGroups[0], scope);
                if (func instanceof ProcedureStatement) {
                    return null;
                }
                else { //must be functionstatement
                    if (!output)
                        fail(`Function ${func.name} did not return a value`);
                    return output.value;
                }
            }
            callBuiltinFunction(fn, args, returnType) {
                if (fn.args.size != args.length)
                    fail(`Incorrect number of arguments for function ${fn.name}`);
                if (!fn.returnType)
                    fail(`Builtin function ${fn.name} did not return a value`);
                const processedArgs = [];
                let i = 0;
                for (const { type } of fn.args.values()) {
                    processedArgs.push(this.evaluateExpr(args[i], type)[1]);
                    i++;
                }
                //TODO maybe coerce the value?
                return [fn.returnType, fn.impl(...processedArgs)];
            }
            runBlock(code, scope) {
                if (scope)
                    this.scopes.push(scope);
                let returned = null;
                for (const node of code) {
                    let result;
                    if (node instanceof Statement) {
                        result = node.run(this);
                    }
                    else {
                        result = node.controlStatements[0].runBlock(this, node);
                    }
                    if (result) {
                        if (result.type == "function_return") {
                            returned = result.value;
                            break;
                        }
                    }
                }
                if (scope)
                    this.scopes.pop() ?? crash(`Scope somehow disappeared`);
                if (returned !== null) {
                    return {
                        type: "function_return",
                        value: returned
                    };
                }
            }
        },
        (() => {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _processArrayAccess_decorators = [errorBoundary];
            __esDecorate(_a, null, _processArrayAccess_decorators, { kind: "method", name: "processArrayAccess", static: false, private: false, access: { has: obj => "processArrayAccess" in obj, get: obj => obj.processArrayAccess }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a.NotStaticError = class extends Error {
        },
        _a;
})();
export { Runtime };
