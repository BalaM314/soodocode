import { fail } from "./utils.js";
/** Contains data about an array type. Processed from an ExpressionAStArrayTypeNode. */
export class ArrayTypeData {
    constructor(lengthInformation, type) {
        this.lengthInformation = lengthInformation;
        this.type = type;
        if (this.lengthInformation.some(b => b[1] < b[0]))
            fail(`Invalid length information: upper bound cannot be less than lower bound`);
        if (this.lengthInformation.some(b => b.some(n => !Number.isSafeInteger(n))))
            fail(`Invalid length information: bound was not an integer`);
        this.lengthInformation_ = this.lengthInformation.map(b => b[1] - b[0] + 1);
        this.totalLength = this.lengthInformation_.reduce((a, b) => a * b, 1);
    }
    toString() {
        return `ARRAY[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}] OF ${this.type}`;
    }
}
