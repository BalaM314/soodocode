import type { ExpressionASTNode } from "./parser.js";

export function displayExpression(node:ExpressionASTNode, expand = false):string {
	if("type" in node){
		return `${node.text}`;
	} else if(!expand || ("type" in node.nodes[0] && "type" in node.nodes[1])){
		return (
		`(${displayExpression(node.nodes[0])} ${node.token.text} ${displayExpression(node.nodes[1])})`
		);
	} else {
		return (
`(
${displayExpression(node.nodes[0], expand).split("\n").map((l, i, a) => (i == a.length - 1 ? "↱ " : "\t") + l).join("\n")}
${node.token.text}
${displayExpression(node.nodes[1], expand).split("\n").map((l, i) => (i == 0 ? "↳ " : "\t") + l).join("\n")}
)`
		);
	}
}
