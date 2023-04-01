
type lexemeTypes = Record<string, LexemeType>;
interface LexemeType {
	matcher: RegExp;
}
interface LexemeAST {
	childNodes: ASTNode[];
	
}
type ASTNode = {
	
}

interface Lexer {
	lex(input:string): LexemeAST;
}