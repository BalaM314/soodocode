import { crash } from "./utils.js";
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
        crash(`TODO`);
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
