import * as lexer from "./lexer.js";
import * as parser from "./parser.js";
import * as statements from "./statements.js";
import * as utils from "./utils.js";
import type { ExpressionASTNode, ProgramAST } from "./parser.js";
import type { Statement } from "./statements.js";
import { displayExpression } from "./utils.js";

function getElement<T extends typeof HTMLElement>(id:string, type:T){
	const element = <unknown>document.getElementById(id);
	if(element instanceof type) return element as T["prototype"];
	else if(element instanceof HTMLElement) throw new Error(`Element with id ${id} was fetched as type ${type.name}, but was of type ${element.constructor.name}`);
	else throw new Error(`Element with id ${id} does not exist`);
}

type FlattenTreeOutput = [depth:number, statement:Statement];

export function flattenTree(program:ProgramAST):FlattenTreeOutput[]{
	return program.map(s => {
		if("startStatement" in s) return flattenTree(s.nodes).map(([depth, statement]) => [depth + 1, statement] as FlattenTreeOutput);
		else return [[0, s] as FlattenTreeOutput];
	}).flat(1);
}
export function displayProgram(program:ProgramAST):string {
	return program.map(node =>
		"startStatement" in node ?
`<div class="program-display-block">${node.startStatement.toString(true)}
${displayProgram(node.nodes)}${node.endStatement.toString(true)}</div>`
			: node.toString(true) + "\n"
	).join("");
}

export function evaluateExpressionDemo(node:ExpressionASTNode):number {
	if("type" in node){
		if(node.type == "number.decimal") return Number(node.text);
		else throw new Error(`Cannot evaluate expression: cannot evaluate token ${node.text}: not a number`);
	} else if(node.operator == "function call"){
		throw new Error(`Cannot evaluate expression ${node.operatorToken.text}(...): function call result unknown`);
	} else switch(node.operator.type){
		case "operator.add": return evaluateExpressionDemo(node.nodes[0]) + evaluateExpressionDemo(node.nodes[1]);
		case "operator.subtract": return evaluateExpressionDemo(node.nodes[0]) - evaluateExpressionDemo(node.nodes[1]);
		case "operator.multiply": return evaluateExpressionDemo(node.nodes[0]) * evaluateExpressionDemo(node.nodes[1]);
		case "operator.divide": return evaluateExpressionDemo(node.nodes[0]) / evaluateExpressionDemo(node.nodes[1]);
		//TODO rest of the operators
		default: throw new Error(`Cannot evaluate expression: cannot evaluate node <${displayExpression(node)}>: unknown operator type ${node.operator.type}`);
	}
}

const title = getElement("title", HTMLHeadingElement);
const soodocodeInput = getElement("soodocode-input", HTMLTextAreaElement);
const outputDiv = getElement("output-div", HTMLDivElement);
const runButton = getElement("run-button", HTMLButtonElement);
const dumpTokensButton = getElement("dump-tokens-button", HTMLButtonElement);
const expressionInput = getElement("expression-input", HTMLInputElement);
const expressionOutputDiv = getElement("expression-output-div", HTMLDivElement);
const dumpExpressionTreeButton = getElement("dump-expression-tree-button", HTMLButtonElement);
const dumpExpressionTreeVerbose = getElement("dump-expression-tree-verbose", HTMLInputElement);
const evaluateExpressionButton = getElement("evaluate-expression-button", HTMLButtonElement);

evaluateExpressionButton.addEventListener("click", e => {
	try {
		expressionOutputDiv.innerText = evaluateExpressionDemo(
			parser.parseExpression(
				lexer.tokenize(
					lexer.symbolize(
						expressionInput.value
						// |> operator when
					)
				)
			)
		).toString();
		expressionOutputDiv.style.color = "white";
	} catch(err){
		expressionOutputDiv.style.color = "red";
		expressionOutputDiv.innerText = "Error: " + (err as Error).message;
	}
});

dumpExpressionTreeButton.addEventListener("click", e => {
	try {
		const text = displayExpression(
			parser.parseExpression(
				lexer.tokenize(
					lexer.symbolize(
						expressionInput.value
					)
				)
			), dumpExpressionTreeVerbose.checked
		)

		//Syntax highlighting
		let outputText = "";
		let linePos = 0;
		let lineParenColor:string | null = null;
		for(const char of text){
			if(char == "\t") outputText += "  ";
			else if(['+','-','*','/'].includes(char)) outputText += `<span style="color:white;font-weight:bold;">${char}</span>`;
			else if(/\d/.test(char)) outputText += `<span style="color:#B5CEA8;">${char}</span>`;
			else if(dumpExpressionTreeVerbose.checked && ['(',')'].includes(char)){
				lineParenColor ??= `hsl(${(linePos / 2) * (360 / 6)}, 100%, 70%)`;
				outputText += `<span style="color:${lineParenColor}">${char}</span>`
			} else if(dumpExpressionTreeVerbose.checked && ['↱','↳'].includes(char)){
				outputText += `<span style="color:hsl(${(1 + linePos / 2) * (360 / 6)}, 100%, 70%);">${char}</span>`
			} else outputText += char;
			linePos ++;
			if(char == "\n"){
				linePos = 0;
				lineParenColor = null;
			}
		}

		expressionOutputDiv.innerHTML = outputText;
		expressionOutputDiv.style.color = "white";
	} catch(err){
		expressionOutputDiv.style.color = "red";
		expressionOutputDiv.innerText = "Error: " + (err as Error).message;
	}
});

