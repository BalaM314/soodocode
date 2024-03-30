import { EnumeratedVariableType, PointerVariableType } from "./runtime.js";
import { fail, fquote, getTotalRange, isPrimitiveType } from "./utils.js";
/** Represents a branch node (node with child nodes) in an expression AST. */
export class ExpressionASTBranchNode {
    constructor(operatorToken, operator, nodes, allTokens) {
        this.operatorToken = operatorToken;
        this.operator = operator;
        this.nodes = nodes;
        this.allTokens = allTokens;
        this.range = getTotalRange(allTokens);
    }
}
/** Represents a special node that represents an array type, such as `ARRAY[1:!0, 1:20] OF INTEGER` */
export class ExpressionASTArrayTypeNode {
    constructor(lengthInformation, elementType, allTokens) {
        this.lengthInformation = lengthInformation;
        this.elementType = elementType;
        this.allTokens = allTokens;
        this.range = getTotalRange(allTokens);
    }
    toData() {
        return new ArrayVariableType(this.lengthInformation.map(bounds => bounds.map(t => Number(t.text))), isPrimitiveType(this.elementType.text) ? this.elementType.text : fail(fquote `Invalid variable type ${this.elementType.text}`));
    }
}
export class ExpressionASTPointerTypeNode {
    constructor(targetType, allTokens) {
        this.targetType = targetType;
        this.allTokens = allTokens;
        this.range = getTotalRange(allTokens);
    }
    toData(name) {
        return new PointerVariableType(name, isPrimitiveType(this.targetType.text) ? this.targetType.text : fail(fquote `Invalid variable type ${this.targetType.text}`));
    }
}
export class ExpressionASTEnumTypeNode {
    constructor(values, allTokens) {
        this.values = values;
        this.allTokens = allTokens;
        this.range = getTotalRange(allTokens);
    }
    toData(name) {
        return new EnumeratedVariableType(name, this.values.map(t => t.text));
    }
}
/** Represents a branch node (node with children) in a program AST. */
export class ProgramASTBranchNode {
    constructor(type, 
    /**
     * Contains the control statements for this block.
     * @example for FUNCTION blocks, the first element will be the FUNCTION statement and the second one will be the ENDFUNCTION statement.
     */
    controlStatements, nodeGroups) {
        this.type = type;
        this.controlStatements = controlStatements;
        this.nodeGroups = nodeGroups;
    }
    range() {
        return getTotalRange(this.controlStatements.concat(this.nodeGroups.flat()));
    }
}
/** Contains data about an array type. Processed from an ExpressionASTArrayTypeNode. */
export class ArrayVariableType {
    constructor(lengthInformation, type) {
        this.lengthInformation = lengthInformation;
        this.type = type;
        if (this.lengthInformation.some(b => b[1] < b[0]))
            fail(`Invalid length information: upper bound cannot be less than lower bound`);
        if (this.lengthInformation.some(b => b.some(n => !Number.isSafeInteger(n))))
            fail(`Invalid length information: bound was not an integer`);
        this.arraySizes = this.lengthInformation.map(b => b[1] - b[0] + 1);
        this.totalLength = this.arraySizes.reduce((a, b) => a * b, 1);
    }
    toString() {
        return `ARRAY[${this.lengthInformation.map(([l, h]) => `${l}:${h}`).join(", ")}] OF ${this.type}`;
    }
}
