/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the runtime, which executes the program AST.
*/
import { builtinFunctions } from "./builtin_functions.js";
import { Token } from "./lexer.js";
import { operators, ArrayTypeData } from "./parser.js";
import { ProcedureStatement, Statement, FunctionStatement } from "./statements.js";
import { crash, fail } from "./utils.js";
export class Runtime {
    constructor(_input, _output) {
        this._input = _input;
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
        const variable = this.getVariable(expr.operatorToken.text);
        if (!variable)
            fail(`Undeclared variable ${expr.operatorToken.text}`);
        if (!(variable.type instanceof ArrayTypeData))
            fail(`Cannot convert variable of type ${variable.type} to an array`);
        const varTypeData = variable.type;
        if (arg2 instanceof ArrayTypeData)
            fail(`Cannot evaluate expression starting with "array access": expected the expression to evaluate to a value of type ${arg2}, but the operator produces a result of type ${variable.type.type}`);
        if (expr.nodes.length != variable.type.lengthInformation.length)
            fail(`Cannot evaluate expression starting with "array access": incorrect number of indices for n-dimensional array`);
        const indexes = expr.nodes.map(e => this.evaluateExpr(e, "INTEGER")[1]);
        let invalidIndexIndex;
        if ((invalidIndexIndex = indexes.findIndex((value, index) => value > varTypeData.lengthInformation[index][1] || value < varTypeData.lengthInformation[index][0])) != -1)
            fail(`Array index out of bounds: value ${indexes[invalidIndexIndex]} was not in range ${varTypeData.lengthInformation[invalidIndexIndex]}`);
        const index = indexes.reduce((acc, value, index) => (acc + value - varTypeData.lengthInformation[index][0]) * (index == indexes.length - 1 ? 1 : varTypeData.lengthInformation_[index]), 0);
        if (operation == "get") {
            const output = variable.value[index];
            if (output == null)
                fail(`Cannot use the value of uninitialized variable ${expr.operatorToken.text}[${indexes.join(", ")}]`);
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
        //Tree node
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
                fail(`Cannot evaluate expression starting with ${expr.operator.type}: expected the expression to evaluate to a value of type ${type}, but the operator produces a numeric result`);
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
                    fail(`Cannot evaluate expression starting with ${expr.operator.type}: expected the expression to evaluate to a value of type ${type}, but the operator produces a numeric result`);
            }
            return [guessedType, value];
        }
        //logical
        if (type == "BOOLEAN" || expr.operator.category == "logical") {
            if (type && !(type == "BOOLEAN"))
                fail(`Cannot evaluate expression starting with ${expr.operator.type}: expected the expression to evaluate to a value of type ${type}, but the operator produces a boolean result`);
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
                fail(`Cannot evaluate expression starting with ${expr.operator.type}: expected the expression to evaluate to a value of type ${type}, but the operator produces a string result`);
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
        if (to == "STRING" && value.toString)
            return value.toString();
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
}