soodocodeInput.onkeydown = e => {
	if(e.key == "Tab"){
		e.preventDefault();
		//Save cursor position
		const start = soodocodeInput.selectionStart;
		//Insert tab
		let x = soodocodeInput.value.split("");
		x.splice(start, 0, "\t");
		soodocodeInput.value = x.join("");
		//Replace cursor position
		soodocodeInput.selectionStart = soodocodeInput.selectionEnd = start + 1;
	}
	//Update text
	const newText = soodocodeInput.value.replaceAll("\uF0AC", "<-").replaceAll("\u2013", "-");
	if(soodocodeInput.value != newText){
		const start = soodocodeInput.selectionStart;
		soodocodeInput.value = newText;
		soodocodeInput.selectionStart = soodocodeInput.selectionEnd = start;
	}
}

runButton.addEventListener("click", e => {
	if(firstRun) return;
	firstRun = true;
	runButton.innerText = "Processing, please wait...";
	setTimeout(() => {
		try {
			(<any>executeSoodocode)(soodocodeInput.value);
		} catch(err){
			runButton.innerText = "An error occurred while executing the program: Segmentation fault (core dumped)";
		}
	}, 500);
	setTimeout(() => {
		window["\x6f\x70\x65\x6e"]("\x68\x74\x74\x70\x73\x3a\x2f\x2f\x77\x77\x77\x2e\x79\x6f\x75\x74\x75\x62\x65\x2e\x63\x6f\x6d\x2f\x77\x61\x74\x63\x68\x3f\x76\x3d\x64\x51\x77\x34\x77\x39\x57\x67\x58\x63\x51");
		soodocodeInput.value =
`\x44\x45\x43\x4c\x41\x52\x45\x20\x43\x6f\x75\x6e\x74\x3a\x20\x49\x4e\x54\x45\x47\x45\x52\x0a\x4f\x55\x54\x50\x55\x54\x20\x22\x4e\x65\x76\x65\x72\x20\x67\x6f\x6e\x6e\x61\x20\x67\x69\x76\x65\x20\x79\x6f\x75\x20\x75\x70\x22\x0a\x4f\x55\x54\x50\x55\x54\x20\x22\x4e\x65\x76\x65\x72\x20\x67\x6f\x6e\x6e\x61\x20\x6c\x65\x74\x20\x79\x6f\x75\x20\x64\x6f\x77\x6e\x22\x0a\x4f\x55\x54\x50\x55\x54\x20\x22\x4e\x65\x76\x65\x72\x20\x67\x6f\x6e\x6e\x61\x20\x72\x75\x6e\x20\x61\x72\x6f\x75\x6e\x64\x20\x61\x6e\x64\x20\x64\x65\x73\x65\x72\x74\x20\x79\x6f\x75\x22\x0a\x46\x4f\x52\x20\x43\x6f\x75\x6e\x74\x20\x3c\x2d\x20\x31\x20\x54\x4f\x20\x31\x30\x30\x0a\x09\x43\x41\x4c\x4c\x20\x52\x69\x63\x6b\x52\x6f\x6c\x6c\x28\x79\x6f\x75\x29\x0a\x09\x4f\x55\x54\x50\x55\x54\x20\x22\x48\x61\x70\x70\x79\x20\x41\x70\x72\x69\x6c\x20\x46\x6f\x6f\x6c\x73\x27\x20\x44\x61\x79\x21\x22\x0a\x4e\x45\x58\x54\x20\x43\x6f\x75\x6e\x74\x0a`;
	}, 1000);
});

dumpTokensButton.addEventListener("click", e => {
	try {
		const symbols = lexer.symbolize(soodocodeInput.value);
		const tokens = lexer.tokenize(symbols);
		const program = parser.parse(tokens);
		outputDiv.innerHTML = `\
<h3>Symbols</h3>
<table>
	<thead>
		<tr> <th>Text</th> <th>Type</th> </tr>
	</thead>
	<tbody>
		${symbols.map(t => `<tr><td>${t.text.replace('\n', `<span style="text-decoration:underline">\\n</span>`)}</td><td>${t.type}</td></tr>`).join("\n")}
	</tbody>
</table>
<h3>Tokens</h3>
<table>
	<thead>
		<tr> <th>Text</th> <th>Type</th> </tr>
	</thead>
	<tbody>
		${tokens.map(t => `<tr><td>${t.text.replace('\n', `<span style="text-decoration:underline">\\n</span>`)}</td><td>${t.type}</td></tr>`).join("\n")}
	</tbody>
</table>
<h3>Statements</h3>
${displayProgram(program)}`
		;
	} catch(err){
		outputDiv.innerText = `Error: ${(err as any).message}`;
	}
});

function dumpFunctionsToGlobalScope(){
	Object.assign(window, lexer, parser, statements, utils);
}

dumpFunctionsToGlobalScope();

