import { getText } from "./lexer.js";
const out = {
    token: { text: "+", type: "operator.add" },
    nodes: [
        {
            token: { text: "-", type: "operator.subtract" },
            nodes: [
                { text: "5", type: "number.decimal" },
                { text: "6", type: "number.decimal" },
            ]
        },
        {
            token: { text: "*", type: "operator.multiply" },
            nodes: [
                { text: "1", type: "number.decimal" },
                {
                    token: { text: "/", type: "operator.divide" },
                    nodes: [
                        { text: "2", type: "number.decimal" },
                        { text: "3", type: "number.decimal" },
                    ]
                },
            ]
        }
    ]
};
const operators = [["multiply", "divide"], ["add", "subtract"]].reverse();
function getOperatorIndex(input, operators) {
    return input.findLastIndex(t => operators.map(o => `operator.${o}`).includes(t.type) //Find the first token whose type is one of the operators
    );
}
export function parse(input) {
    for (const operatorsOfPriority of operators) {
        if (input.length == 1) {
            if (input[0].type == "number.decimal")
                return input[0];
            else
                throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: not a number`);
        }
        const index = getOperatorIndex(input, operatorsOfPriority);
        if (index != -1) {
            const left = input.slice(0, index);
            const right = input.slice(index + 1);
            if (left.length == 0)
                throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no expression on left side of operator ${input[index].text}`);
            if (right.length == 0)
                throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no expression on right side of operator ${input[index].text}`);
            return {
                token: input[index],
                nodes: [parse(left), parse(right)]
            };
        }
    }
    throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no operators found`);
}
export function display(node, expand = false) {
    if ("type" in node) {
        return `${node.text}`;
    }
    else {
        return expand ? (`(
${display(node.nodes[0], expand).split("\n").map(l => "\t" + l).join("\n")}
	${node.token.text}
${display(node.nodes[1], expand).split("\n").map(l => "\t" + l).join("\n")}
)`) : (`(${display(node.nodes[0])} ${node.token.text} ${display(node.nodes[1])})`);
    }
}
export function evaluate(node) {
    if ("type" in node) {
        if (node.type == "number.decimal")
            return Number(node.text);
        else
            throw new Error(`Cannot evaluate expression: cannot evaluate token ${node.text}: not a number`);
    }
    else if (node.token.type.startsWith("operator.")) {
        switch (node.token.type.split("operator.")[1]) {
            case "add": return evaluate(node.nodes[0]) + evaluate(node.nodes[1]);
            case "subtract": return evaluate(node.nodes[0]) - evaluate(node.nodes[1]);
            case "multiply": return evaluate(node.nodes[0]) * evaluate(node.nodes[1]);
            case "divide": return evaluate(node.nodes[0]) / evaluate(node.nodes[1]);
        }
    }
    throw new Error(`Cannot evaluate expression: cannot evaluate node <${display(node)}>: unknown operator token type ${node.token.type}`);
}
// const x:ProgramAST = {nodes: [
// 	{nodes: ["DECLARE" , "Count", ":", "INTEGER"]},
// 	Count <- 1
// 	REPEAT
// 		OUTPUT Count
// 		OUTPUT "Sussy Baka"
// 		Count <- Count + 1
// 	UNTIL Count < 200
// ]};
