import { operators } from "./parser.js";
import { ProcedureStatement } from "./statements.js";
import { crash, fail } from "./utils.js";
export class Runtime {
    constructor(_input, _output) {
        this._input = _input;
        this._output = _output;
        this.variables = {};
        this.functions = {};
        this.types = {};
        this.files = {};
    }
    evaluateExpr(expr, type) {
        //TODO attempt coercion
        if ("operator" in expr) {
            switch (expr.operator) {
                case "array access": crash(`Arrays are not yet supported`); //TODO arrays
                case "function call":
                    const fn = this.functions[expr.operatorToken.text];
                    if (!fn)
                        fail(`Function ${expr.operatorToken.text} is not defined.`);
                    if (fn.type == "procedure")
                        fail(`Procedure ${expr.operatorToken.text} does not return a value.`);
                    const statement = fn.controlStatements[0]; //TODO fix
                    if (type && statement.returnType != type)
                        fail(`Expected a value of type ${type}, but the function ${expr.operatorToken.text} returns a value of type ${statement.returnType}`);
                    return ["INTEGER", this.callFunction(fn, expr.nodes, true)];
            }
            //arithmetic
            if (type == "REAL" || type == "INTEGER" || expr.operator.category == "arithmetic") {
                if (type && !(type == "REAL" || type == "INTEGER"))
                    fail(`Cannot evaluate expression starting with ${expr.operator.type}: expected the expression to evaluate to a value of type ${type}, but the operator produces a numeric result`);
                const guessedType = type ?? "REAL"; //Use this type to evaluate the expression
                let value;
                //if the requested type is INTEGER, the sub expressions will be evaluated as integers and return an error if not possible
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
                        const is_equal = (leftType == rightType) && (left == right);
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
        else {
            switch (expr.type) {
                case "boolean.false":
                    if (!type || type == "BOOLEAN")
                        return ["BOOLEAN", false];
                    else if (type == "STRING")
                        return ["STRING", "FALSE"];
                    else
                        fail(`Cannot convert value FALSE to ${type}`);
                case "boolean.false":
                    if (!type || type == "BOOLEAN")
                        return ["BOOLEAN", true];
                    else if (type == "STRING")
                        return ["STRING", "TRUE"];
                    else
                        fail(`Cannot convert value TRUE to ${type}`);
                case "number.decimal":
                    if (!type || type == "INTEGER" || type == "REAL" || type == "STRING") {
                        const val = Number(expr.text);
                        if (!Number.isFinite(val))
                            fail(`Value ${expr.text} cannot be converted to a number: too large`);
                        if (type == "INTEGER") {
                            if (type == "INTEGER" && !Number.isInteger(val))
                                fail(`Value ${expr.text} cannot be converted to an integer`);
                            if (type == "INTEGER" && !Number.isSafeInteger(val))
                                fail(`Value ${expr.text} cannot be converted to an integer: too large`);
                            return ["INTEGER", val];
                        }
                        else if (type == "STRING")
                            return ["STRING", expr.text];
                        else {
                            return ["REAL", val];
                        }
                    }
                    else
                        fail(`Cannot convert number to type ${type}`);
                case "string":
                    return ["STRING", expr.text.slice(1, -1)]; //remove the quotes
                case "name":
                    const variable = this.variables[expr.text];
                    if (!variable)
                        fail(`Undeclared variable ${expr.text}`);
                    if (variable.value == null)
                        fail(`Cannot use the value of uninitialized variable ${expr.text}`);
                    if (type)
                        return [type, this.coerceValue(variable.value, variable.type, type)];
                    else
                        return [variable.type, variable.value];
                default: fail(`Cannot evaluate token of type ${expr.type}`);
            }
        }
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
    callFunction(func, args, requireReturnValue = false) {
        if (func.controlStatements[0] instanceof ProcedureStatement) {
            if (requireReturnValue)
                fail(`Cannot use return value of ${func.controlStatements[0].tokens[1].text}() as it is a procedure`);
            //TODO fix above line
            //TODO scope?
            this.runBlock([func]);
            return null;
        }
        else { //must be functionstatement
            this.runBlock([func]);
            return crash(`Obtaining the return value from functions is not yet implemented`);
        }
    }
    runBlock(code) {
        for (const line of code) {
            if ("nodeGroups" in line) {
                crash(`TODO`);
            }
            else {
                line.run(this);
            }
        }
    }
}
