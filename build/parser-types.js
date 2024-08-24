import { Token } from "./lexer-types.js";
import { crash, f, getTotalRange } from "./utils.js";
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
        return f.text `${this.functionName}(${this.args.map(n => n.fmtText()).join(", ")})`;
    }
    fmtDebug() {
        return f.debug `${this.functionName}(${this.args.map(n => n.fmtDebug()).join(" ")})`;
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
        this.range = this.allTokens.range;
    }
    fmtText() {
        const rangeText = this.lengthInformation ? `[${this.lengthInformation.map(([l, h]) => f.text `${l}:${h}`).join(", ")}]` : "";
        return `ARRAY OF ${this.elementType.text}`;
    }
    fmtDebug() {
        const rangeText = this.lengthInformation ? `[${this.lengthInformation.map(([l, h]) => `${l.fmtDebug()} : ${h.fmtDebug()}`).join(", ")}]` : "";
        return `ARRAY${rangeText} OF ${this.elementType.fmtDebug()}`;
    }
}
export class ExpressionASTRangeTypeNode {
    constructor(low, high, allTokens) {
        this.low = low;
        this.high = high;
        this.allTokens = allTokens;
        this.range = this.allTokens.range;
    }
    fmtText() {
        return `${this.low.text}..${this.high.text}`;
    }
    fmtDebug() {
        return f.debug `${this.low} .. ${this.high}`;
    }
}
export const ExpressionASTTypeNodes = [
    Token, ExpressionASTArrayTypeNode, ExpressionASTRangeTypeNode
];
export const ExpressionASTNodes = [
    Token, ExpressionASTBranchNode, ExpressionASTFunctionCallNode, ExpressionASTArrayAccessNode, ExpressionASTClassInstantiationNode
];
export class Operator {
    constructor(args) {
        Object.assign(this, args);
    }
    fmtText() {
        return {
            "operator.or": "or",
            "operator.and": "and",
            "operator.equal_to": "equal to",
            "operator.not_equal_to": "not equal to",
            "operator.less_than": "less than",
            "operator.less_than_equal": "less than equal",
            "operator.greater_than": "greater than",
            "operator.greater_than_equal": "greater than equal",
            "operator.add": "add",
            "operator.subtract": "subtract",
            "operator.string_concatenate": "string concatenate",
            "operator.multiply": "multiply",
            "operator.divide": "divide",
            "operator.integer_divide": "integer divide",
            "operator.mod": "mod",
            "operator.pointer_reference": "pointer reference",
            "operator.not": "not",
            "operator.negate": "negate",
            "operator.pointer_dereference": "pointer dereference",
            "operator.access": "access",
        }[this.name];
    }
    fmtDebug() {
        return `Operator [${this.name}] (${this.category} ${this.type})`;
    }
}
export const operatorsByPriority = ((input) => input.map(row => row.map(o => new Operator({
    token: o.token,
    category: o.category,
    type: o.type ?? "binary",
    name: "name" in o ? o.name : o.token,
}))))([
    [
        {
            token: "operator.or",
            category: "logical"
        }
    ], [
        {
            token: "operator.and",
            category: "logical"
        }
    ], [
        {
            token: "operator.equal_to",
            category: "logical"
        }, {
            token: "operator.not_equal_to",
            category: "logical"
        }
    ], [
        {
            token: "operator.less_than",
            category: "logical"
        }, {
            token: "operator.less_than_equal",
            category: "logical"
        }, {
            token: "operator.greater_than",
            category: "logical"
        }, {
            token: "operator.greater_than_equal",
            category: "logical"
        }
    ], [
        {
            token: "operator.add",
            category: "arithmetic"
        }, {
            name: "operator.subtract",
            token: "operator.minus",
            category: "arithmetic",
            type: "binary_o_unary_prefix"
        }, {
            token: "operator.string_concatenate",
            category: "string"
        }
    ], [
        {
            token: "operator.multiply",
            category: "arithmetic"
        }, {
            token: "operator.divide",
            category: "arithmetic"
        }, {
            token: "operator.integer_divide",
            category: "arithmetic"
        }, {
            token: "operator.mod",
            category: "arithmetic"
        }
    ],
    [
        {
            token: "operator.pointer",
            name: "operator.pointer_reference",
            category: "special",
            type: "unary_prefix_o_postfix"
        },
        {
            token: "operator.not",
            category: "logical",
            type: "unary_prefix"
        },
        {
            token: "operator.minus",
            name: "operator.negate",
            category: "arithmetic",
            type: "unary_prefix"
        },
    ],
    [
        {
            token: "operator.pointer",
            name: "operator.pointer_dereference",
            category: "special",
            type: "unary_postfix_o_prefix"
        }
    ],
    [
        {
            token: "punctuation.period",
            name: "operator.access",
            category: "special",
        }
    ]
]);
export const operators = Object.fromEntries(operatorsByPriority.flat().map(o => [
    o.name.startsWith("operator.") ? o.name.split("operator.")[1] : crash(`operator names should start with operator.`), o
]));
export class ProgramASTBranchNode {
    constructor(type, controlStatements, nodeGroups) {
        this.type = type;
        this.controlStatements = controlStatements;
        this.nodeGroups = nodeGroups;
    }
    controlStatements_() {
        return this.controlStatements;
    }
    range() {
        return getTotalRange([
            ...this.controlStatements,
            ...this.nodeGroups.flat()
        ]);
    }
    static typeName(type) {
        return {
            "if": "if",
            "for": "for",
            "for.step": "for (step)",
            "while": "while",
            "dowhile": "repeat",
            "function": "function",
            "procedure": "procedure",
            "switch": "switch",
            "type": "type",
            "class": "class",
            "class.inherits": "class",
            "class_function": "class function",
            "class_procedure": "class procedure",
        }[type];
    }
    typeName() {
        return ProgramASTBranchNode.typeName(this.type);
    }
}
export const programASTBranchNodeTypes = ["if", "for", "for.step", "while", "dowhile", "function", "procedure", "switch", "type", "class", "class.inherits", "class_function", "class_procedure"];
export function ProgramASTBranchNodeType(input) {
    if (programASTBranchNodeTypes.includes(input))
        return input;
    crash(`"${input}" is not a valid program AST branch node type`);
}
