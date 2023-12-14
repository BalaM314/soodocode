export class Runtime {
    constructor(code, _input, _output) {
        this.code = code;
        this._input = _input;
        this._output = _output;
        this.variables = {};
        this.functions = {};
        this.types = {};
        this.files = {};
        /** program counter, points to the currently executing (or just executed) instruction */
        this.pc = [];
    }
    tick() {
        //??????????????????
    }
}
