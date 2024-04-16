/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains code for the user interface.
*/
import { SoodocodeError } from "./utils.js";
import { ExpressionASTNode, ProgramAST, ProgramASTNode, ExpressionASTArrayTypeNode } from "./parser-types.js";
import { Statement } from "./statements.js";
type FlattenTreeOutput = [depth: number, statement: Statement];
export declare function flattenTree(program: ProgramASTNode[]): FlattenTreeOutput[];
export declare function displayExpressionHTML(node: ExpressionASTNode | ExpressionASTArrayTypeNode, expand?: boolean, format?: boolean): string;
export declare function displayProgram(program: ProgramAST | ProgramASTNode[]): string;
export declare function displayStatement(statement: Statement): string;
export declare function evaluateExpressionDemo(node: ExpressionASTNode): number;
export declare function download(filename: string, data: BlobPart): void;
export declare function showRange(text: string, error: SoodocodeError): string;
export {};