import { ArrayVariableType, EnumeratedVariableType, PointerVariableType, PrimitiveVariableType } from "./runtime.js";
import { fail, fquote, getTotalRange } from "./utils.js";
/** Represents a branch node (node with child nodes) in an expression AST. */
export class ExpressionASTBranchNode {
    constructor(operatorToken, operator, nodes, allTokens) {
        this.operatorToken = operatorToken;
        this.operator = operator;
        this.nodes = nodes;
        this.allTokens = allTokens;
        this.range = getTotalRange(allTokens);
    }
    toString() {
        return this.allTokens.map(t => t.text).join(" ");
    }
    getText() {
        if (this.operator.type.startsWith("unary_prefix")) {
            //Is a unary prefix operator and, argument says don't expand or all child nodes are leaf nodes.
            return `(${this.operatorToken.text} ${this.nodes[0].getText()})`;
        }
        else if (this.operator.type.startsWith("unary_postfix")) {
            //Is a unary postfix operator and, argument says don't expand or all child nodes are leaf nodes.
            return `(${this.nodes[0].getText()} ${this.operatorToken.text})`;
        }
        else {
            //Binary operator and, argument says don't expand or all child nodes are leaf nodes.
            return `(${this.nodes[0].getText()} ${this.operatorToken.text} ${this.nodes[1].getText()})`;
        }
    }
}
export class ExpressionASTFunctionCallNode {
    constructor(functionName, args, allTokens) {
        this.functionName = functionName;
        this.args = args;
        this.allTokens = allTokens;
        this.range = getTotalRange(allTokens);
    }
    toString() {
        return this.allTokens.map(t => t.text).join(" ");
    }
    getText() {
        return `${this.functionName.text}(${this.args.map(n => n.getText()).join(", ")})`;
    }
}
export class ExpressionASTClassInstantiationNode {
    constructor(className, args, allTokens) {
        this.className = className;
        this.args = args;
        this.allTokens = allTokens;
        this.range = getTotalRange(allTokens);
    }
    toString() {
        return this.allTokens.map(t => t.text).join(" ");
    }
    getText() {
        return `NEW ${this.className.text}(${this.args.map(n => n.getText()).join(", ")})`;
    }
}
export class ExpressionASTArrayAccessNode {
    constructor(target, indices, allTokens) {
        this.target = target;
        this.indices = indices;
        this.allTokens = allTokens;
        this.range = getTotalRange(allTokens);
    }
    toString() {
        return this.allTokens.map(t => t.text).join(" ");
    }
    getText() {
        return `${this.target.getText()}[${this.indices.map(n => n.getText()).join(", ")}]`;
    }
}
/** Represents a special node that represents an array type, such as `ARRAY[1:10, 1:20] OF INTEGER` */
export class ExpressionASTArrayTypeNode {
    constructor(lengthInformation, elementType, allTokens) {
        this.lengthInformation = lengthInformation;
        this.elementType = elementType;
        this.allTokens = allTokens;
        this.range = getTotalRange(allTokens);
    }
    toData() {
        return new ArrayVariableType(this.lengthInformation.map(bounds => bounds.map(t => Number(t.text))), PrimitiveVariableType.resolve(this.elementType.text));
    }
    toString() {
        return `ARRAY[${this.lengthInformation.map(([l, h]) => `${l.text}:${h.text}`).join(", ")}] OF ${this.elementType.text}`;
    }
    getText() { return this.toString(); }
}
export class ExpressionASTPointerTypeNode {
    constructor(targetType, allTokens) {
        this.targetType = targetType;
        this.allTokens = allTokens;
        this.range = getTotalRange(allTokens);
    }
    toData(name) {
        return new PointerVariableType(name, PrimitiveVariableType.get(this.targetType.text) ?? fail(fquote `Invalid variable type ${this.targetType.text}`));
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
