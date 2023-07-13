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
function getOperator(input, operators) {
    return input.findIndex(t => operators.map(o => `operator.${o}`).includes(t.type) //Find the first token whose type is one of the operators
    );
}
export function parse(input) {
    for (const operatorsOfPriority of operators) {
        if (input.length == 1) {
            return input[0];
        }
        const index = getOperator(input, operatorsOfPriority);
        if (index != -1) {
            const left = input.slice(0, index);
            const right = input.slice(index + 1);
            return {
                token: input[index],
                nodes: [parse(left), parse(right)]
            };
        }
    }
    throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no operators found.`);
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
