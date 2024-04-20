import { ArrayVariableType, PrimitiveVariableType } from "./runtime-types.js";
import { getTotalRange } from "./utils.js";
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
    fmtText() {
        if (this.operator.type.startsWith("unary_prefix")) {
            return `(${this.operatorToken.text} ${this.nodes[0].fmtText()})`;
        }
        else if (this.operator.type.startsWith("unary_postfix")) {
            return `(${this.nodes[0].fmtText()} ${this.operatorToken.text})`;
        }
        else {
            return `(${this.nodes[0].fmtText()} ${this.operatorToken.text} ${this.nodes[1].fmtText()})`;
        }
    }
    fmtDebug() {
        return `[${this.operator.name} ${this.nodes.map(n => n.fmtDebug()).join(" ")}]`;
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
    fmtText() {
        return `${this.functionName.text}(${this.args.map(n => n.fmtText()).join(", ")})`;
    }
    fmtDebug() {
        return `${this.functionName.text}(${this.args.map(n => n.fmtDebug()).join(" ")})`;
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
    fmtText() {
        return `NEW ${this.className.text}(${this.args.map(n => n.fmtText()).join(", ")})`;
    }
    fmtDebug() {
        return `NEW ${this.className.text}(${this.args.map(n => n.fmtDebug()).join(" ")})`;
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
    fmtText() {
        return `${this.target.fmtText()}[${this.indices.map(n => n.fmtText()).join(", ")}]`;
    }
    fmtDebug() {
        return `${this.target.fmtDebug()}[${this.indices.map(n => n.fmtDebug()).join(" ")}]`;
    }
}
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
    fmtText() {
        return `ARRAY[${this.lengthInformation.map(([l, h]) => `${l.text}:${h.text}`).join(", ")}] OF ${this.elementType.text}`;
    }
    fmtDebug() {
        return `ARRAY[${this.lengthInformation.map(([l, h]) => `${l.fmtDebug()} : ${h.fmtDebug()}`).join(", ")}] OF ${this.elementType.fmtDebug()}`;
    }
}
export class ProgramASTBranchNode {
    constructor(type, controlStatements, nodeGroups) {
        this.type = type;
        this.controlStatements = controlStatements;
        this.nodeGroups = nodeGroups;
    }
    range() {
        return getTotalRange(this.controlStatements.concat(this.nodeGroups.flat()));
    }
}
