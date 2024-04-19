/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains the types for the parser.
*/
import { ArrayVariableType, PrimitiveVariableType } from "./runtime-types.js";
import { getTotalRange } from "./utils.js";
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
    fmtText() {
        if (this.operator.type.startsWith("unary_prefix")) {
            return `(${this.operatorToken.text} ${this.nodes[0].fmtText()})`;
        }
        else if (this.operator.type.startsWith("unary_postfix")) {
            return `(${this.nodes[0].fmtText()} ${this.operatorToken.text})`;
        }
        else { //binary operator
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
    fmtText() {
        return `ARRAY[${this.lengthInformation.map(([l, h]) => `${l.text}:${h.text}`).join(", ")}] OF ${this.elementType.text}`;
    }
    fmtDebug() {
        return `ARRAY[${this.lengthInformation.map(([l, h]) => `${l.fmtDebug()} : ${h.fmtDebug()}`).join(", ")}] OF ${this.elementType.fmtDebug()}`;
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
