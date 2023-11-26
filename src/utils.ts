import type { ExpressionASTNode } from "./parser.js";

export function displayExpression(node:ExpressionASTNode, expand = false, html = false):string {
	if("type" in node){
		return `${node.text}`;
	} else if(node.operator == "function call"){
		const text = `${node.operatorToken.text}(${node.nodes.map(n => displayExpression(n, expand, html))})`;
		return html ? `<span class="expression-display-block">${text}</span>` : text;
	} else if(!node.operator.unary && (!expand || ("type" in node.nodes[0] && "type" in node.nodes[1]))){
		//Not a unary operator and, argument says don't expand or all child nodes are leaf nodes.
		const text = `(${displayExpression(node.nodes[0], expand, html)} ${node.operatorToken.text} ${displayExpression(node.nodes[1], expand, html)})`;
		return html ? `<span class="expression-display-block">${text}</span>` : text;
	} else if(node.operator.unary && (!expand || ("type" in node.nodes[0]))){
		//Is a unary operator and, argument says don't expand or all child nodes are leaf nodes.
		const text = `(${node.operatorToken.text} ${displayExpression(node.nodes[0], expand, html)})`;
		return html ? `<span class="expression-display-block">${text}</span>` : text;
	} else {
		return (
`(
${displayExpression(node.nodes[0], expand).split("\n").map((l, i, a) => (i == a.length - 1 ? "↱ " : "\t") + l).join("\n")}
${node.operatorToken.text}
${displayExpression(node.nodes[1], expand).split("\n").map((l, i) => (i == 0 ? "↳ " : "\t") + l).join("\n")}
)`
		);
	}
}

export function splitArray<T>(arr:T[], split:[T] | ((func:T, index:number) => boolean)):T[][]{
	const output:T[][] = [[]];
	if(typeof split == "function"){
		for(let i = 0; i < arr.length; i ++){
			if(split(arr[i], i)) output.push([]);
			else output.at(-1)!.push(arr[i]);
		}
	} else {
		for(const el of arr){
			if(el == split[0]) output.push([]);
			else output.at(-1)!.push(el);
		}
	}
	return output;
}
