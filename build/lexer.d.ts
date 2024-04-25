import { SymbolType, SymbolizedProgram, TokenizedProgram } from "./lexer-types.js";
export declare const symbolTypeData: [
    identifier: string | [SymbolSpecifierFuncName] | RegExp,
    symbol: SymbolType
][];
export declare const tokenNameTypeData: {
    AND: "operator.and";
    APPEND: "keyword.file_mode.append";
    ARRAY: "keyword.array";
    BYREF: "keyword.pass_mode.by_reference";
    BYVAL: "keyword.pass_mode.by_value";
    CALL: "keyword.call";
    CASE: "keyword.case";
    CLASS: "keyword.class";
    CLOSEFILE: "keyword.close_file";
    CONSTANT: "keyword.constant";
    DECLARE: "keyword.declare";
    DEFINE: "keyword.define";
    DIV: "operator.integer_divide";
    ELSE: "keyword.else";
    ENDCASE: "keyword.case_end";
    ENDCLASS: "keyword.class_end";
    ENDFUNCTION: "keyword.function_end";
    ENDIF: "keyword.if_end";
    ENDPROCEDURE: "keyword.procedure_end";
    ENDTYPE: "keyword.type_end";
    ENDWHILE: "keyword.while_end";
    FALSE: "boolean.false";
    FOR: "keyword.for";
    FUNCTION: "keyword.function";
    GETRECORD: "keyword.get_record";
    IF: "keyword.if";
    INHERITS: "keyword.inherits";
    INPUT: "keyword.input";
    MOD: "operator.mod";
    NEW: "keyword.new";
    NEXT: "keyword.for_end";
    NOT: "operator.not";
    OF: "keyword.of";
    OPENFILE: "keyword.open_file";
    OR: "operator.or";
    OTHERWISE: "keyword.otherwise";
    OUTPUT: "keyword.output";
    PRIVATE: "keyword.class_modifier.private";
    PROCEDURE: "keyword.procedure";
    PUBLIC: "keyword.class_modifier.public";
    PUTRECORD: "keyword.put_record";
    RANDOM: "keyword.file_mode.random";
    READ: "keyword.file_mode.read";
    READFILE: "keyword.read_file";
    REPEAT: "keyword.dowhile";
    RETURN: "keyword.return";
    RETURNS: "keyword.returns";
    SEEK: "keyword.seek";
    SET: "keyword.set";
    STEP: "keyword.step";
    SUPER: "keyword.super";
    THEN: "keyword.then";
    TO: "keyword.to";
    TRUE: "boolean.true";
    TYPE: "keyword.type";
    UNTIL: "keyword.dowhile_end";
    WHILE: "keyword.while";
    WRITE: "keyword.file_mode.write";
    WRITEFILE: "keyword.write_file";
} & {
    [index: string]: "string" | "number.decimal" | "char" | "brace.open" | "brace.close" | "bracket.open" | "bracket.close" | "parentheses.open" | "parentheses.close" | "punctuation.colon" | "punctuation.semicolon" | "punctuation.comma" | "punctuation.period" | "comment" | "name" | "boolean.true" | "boolean.false" | "keyword.declare" | "keyword.define" | "keyword.constant" | "keyword.output" | "keyword.input" | "keyword.call" | "keyword.if" | "keyword.then" | "keyword.else" | "keyword.if_end" | "keyword.for" | "keyword.to" | "keyword.for_end" | "keyword.step" | "keyword.while" | "keyword.while_end" | "keyword.dowhile" | "keyword.dowhile_end" | "keyword.function" | "keyword.function_end" | "keyword.procedure" | "keyword.procedure_end" | "keyword.return" | "keyword.returns" | "keyword.pass_mode.by_reference" | "keyword.pass_mode.by_value" | "keyword.type" | "keyword.type_end" | "keyword.open_file" | "keyword.read_file" | "keyword.write_file" | "keyword.close_file" | "keyword.get_record" | "keyword.put_record" | "keyword.seek" | "keyword.file_mode.read" | "keyword.file_mode.write" | "keyword.file_mode.append" | "keyword.file_mode.random" | "keyword.case" | "keyword.of" | "keyword.case_end" | "keyword.otherwise" | "keyword.class" | "keyword.class_end" | "keyword.new" | "keyword.super" | "keyword.inherits" | "keyword.class_modifier.private" | "keyword.class_modifier.public" | "keyword.array" | "keyword.set" | "newline" | "operator.add" | "operator.minus" | "operator.multiply" | "operator.divide" | "operator.mod" | "operator.integer_divide" | "operator.and" | "operator.or" | "operator.not" | "operator.equal_to" | "operator.not_equal_to" | "operator.less_than" | "operator.greater_than" | "operator.less_than_equal" | "operator.greater_than_equal" | "operator.assignment" | "operator.pointer" | "operator.string_concatenate" | undefined;
};
type SymbolSpecifierFuncName = "isAlphanumeric" | "isNumber";
export declare function symbolize(input: string): SymbolizedProgram;
export declare function tokenize(input: SymbolizedProgram): TokenizedProgram;
export {};
