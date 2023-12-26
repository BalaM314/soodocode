import * as lexer from "./lexer.js";
import * as parser from "./parser.js";
import * as statements from "./statements.js";
import * as utils from "./utils.js";
import * as runtime from "./runtime.js";
import type { ExpressionASTNode, ProgramAST } from "./parser.js";
import type { Statement } from "./statements.js";
import { displayExpression, fail, crash, SoodocodeError, escapeHTML } from "./utils.js";

function getElement<T extends typeof HTMLElement>(id:string, type:T){
	const element = <unknown>document.getElementById(id);
	if(element instanceof type) return element as T["prototype"];
	else if(element instanceof HTMLElement) crash(`Element with id ${id} was fetched as type ${type.name}, but was of type ${element.constructor.name}`);
	else crash(`Element with id ${id} does not exist`);
}

type FlattenTreeOutput = [depth:number, statement:Statement];

export function flattenTree(program:ProgramAST):FlattenTreeOutput[]{
	return program.map(s => {
		if("nodeGroups" in s) return flattenTree(s.nodeGroups.flat()).map(([depth, statement]) => [depth + 1, statement] as FlattenTreeOutput);
		else return [[0, s] as FlattenTreeOutput];
	}).flat(1);
}
export function displayProgram(program:ProgramAST):string {
	return program.map(node =>
		"nodeGroups" in node ?
			node.nodeGroups.length > 1 ?
`<div class="program-display-outer">\
${node.controlStatements[0].toString(true)}
<div class="program-display-inner">\
${displayProgram(node.nodeGroups[0])}\
</div>\
${node.controlStatements[1].toString(true)}
<div class="program-display-inner">\
${displayProgram(node.nodeGroups[1])}\
</div>${node.controlStatements[2].toString(true)}
</div>` : //TODO what the heck is this?
`<div class="program-display-outer">\
${node.controlStatements[0].toString(true)}
<div class="program-display-inner">\
${displayProgram(node.nodeGroups[0])}\
</div>\
${node.controlStatements.at(-1)!.toString(true)}
</div>`
			: node.toString(true) + "\n"
	).join("");
}

export function evaluateExpressionDemo(node:ExpressionASTNode):number {
	if("type" in node){
		if(node.type == "number.decimal") return Number(node.text);
		else if(node.type == "name") fail(`Cannot evaluate expression: variable content unknown`);
		else fail(`Cannot evaluate expression: cannot evaluate token ${node.text}: not a number`);
	} else if(node.operator == "function call"){
		fail(`Cannot evaluate expression ${node.operatorToken.text}(...): function call result unknown`);
	} else if(node.operator == "array access"){
		fail(`Cannot evaluate expression ${node.operatorToken.text}(...): array contents unknown`);
	} else switch(node.operator.type){
		case "operator.add": return evaluateExpressionDemo(node.nodes[0]) + evaluateExpressionDemo(node.nodes[1]);
		case "operator.subtract": return evaluateExpressionDemo(node.nodes[0]) - evaluateExpressionDemo(node.nodes[1]);
		case "operator.multiply": return evaluateExpressionDemo(node.nodes[0]) * evaluateExpressionDemo(node.nodes[1]);
		case "operator.divide": return evaluateExpressionDemo(node.nodes[0]) / evaluateExpressionDemo(node.nodes[1]);
		case "operator.integer_divide": return Math.trunc(evaluateExpressionDemo(node.nodes[0]) / evaluateExpressionDemo(node.nodes[1]));
		case "operator.mod": return evaluateExpressionDemo(node.nodes[0]) % evaluateExpressionDemo(node.nodes[1]);
		default: fail(`Cannot evaluate expression: cannot evaluate node <${displayExpression(node)}>: unknown operator type ${node.operator.type}`);
	}
}

const title = getElement("title", HTMLHeadingElement);
const soodocodeInput = getElement("soodocode-input", HTMLTextAreaElement);
const outputDiv = getElement("output-div", HTMLDivElement);
const dumpTokensButton = getElement("dump-tokens-button", HTMLButtonElement);
const executeSoodocodeButton = getElement("execute-soodocode-button", HTMLButtonElement);
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
		if(err instanceof SoodocodeError){
			expressionOutputDiv.innerText = "Error: " + (err as Error).message;
		} else {
			console.error(err);
			expressionOutputDiv.innerText = "Soodocode crashed! " + (err as Error).message;
		}
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
		if(err instanceof SoodocodeError){
			expressionOutputDiv.innerText = "Error: " + (err as Error).message;
		} else {
			console.error(err);
			expressionOutputDiv.innerText = "Soodocode crashed!" + (err as Error).message;
		}
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

dumpTokensButton.addEventListener("click", e => {
	try {
		const symbols = lexer.symbolize(soodocodeInput.value);
		const tokens = lexer.tokenize(symbols);
		const program = parser.parse(tokens);
		outputDiv.innerHTML = `\
<h3>Symbols</h3>\
<div class="display-scroller">
<table>
<thead>
<tr> <th>Text</th> <th>Type</th> </tr>
</thead>
<tbody>
${symbols.map(t => `<tr><td>${escapeHTML(t.text).replace('\n', `<span style="text-decoration:underline">\\n</span>`)}</td><td>${t.type}</td></tr>`).join("\n")}
</tbody>
</table>
</div>
<h3>Tokens</h3>\
<div class="display-scroller">
<table>
<thead>
<tr> <th>Text</th> <th>Type</th> </tr>
</thead>
<tbody>
${tokens.map(t => `<tr><td>${escapeHTML(t.text).replace('\n', `<span style="text-decoration:underline">\\n</span>`)}</td><td>${t.type}</td></tr>`).join("\n")}
</tbody>
</table>
</div>
<h3>Statements</h3>
${displayProgram(program)}`
		;
		outputDiv.style.color = "white";
	} catch(err){
		outputDiv.style.color = "red";
		if(err instanceof SoodocodeError){
			outputDiv.innerText = `Error: ${(err as any).message}`;
		} else {
			outputDiv.innerText = `Soodocode crashed! ${(err as any).message}`;
		}
	}
});

executeSoodocodeButton.addEventListener("click", e => {
	try {
		const symbols = lexer.symbolize(soodocodeInput.value);
		const tokens = lexer.tokenize(symbols);
		const program = parser.parse(tokens);
		let output:string[] = [];
		const rtm = new runtime.Runtime(
			() => prompt("Enter the value for (unknown)") ?? crash("input was empty"), m => output.push(m)
		);
		outputDiv.style.color = "white";
		rtm.runBlock(program);
		console.log(output);
		outputDiv.innerText = output.join("\n");
	} catch(err){
		outputDiv.style.color = "red";
		if(err instanceof SoodocodeError){
			outputDiv.innerText = `Error: ${(err as any).message}`;
		} else {
			outputDiv.innerText = `Soodocode crashed! ${(err as any).message}`;
		}
	}
});

function dumpFunctionsToGlobalScope(){
	Object.assign(window,
		lexer, parser, statements, utils, runtime,
		{
			runtime: new runtime.Runtime(() => prompt("Enter the value for (unknown)") ?? crash("input was empty"), m => console.log(`[Runtime] ${m}`))
		}
	);
}

dumpFunctionsToGlobalScope();

