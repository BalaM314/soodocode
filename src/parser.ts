import { getText, type Token, type TokenType } from "./lexer.js";

type ASTNode = Token | ASTTreeNode;
interface ASTTreeNode {
	token: Token;
	nodes: ASTNode[];
}

const out:ASTTreeNode = {
	token: {text: "+", type: "operator.add"},
	nodes: [
		{
			token: {text: "-", type: "operator.subtract"},
			nodes: [
				{text: "5", type: "number.decimal"},
				{text: "6", type: "number.decimal"},
			]
		},
		{
			token: {text: "*", type: "operator.multiply"},
			nodes: [
				{text: "1", type: "number.decimal"},
				{
					token: {text: "/", type: "operator.divide"},
					nodes: [
						{text: "2", type: "number.decimal"},
						{text: "3", type: "number.decimal"},
					]
				},
			]
		}
	]
};

const operators = [["multiply", "divide"], ["add", "subtract"]].reverse();

export function parse(input:Token[]):ASTNode {
	//If there is only one token
	if(input.length == 1){
		if(input[0].type == "number.decimal") //and it's a number
			return input[0]; //nothing to parse, just return the number
		else
			throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: not a number`);
	}
	//If the whole expression is surrounded by parentheses, parse the inner expression
	if(input[0]?.type == "parentheses.open" && input.at(-1)?.type == "parentheses.close")
		return parse(input.slice(1, -1));

	//Go through P E M-D A-S in reverse order to find the operator with the lowest priority
	for(const operatorsOfPriority of operators){
		let parenNestLevel = 0;
		//Find the index of the last (lowest priority) operator of the current priority
		//Iterate through string backwards
		for(let i = input.length - 1; i >= 0; i --){
			//Handle parentheses
			//The string is being iterated through backwards, so ) means go up a level and ( means go down a level
			if(input[i].type == "parentheses.close") parenNestLevel ++;
			else if(input[i].type == "parentheses.open") parenNestLevel --;
			if(parenNestLevel < 0)
				//nest level going below 0 means too many (, so unclosed parens
				throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: unclosed parentheses`);

			if(
				parenNestLevel == 0 && //the operator is not inside parentheses and
				operatorsOfPriority.map(o => `operator.${o}`).includes(input[i].type) //it is currently being searched for
			){
				//this is the lowest priority operator in the expression and should become the root node
				const left = input.slice(0, i);
				const right = input.slice(i + 1);
				//Make sure there is something on left and right of the operator
				if(left.length == 0) throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no expression on left side of operator ${input[i].text}`);
				if(right.length == 0) throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no expression on right side of operator ${input[i].text}`);
				return {
					token: input[i],
					nodes: [parse(left), parse(right)]
				};
			}
		}
		//Nest level being above zero at the end of the string means too many )
		if(parenNestLevel != 0)
			throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no parentheses group to close`);

		//No operators of the current priority found, look for operator with the next level higher priority
	}

	//No operators found at all, something went wrong
	throw new Error(`Invalid syntax: cannot parse expression \`${getText(input)}\`: no operators found`);
}

export function display(node:ASTNode, expand = false):string {
	if("type" in node){
		return `${node.text}`;
	} else if(!expand || ("type" in node.nodes[0] && "type" in node.nodes[1])){
		return (
		`(${display(node.nodes[0])} ${node.token.text} ${display(node.nodes[1])})`
		);
	} else {
		return (
`(
${display(node.nodes[0], expand).split("\n").map((l, i, a) => (i == a.length - 1 ? "↱ " : "\t") + l).join("\n")}
${node.token.text}
${display(node.nodes[1], expand).split("\n").map((l, i) => (i == 0 ? "↳ " : "\t") + l).join("\n")}
)`
		);
	}
}

export function evaluate(node:ASTNode):number {
	if("type" in node){
		if(node.type == "number.decimal") return Number(node.text);
		else throw new Error(`Cannot evaluate expression: cannot evaluate token ${node.text}: not a number`);
	} else if(node.token.type.startsWith("operator.")){
		switch(node.token.type.split("operator.")[1]){
			case "add": return evaluate(node.nodes[0]) + evaluate(node.nodes[1]);
			case "subtract": return evaluate(node.nodes[0]) - evaluate(node.nodes[1]);
			case "multiply": return evaluate(node.nodes[0]) * evaluate(node.nodes[1]);
			case "divide": return evaluate(node.nodes[0]) / evaluate(node.nodes[1]);
		}
	}
	throw new Error(`Cannot evaluate expression: cannot evaluate node <${display(node)}>: unknown operator token type ${node.token.type}`)
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
