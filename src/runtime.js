import { crash } from "./utils.js";
import { fail } from "./utils.js";
export class Runtime {
    constructor(_input, _output) {
        this._input = _input;
        this._output = _output;
        this.variables = {};
        this.functions = {};
        this.types = {};
        this.files = {};
    }
    evaluateExpr(expr) {
        if ("operator" in expr) {
            switch (expr.operator) {
                default: crash("TODO parse expressions with operators");
            }
        }
        else {
            switch (expr.type) {
                case "boolean.false": return false;
                case "boolean.true": return false;
                case "number.decimal": return Number(expr.text);
                case "string": return expr.text.slice(1, -1); //remove the quotes
                case "name":
                    if (!(expr.text in this.variables))
                        fail(`Undeclared variable ${expr.text}`);
                    if (this.variables[expr.text].value == null)
                        fail(`Cannot use the value of uninitialized variable ${expr.text}`);
                    return this.variables[expr.text].value;
                default: fail(`Cannot evaluate token of type ${expr.type}`);
            }
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
