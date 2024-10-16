/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains blackbox tests that can be applied to other pseudocode engines.
*/
/* eslint-disable indent */
import "jasmine";
import { symbolize, tokenize } from "../../build/lexer/index.js";
import { parse } from "../../build/parser/index.js";
import { Runtime } from "../../build/runtime/index.js";
import { SoodocodeError, crash } from "../../build/utils/funcs.js";

type ErrorData = string;

const fullTests:Record<string, [code:string, output:string[] | ErrorData, inputs?:string[]]> = {
//#region misc
empty: [
``,
[]
],
mostlyEmpty: [
`\t
\t 

`,
[]
],
output_basic: [
`OUTPUT "Hello world!"`,
["Hello world!"]
],
parse_declare: [
`DECLARE x: INTEGER`,
[]
],
run_unusual_assignment_operators: [
`DECLARE x: INTEGER
x <- 5
x <-- 5
x <‐ 5
x <‑ 5
x <‒ 5
x <– 5
x <— 5
x <― 5
x <‐‐ 5
x <‑‑ 5
x <‒‒ 5
x <–– 5
x <—— 5
x <―― 5
x \uF0AC 5
x ← 5
x ⇐ 5
x ⇠ 5
x ⇽ 5`,
[]
],
parse_high_unicode_chars: [
`DECLARE sussy: CHAR
sussy <- '😀'`,
[]
],
parse_high_unicode_chars_illegal_flag: [
`DECLARE amongus: CHAR
amongus <- '🇺🇳'`,
`Flags are actually two characters`
],
parse_high_unicode_chars_illegal_multi: [
`DECLARE amongus: CHAR
amongus <- '👨‍👨‍👧‍👧'`,
`actually 7 characters`
],
run_high_unicode_chars: [
`OUTPUT ASC('🤖')
OUTPUT CHR(129302), "gus"`,
["129302", "🤖gus"]
],
run_length_high_unicode_chars: [
`OUTPUT LENGTH("🤖")
OUTPUT LENGTH("🇺🇳")
OUTPUT LENGTH("👨‍👨‍👧‍👧")
OUTPUT LENGTH("am🇺🇳gus🤖🤖")`,
["1", "2", "7", "9"]
],
slice_high_unicode_chars: [
`OUTPUT LEFT("🤖am🇺🇳gus", 4)
OUTPUT RIGHT("am🇺🇳gus🤖", 5)
OUTPUT MID("sussy am🤖🇺🇳🤖gus", 8, 6)
OUTPUT MID("👨‍👨‍👧‍👧", 3, 1)
OUTPUT MID("👨‍👨‍👧‍👧", 3, 2)`,
["🤖am🇺", "🇳gus🤖", "m🤖🇺🇳🤖g", "👨", "👨\u200D"]
],
declare_duplicate_illegal: [
`DECLARE x: INTEGER
DECLARE x: INTEGER`,
"already defined"
],
declare_duplicate_legal: [
`DECLARE x: INTEGER
FOR i <- 1 TO 5
	DECLARE x: INTEGER
NEXT i`,
[]
],
parse_invalid_expression_statement: [
`2 + 2`,
`Expected a statement, not an expression`
],
string_escape_sequences: [
`
OUTPUT "a\\na"
OUTPUT "a\\ta"
OUTPUT "a\\"a"
OUTPUT "a\\'a"
OUTPUT '\\''
OUTPUT "\\\\"`,
["a\na", "a\ta", "a\"a", "a'a", "'", "\\"]
],
more_string_escape_sequences: [
`OUTPUT "a\\\\na"`,
["a\\na"]
],
no_invalid_escape_sequences: [
`OUTPUT "a\\aa"`,
`Unescaped backslash`
],
js_reserved_words_proto_1: [
`TYPE __proto__ = ^INTEGER
DECLARE hasOwnProperty: INTEGER
hasOwnProperty <- 5
DECLARE __proto__: __proto__
__proto__ <- ^hasOwnProperty
OUTPUT __proto__^`,
["5"]
],
js_reserved_words_proto_2: [
`TYPE __proto__
	DECLARE __proto__: STRING
	DECLARE isPrototypeOf, propertyIsEnumerable: BOOLEAN
ENDTYPE

DECLARE __proto__, hasOwnProperty: __proto__
__proto__.__proto__ <- "JS is a wonderful language!"
__proto__.isPrototypeOf <- TRUE
__proto__.propertyIsEnumerable <- TRUE
OUTPUT __proto__.__proto__
OUTPUT __proto__.isPrototypeOf
OUTPUT __proto__.propertyIsEnumerable

__proto__ <- __proto__`,
["JS is a wonderful language!", "TRUE", "TRUE"]
],
js_reserved_words_proto_3: [
`CLASS __proto__
	PUBLIC __proto__: STRING
	PUBLIC isPrototypeOf, propertyIsEnumerable: BOOLEAN
	PUBLIC __defineSetter__: ARRAY OF BOOLEAN
	PUBLIC PROCEDURE NEW(hasOwnProperty, valueOf:STRING)
		OUTPUT hasOwnProperty
		OUTPUT valueOf
		isPrototypeOf <- TRUE
		propertyIsEnumerable <- LENGTH(valueOf) > 5
	__proto__ <- "Object.create(null) my beloved"
	DECLARE temp: ARRAY[0:LENGTH(hasOwnProperty)] OF BOOLEAN
	temp[0] <- TRUE
	__defineSetter__ <- temp
	ENDPROCEDURE
	PUBLIC FUNCTION __lookupGetter__() RETURNS INTEGER
		RETURN 5
	ENDFUNCTION
ENDCLASS

DECLARE __proto__: __proto__
__proto__ <- NEW __proto__("JS is a wonderful language!", "123456")
OUTPUT __proto__.__proto__
OUTPUT __proto__.isPrototypeOf
OUTPUT __proto__.propertyIsEnumerable
OUTPUT __proto__.__lookupGetter__()

PROCEDURE nowCloneIt(BYVAL __defineGetter__:__proto__)
	OUTPUT LENGTH(__defineGetter__.__defineSetter__)
	OUTPUT __defineGetter__.__defineSetter__[0]
	__defineGetter__.__defineSetter__[0] <- FALSE
	OUTPUT __defineGetter__.__defineSetter__[0]
ENDPROCEDURE

OUTPUT LENGTH(__proto__.__defineSetter__)
OUTPUT __proto__.__defineSetter__[0]
CALL nowCloneIt(__proto__)
OUTPUT __proto__.__defineSetter__[0]`,
[
	"JS is a wonderful language!", "123456", "Object.create(null) my beloved", "TRUE", "TRUE", "5",
	"28", "TRUE", "28", "TRUE", "FALSE", "TRUE"
]
],
//#endregion
//#region types
run_bool: [
`DECLARE x: BOOLEAN
x <- TRUE
x <- FALSE`,
[]
],
run_integer: [
`DECLARE x: INTEGER
x <- 5
x <- 12345`,
[]
],
run_real: [
`DECLARE x: REAL
x <- 5.9
x <- 0.1234
x <- 13434.133`,
[]
],
run_real_with_int_literal: [
`DECLARE x: REAL
x <- 5
x <- 12`,
[]
],
run_string: [
`DECLARE x: STRING
x <- "h"
x <- "ell"
x <- "o world!"`,
[]
],
run_char: [
`DECLARE x: CHAR
x <- 'h'
x <- ' '`,
[]
],
run_int_range: [
`DECLARE x: 1..10
x <- 1
x <- 2
x <- 9
x <- 10`,
[]
],
run_int_range_fail_low: [
`DECLARE x: 1..10
x <- 0`,
`not in range`
],
run_int_range_fail_high: [
`DECLARE x: 1..10
x <- 11`,
`not in range`
],
run_int_range_fail_not_int: [
`DECLARE x: 1..10
x <- 5.5`,
`not an integer`
],
//#endregion
//#region arrays
run_array_basic: [
`DECLARE x: ARRAY[1:10] OF INTEGER
x[10] <- 5
OUTPUT x[10]`,
["5"]
],
illegal_array_type_in_variable: [
`DECLARE x: ARRAY OF INTEGER`,
`length must be specified`
],
varlength_array_type_in_function: [
`FUNCTION amogus(x: ARRAY OF INTEGER) RETURNS INTEGER
	RETURN LENGTH(x)
ENDFUNCTION`,
[]
],
varlength_array_type_in_class: [
`CLASS amogus
	PUBLIC x: ARRAY OF INTEGER
	PUBLIC PROCEDURE NEW(X: ARRAY OF INTEGER)
		x <- X
	ENDPROCEDURE
	PUBLIC FUNCTION Length() RETURNS INTEGER
		RETURN LENGTH(x)
	ENDFUNCTION
ENDCLASS
DECLARE arr: ARRAY[1:100] OF INTEGER
DECLARE a: amogus
a <- NEW amogus(arr)
OUTPUT a.Length()
OUTPUT LENGTH(a.x)`,
["100", "100"]
],
varlength_array_type_in_class_and_access: [
`CLASS amogus
	PUBLIC x: ARRAY OF INTEGER
	PUBLIC PROCEDURE NEW(X: ARRAY OF INTEGER)
		x <- X
	ENDPROCEDURE
	PUBLIC FUNCTION Length() RETURNS INTEGER
		RETURN LENGTH(x)
	ENDFUNCTION
ENDCLASS
FUNCTION Length(x: ARRAY OF INTEGER) RETURNS INTEGER
	RETURN LENGTH(x)
ENDFUNCTION
DECLARE arr: ARRAY[1:100] OF INTEGER
DECLARE a: amogus
a <- NEW amogus(arr)
OUTPUT a.Length()
OUTPUT LENGTH(a.x)
OUTPUT Length(a.x)
`,
["100", "100", "100"]
],
run_array_computed_size_static: [
`DECLARE x: ARRAY[1:10+10] OF INTEGER
x[20] <- 5
OUTPUT x[20]
OUTPUT LENGTH(x)`,
["5", "20"]
],
run_array_computed_size_variable_available: [
`PROCEDURE amogus(a: INTEGER)
	DECLARE x: ARRAY[1:a+1] OF INTEGER
	x[20] <- 5
	OUTPUT x[20]
	OUTPUT LENGTH(x)
ENDPROCEDURE
CALL amogus(50)`,
["5", "51"]
],
run_array_computed_size_parens_variable_available: [
`FUNCTION sus(a, b: INTEGER) RETURNS INTEGER
	RETURN 50
ENDFUNCTION
PROCEDURE amogus()
	DECLARE x: ARRAY[1:sus(2, 2) + 1] OF INTEGER
	x[20] <- 5
	OUTPUT x[20]
	OUTPUT LENGTH(x)
ENDPROCEDURE
CALL amogus()`,
["5", "51"]
],
run_array_computed_size_brackets_variable_available: [
`FUNCTION sus(a, b: INTEGER) RETURNS INTEGER
	RETURN 50
ENDFUNCTION
PROCEDURE amogus()
	DECLARE array1: ARRAY[1:10] OF INTEGER
	array1[4] <- 2
	DECLARE x: ARRAY[1:sus(2, array1[2 + 2]) + 1] OF INTEGER
	x[20] <- 5
	OUTPUT x[20]
	OUTPUT LENGTH(x)
ENDPROCEDURE
CALL amogus()`,
["5", "51"]
],
run_array_computed_size_constant_declare: [
`CONSTANT a = 50
DECLARE x: ARRAY[1:a+1] OF INTEGER
x[20] <- 5
OUTPUT x[20]
OUTPUT LENGTH(x)`,
["5", "51"]
],
run_array_computed_size_variable_declare: [
`DECLARE a: INTEGER
a <- 50
DECLARE x: ARRAY[1:a+1] OF INTEGER
x[20] <- 5
OUTPUT x[20]
OUTPUT LENGTH(x)`,
["5", "51"]
],
run_array_computed_size_variable_declare_uninitialized_1: [
`DECLARE a: INTEGER
DECLARE x: ARRAY[1:a+1] OF INTEGER
x[20] <- 5
OUTPUT x[20]
OUTPUT LENGTH(x)`,
`Variable "a"`
],
run_array_computed_size_variable_declare_uninitialized_2: [
`DECLARE a: INTEGER
DECLARE x: ARRAY[1:a+1] OF INTEGER
a <- 50
x[20] <- 5
OUTPUT x[20]
OUTPUT LENGTH(x)`,
`Variable "a"`
],
run_array_computed_size_constant_in_record_type: [
`CONSTANT a = 50
TYPE amogus
	DECLARE prop: ARRAY[1:a+1] OF INTEGER
ENDTYPE
DECLARE x: amogus
x.prop[20] <- 5
OUTPUT x.prop[20]
OUTPUT LENGTH(x.prop)`,
["5", "51"]
],
run_array_computed_size_variable_in_record_type: [
`DECLARE a: INTEGER
a <- 50
TYPE amogus
	DECLARE prop: ARRAY[1:a+1] OF INTEGER
ENDTYPE
DECLARE x: amogus
x.prop[20] <- 5
OUTPUT x.prop[20]
OUTPUT LENGTH(x.prop)`,
`"a" does not exist`
],
function_variable_length_array_arg: [
`FUNCTION amogus(x: ARRAY OF INTEGER) RETURNS INTEGER
	OUTPUT x[7]
	RETURN LENGTH(x)
ENDFUNCTION
DECLARE x: ARRAY[1:10] OF INTEGER
x[7] <- 15
OUTPUT amogus(x)`,
["15", "10"],
],
function_fixed_length_array_arg: [
`FUNCTION amogus(x: ARRAY[1:10] OF INTEGER) RETURNS INTEGER
	OUTPUT x[7]
	RETURN LENGTH(x)
ENDFUNCTION
DECLARE x: ARRAY[1:10] OF INTEGER
x[7] <- 15
OUTPUT amogus(x)`,
["15", "10"],
],
function_coerce_valid_fixed_length_array_arg: [
`FUNCTION amogus(x: ARRAY[0:9] OF INTEGER) RETURNS INTEGER
	OUTPUT x[7]
	OUTPUT x[6]
	RETURN LENGTH(x)
ENDFUNCTION
DECLARE x: ARRAY[1:10] OF INTEGER
x[7] <- 15
OUTPUT amogus(x)`,
["0", "15", "10"],
],
function_different_invalid_fixed_length_array_arg: [
`FUNCTION amogus(x: ARRAY[0:10] OF INTEGER) RETURNS INTEGER
	OUTPUT x[7]
	RETURN LENGTH(x)
ENDFUNCTION
DECLARE x: ARRAY[1:10] OF INTEGER
x[7] <- 15
OUTPUT amogus(x)`,
`different length`,
],
//#endregion
//#region functions
parse_procedure_blank: [
`PROCEDURE name()
ENDPROCEDURE`,
[]
],
run_procedure_blank: [
`PROCEDURE name()
ENDPROCEDURE
CALL name()`,
[]
],
run_procedure_blank_wrong_arg_count: [
`PROCEDURE name()
ENDPROCEDURE
CALL name(2)`,
`Incorrect number of arguments for function "name"`
],
parse_function_mostly_blank: [
`FUNCTION name() RETURNS INTEGER
RETURN 0
ENDFUNCTION`,
[]
],
run_function_mostly_blank: [
`FUNCTION name() RETURNS INTEGER
	RETURN 0
ENDFUNCTION
OUTPUT name()`,
["0"]
],
parse_procedure_simple_args: [
`PROCEDURE name(x:INTEGER, y:STRING)
	OUTPUT x
	OUTPUT y
ENDPROCEDURE`,
[]
],
run_procedure_simple_args: [
`PROCEDURE name(x:INTEGER, y:STRING)
	OUTPUT x
	OUTPUT y
ENDPROCEDURE
CALL name(12, "hi")`,
["12", "hi"]
],
parse_function_simple_args: [
`FUNCTION name(x:INTEGER, y:STRING) RETURNS INTEGER
	OUTPUT x
	OUTPUT y
	RETURN x + 1
ENDFUNCTION`,
[]
],
run_function_simple_args: [
`FUNCTION name(x:INTEGER, y:STRING) RETURNS INTEGER
	OUTPUT x
	OUTPUT y
	RETURN x + 1
ENDFUNCTION
OUTPUT name(12, "hi")`,
["12", "hi", "13"]
],
parse_procedure_complex_args: [
`PROCEDURE name(x, y: INTEGER, z, aa_aaaa: ARRAY[0:50, 0:10] OF BOOLEAN)
	OUTPUT x
	OUTPUT y
	FOR i <- 0 TO 50
		OUTPUT z[i, 5]
	NEXT i
ENDPROCEDURE`,
[]
],
run_procedure_complex_args: [
`PROCEDURE name(x, y: INTEGER, z, aa_aaaa: ARRAY[0:50, 0:10] OF BOOLEAN)
	OUTPUT x
	OUTPUT y
	OUTPUT z[0, 0]
	FOR i <- 0 TO 50
		OUTPUT z[i, 5]
	NEXT i
ENDPROCEDURE
DECLARE a: ARRAY[0:50, 0:10] OF BOOLEAN
a[50, 5] <- TRUE
a[0, 5] <- TRUE
a[0, 0] <- TRUE
CALL name(10, -52, a, a)`,
["10", "-52", "TRUE", "TRUE", ...Array<string>(49).fill("FALSE"), "TRUE"]
],
parse_function_complex_args: [
`FUNCTION name(x, y: INTEGER, z, aa_aaaa: ARRAY[0:50, 0:10] OF BOOLEAN) RETURNS INTEGER
	OUTPUT x
	OUTPUT y
	FOR i <- 0 TO 50
		OUTPUT aa_aaaa[i, 5]
	NEXT i
	RETURN x + 1
ENDFUNCTION`,
[]
],
run_function_complex_args: [
`FUNCTION name(x, y: INTEGER, z, aa_aaaa: ARRAY[0:50, 0:10] OF BOOLEAN) RETURNS INTEGER
	OUTPUT x
	OUTPUT y
	OUTPUT z[0, 0]
	FOR i <- 0 TO 50
		OUTPUT aa_aaaa[i, 5]
	NEXT i
	RETURN x + 1
ENDFUNCTION
DECLARE a: ARRAY[0:50, 0:10] OF BOOLEAN
a[50, 5] <- TRUE
a[0, 5] <- TRUE
a[0, 0] <- TRUE
OUTPUT name(10, -52, a, a)`,
["10", "-52", "TRUE", "TRUE", ...Array<string>(49).fill("FALSE"), "TRUE", "11"]
],
parse_procedure_complex_args_pass_mode: [
`PROCEDURE name(BYVAL x, BYREF y: INTEGER, z, BYVAL aa_aaaa: ARRAY[0:50, 0:10] OF BOOLEAN)
	OUTPUT x
	OUTPUT y
	FOR i <- 0 TO 50
		OUTPUT aa_aaaa[i, 5]
	NEXT i
ENDPROCEDURE`,
[]
],
parse_function_complex_args_pass_mode: [
`FUNCTION name(BYVAL x, BYREF y: INTEGER, z, BYVAL aa_aaaa: ARRAY[0:50, 0:10] OF BOOLEAN) RETURNS INTEGER
	OUTPUT x
	OUTPUT y
	FOR i <- 0 TO 50
		OUTPUT aa_aaaa[i, 5]
	NEXT i
	RETURN x + 1
ENDFUNCTION`,
[]
],
run_function_recursive_declare: [
`FUNCTION Factorial(x: INTEGER) RETURNS INTEGER
DECLARE Random: INTEGER
Random <- 10
IF x <= 1 THEN
	RETURN 1
ENDIF
RETURN x * Factorial(x - 1)
ENDFUNCTION

OUTPUT Factorial(5)
`,
["120"]
],
return_from_blocks_in_function: [
`FUNCTION amoamogus() RETURNS INTEGER
	IF FALSE THEN
		DECLARE arr: ARRAY[1:1] OF INTEGER
		OUTPUT arr[2]
	ELSE
		FOR _ <- 1 TO 3 STEP 2
			DECLARE flag: BOOLEAN
			flag <- TRUE
			WHILE flag
				flag <- FALSE
				REPEAT
					CASE OF 1
						1:
							RETURN 5
							DECLARE arr: ARRAY[1:1] OF INTEGER
							OUTPUT arr[2]
					ENDCASE
				UNTIL TRUE
			ENDWHILE
		NEXT _
	ENDIF
ENDFUNCTION
OUTPUT amoamogus()`,
["5"]
],
//#endregion
//#region enums
parse_enum: [
`TYPE enum = (a, b, ccccccc)`,
[]
],
parse_enum_empty: [
`TYPE enum = ()`,
[]
],
run_enum: [
`TYPE enum = (aaa, bbb, ccc)
DECLARE x: enum
x <- aaa
IF x = bbb THEN
	OUTPUT "true"
ELSE
	OUTPUT "false"
ENDIF`,
["false"]
],
add_enum: [
`TYPE enum = (aaa, bbb, ccc)
DECLARE x: enum
x <- aaa
IF x + 1 = bbb THEN
	OUTPUT "true"
ELSE
	OUTPUT "false"
ENDIF`,
["true"]
],
coerce_enum_to_string: [
`TYPE enum = (aaa, bbb, ccc)
OUTPUT aaa`,
["aaa"]
],
//#endregion
//#region record types
record_type_blank: [
`TYPE amogus
ENDTYPE`,
[]
],
record_type_duplicate: [
`TYPE amogus
ENDTYPE
TYPE amogus
ENDTYPE`,
"defined twice"
],
record_type_fields: [
`TYPE amogus
	DECLARE sus: INTEGER
ENDTYPE`,
[]
],
record_type_fields_nonexistent: [
`TYPE amogus
	DECLARE sus: SUSSY
ENDTYPE`,
"SUSSY"
],
record_type_invalid_statement: [
`TYPE amogus
	TYPE invalid
	ENDTYPE
ENDTYPE`,
` statement is not valid here`
],
record_type_invalid_statement_2: [
`TYPE amogus
	OUTPUT "oh no"
ENDTYPE`,
` statement is not valid here`
],
//#endregion
//#region recursive types
record_type_recursive_illegal_1: [
`TYPE amogus
	DECLARE sus: amogus
ENDTYPE`,
"infinite size"
],
record_type_recursive_illegal_2: [
`TYPE amogus
	DECLARE sus: ARRAY[1:10] OF amogus
ENDTYPE`,
"infinite size"
],
record_type_recursive_legal_1: [
`TYPE pAmogus = ^Amogus
TYPE Amogus
	DECLARE sus: pAmogus
ENDTYPE`,
[]
],
record_type_multi_recursive_illegal_1: [
`TYPE Amogus
	DECLARE bmogus: Bmogus
ENDTYPE
TYPE Bmogus
	DECLARE amogus: Amogus
ENDTYPE`,
"infinite size"
],
record_type_multi_recursive_illegal_2: [
`TYPE Amogus
DECLARE bmogus: Bmogus
ENDTYPE
TYPE Bmogus
DECLARE amogus: ARRAY[1:10] OF Amogus
ENDTYPE`,
"infinite size"
],
record_type_multi_recursive_legal_1: [
`TYPE Amogus
	DECLARE value: INTEGER
	DECLARE bmogus: pBmogus
ENDTYPE
TYPE Bmogus
	DECLARE amogus: pAmogus
ENDTYPE
TYPE pAmogus = ^Amogus
TYPE pBmogus = ^Bmogus
DECLARE x: Amogus
DECLARE y: Bmogus
DECLARE px: pAmogus
DECLARE py: pBmogus
px <- ^x
py <- ^y
x.bmogus <- py
y.amogus <- px
x.value <- 123
OUTPUT (((y.amogus^).bmogus^).amogus^).value`,
["123"]
],
class_type_recursive_hoisting_1: [ //Unlike records, classes default to {null} instead of recursively initializ
`CLASS Amogus
PUBLIC amogus: Amogus
ENDCLASS`,
[]
],
class_type_recursive_hoisting_2: [
`CLASS Amogus
PUBLIC bmogus: Bmogus
ENDCLASS
CLASS Bmogus
PUBLIC amogus: Amogus
ENDCLASS`,
[]
],
class_type_recursive_hoisting_3: [
`CLASS Amogus
PUBLIC bmogus: Bmogus
ENDCLASS
CLASS Bmogus
PUBLIC amogus: ARRAY[1:10] OF Amogus
ENDCLASS`,
[]
],
//#endregion
//#region scope
global_variable_exists: [
`DECLARE xvar: INTEGER
xvar <- 5`,
[]
],
global_variable_exists_inside_block: [
`DECLARE xvar: INTEGER
IF TRUE THEN
	xvar <- 5
ENDIF`,
[]
],
global_variable_exists_inside_many_blocks: [
`DECLARE xvar: INTEGER
IF TRUE THEN
	FOR i <- 1 TO 1
		REPEAT
			CASE OF TRUE
				FALSE: OUTPUT 2
				TRUE: IF TRUE THEN
					xvar <- 5
				ENDIF
			ENDCASE
		UNTIL TRUE
	NEXT i
ENDIF`,
[]
],
local_variable_exists: [
`PROCEDURE localScope()
	DECLARE xvar: INTEGER
	xvar <- 5
	OUTPUT xvar
ENDPROCEDURE
CALL localScope()`,
["5"]
],
local_variable_exists_inside_many_blocks: [
`PROCEDURE localScope()
	DECLARE xvar: INTEGER
	IF TRUE THEN
		FOR i <- 1 TO 1
			REPEAT
				CASE OF TRUE
					FALSE: OUTPUT 2
					TRUE: IF TRUE THEN
						xvar <- 5
					ENDIF
				ENDCASE
			UNTIL TRUE
		NEXT i
	ENDIF
	OUTPUT xvar
ENDPROCEDURE
CALL localScope()`,
["5"]
],
declaration_works_inside_many_blocks: [
`PROCEDURE localScope()
	IF TRUE THEN
		FOR i <- 1 TO 1
			REPEAT
				CASE OF TRUE
					FALSE: OUTPUT 2
					TRUE: IF TRUE THEN
						DECLARE xvar: INTEGER
						xvar <- 5
						OUTPUT xvar
					ENDIF
				ENDCASE
			UNTIL TRUE
		NEXT i
	ENDIF
ENDPROCEDURE
CALL localScope()`,
["5"]
],
declaration_works_inside_many_blocks_2: [
`PROCEDURE localScope()
	IF TRUE THEN
		FOR i <- 1 TO 1
			REPEAT
				DECLARE xvar: INTEGER
				CASE OF TRUE
					FALSE: OUTPUT 2
					TRUE: IF TRUE THEN
						xvar <- 5
					ENDIF
				ENDCASE
				OUTPUT xvar
			UNTIL TRUE
		NEXT i
	ENDIF
ENDPROCEDURE
CALL localScope()`,
["5"]
],
global_variable_exists_inside_function: [
`DECLARE xvar: INTEGER
PROCEDURE localScope()
	xvar <- 5
	OUTPUT xvar
ENDPROCEDURE
CALL localScope()`,
["5"]
],
local_variable_does_not_exist_inside_function: [
`PROCEDURE x()
	DECLARE xvar: INTEGER
	xvar <- 5
	CALL y()
ENDPROCEDURE
PROCEDURE y()
	DECLARE yvar: INTEGER
	yvar <- 5
	OUTPUT yvar
	OUTPUT xvar
ENDPROCEDURE
CALL x()`,
`"xvar" does not exist`
],
many_scopes: [
`IF TRUE THEN
	DECLARE a: INTEGER\na <- 1
	OUTPUT a
IF TRUE THEN
	DECLARE b: INTEGER\nb <- 2
	OUTPUT a, b
IF TRUE THEN
	DECLARE c: INTEGER\nc <- 3
	OUTPUT a, b, c
IF TRUE THEN
	DECLARE d: INTEGER\nd <- 4
	OUTPUT a, b, c, d
IF TRUE THEN
	DECLARE e: INTEGER\ne <- 5
	OUTPUT a, b, c, d, e
IF TRUE THEN
	DECLARE f: INTEGER\nf <- 6
	OUTPUT a, b, c, d, e, f
IF TRUE THEN
	DECLARE g: INTEGER\ng <- 7
	OUTPUT a, b, c, d, e, f, g
IF TRUE THEN
	DECLARE h: INTEGER\nh <- 8
	OUTPUT a, b, c, d, e, f, g, h
IF TRUE THEN
	DECLARE i: INTEGER\ni <- 9
	OUTPUT a, b, c, d, e, f, g, h, i
IF TRUE THEN
	DECLARE j: INTEGER\nj <- 10
	OUTPUT a, b, c, d, e, f, g, h, i, j
ENDIF
ENDIF
ENDIF
ENDIF
ENDIF
ENDIF
ENDIF
ENDIF
ENDIF
ENDIF`,
Array.from({length: 10}, (_, i) => Array.from({length: i + 1}, (_, j) => (j + 1).toString()).join(""))
],
many_scopes_invalid: [
`IF TRUE THEN
	DECLARE a: INTEGER\na <- 1
	OUTPUT a
IF TRUE THEN
	DECLARE b: INTEGER\nb <- 2
	OUTPUT a, b
IF TRUE THEN
	DECLARE c: INTEGER\nc <- 3
	OUTPUT a, b, c
IF TRUE THEN
	DECLARE d: INTEGER\nd <- 4
	OUTPUT a, b, c, d
IF TRUE THEN
	DECLARE e: INTEGER\ne <- 5
	OUTPUT a, b, c, d, e
IF TRUE THEN
	DECLARE f: INTEGER\nf <- 6
	OUTPUT a, b, c, d, e, f
IF TRUE THEN
	DECLARE g: INTEGER\ng <- 7
	OUTPUT a, b, c, d, e, f, g
IF TRUE THEN
	DECLARE h: INTEGER\nh <- 8
	OUTPUT a, b, c, d, e, f, g, h
IF TRUE THEN
	DECLARE i: INTEGER\ni <- 9
	OUTPUT a, b, c, d, e, f, g, h, i
IF TRUE THEN
	DECLARE j: INTEGER\nj <- 10
	OUTPUT a, b, c, d, e, f, g, h, i, j
ENDIF
ENDIF
ENDIF
OUTPUT h
ENDIF
ENDIF
ENDIF
ENDIF
ENDIF
ENDIF
ENDIF`,
`"h"`
],
pointers_to_for_variable_simple: [
`TYPE pINTEGER = ^INTEGER
DECLARE pointers: ARRAY[1:10] OF pINTEGER
FOR i <- 1 TO 10
	//DECLARE foo: STRING
	pointers[i] <- ^i
NEXT i
FOR i <- 1 TO 10
	OUTPUT pointers[i]^
NEXT i`,
Array(10).fill("10")
],
pointers_to_for_variable: [
`TYPE pINTEGER = ^INTEGER
DECLARE pointers: ARRAY[1:10] OF pINTEGER
FOR i <- 1 TO 10
	DECLARE foo: STRING
	pointers[i] <- ^i
NEXT i
FOR i <- 1 TO 10
	OUTPUT pointers[i]^
NEXT i`,
Array(10).fill("10")
],
//#endregion
//#region statements
if_normal: [
`IF FALSE THEN
ENDIF`,
[]
],
if_then_next_line: [
`IF TRUE
	THEN
		OUTPUT "Hello"
	ELSE
		OUTPUT "Bye"
ENDIF`,
["Hello"]
],
for_normal: [
`FOR i <- 1 TO 3
	OUTPUT i
NEXT i`,
["1", "2", "3"]
],
for_evaluated: [
`FOR i <- 1 + 1 TO 6 - 1
	OUTPUT i
NEXT i`,
["2", "3", "4", "5"]
],
for_invalid_next_statement: [
`FOR i <- 1 TO 3
	OUTPUT i
NEXT j`,
`NEXT`
],
for_one: [
`FOR i <- 3 TO 3
	OUTPUT i
NEXT i`,
["3"]
],
for_none: [
`FOR i <- 4 TO 3
	OUTPUT i
NEXT i`,
[]
],
for_step_inclusive: [
`FOR i <- 0 TO 10 STEP 2
	OUTPUT i
NEXT i`,
["0", "2", "4", "6", "8", "10"]
],
for_step_exclusive: [
`FOR i <- 0 TO 10 STEP 3
	OUTPUT i
NEXT i`,
["0", "3", "6", "9"]
],
for_step_negative: [
`FOR i <- 5 TO 1 STEP -1
	OUTPUT i
NEXT i`,
["5", "4", "3", "2", "1"]
],
for_step_negative_multi: [
`FOR i <- 5 TO 1 STEP -2
	OUTPUT i
NEXT i`,
["5", "3", "1"]
],
for_step_negative_none: [
`FOR i <- 1 TO 5 STEP -1
	OUTPUT i
NEXT i`,
[]
],
//#endregion
//#region files
write_to_new_file: [
`OPENFILE "test.txt" FOR WRITE
WRITEFILE "test.txt", "data 1"
WRITEFILE "test.txt", "data 2"
WRITEFILE "test.txt", "data 3"
CLOSEFILE "test.txt"`,
[]
],
write_to_new_file_and_read_data: [
`OPENFILE "test.txt" FOR WRITE
WRITEFILE "test.txt", "data 1"
WRITEFILE "test.txt", "data 2"
WRITEFILE "test.txt", "data 3"
CLOSEFILE "test.txt"
OPENFILE "test.txt" FOR READ
WHILE NOT EOF("test.txt")
	DECLARE temp: STRING
	READFILE "test.txt", temp
	OUTPUT temp
ENDWHILE
CLOSEFILE "test.txt"`,
["data 1", "data 2", "data 3"]
],
write_to_new_file_and_append: [
`
PROCEDURE outputFile()
	OPENFILE "test.txt" FOR READ
	WHILE NOT EOF("test.txt")
		DECLARE temp: STRING
		READFILE "test.txt", temp
		OUTPUT temp
	ENDWHILE
	CLOSEFILE "test.txt"
ENDPROCEDURE

OPENFILE "test.txt" FOR WRITE
WRITEFILE "test.txt", "data 1"
WRITEFILE "test.txt", "data 2"
WRITEFILE "test.txt", "data 3"
CLOSEFILE "test.txt"

CALL outputFile()

OPENFILE "test.txt" FOR APPEND
WRITEFILE "test.txt", "data 4"
WRITEFILE "test.txt", "data 5"
WRITEFILE "test.txt", "data 6"
CLOSEFILE "test.txt"

CALL outputFile()
`,
["data 1", "data 2", "data 3", "data 1", "data 2", "data 3", "data 4", "data 5", "data 6"]
],
//#endregion
//#region classes
parse_class_blank: [
`CLASS amogus
ENDCLASS`,
[]
],
parse_class_proprties: [
`CLASS amogus
	PUBLIC x: INTEGER
	PRIVATE y: STRING
ENDCLASS`,
[]
],
parse_class_properties_complex: [
`CLASS amogus
	PUBLIC aaa, bbb, ccc: INTEGER
	PRIVATE y: ARRAY[1:100, 1:10] OF STRING
ENDCLASS`,
[]
],
parse_class_procedure_blank: [
`CLASS amogus
	PUBLIC PROCEDURE name()
	ENDPROCEDURE
ENDCLASS`,
[]
],
parse_class_function_mostly_blank: [
`CLASS amogus
	PUBLIC FUNCTION name() RETURNS INTEGER
		RETURN 0
	ENDFUNCTION
ENDCLASS`,
[]
],
parse_class_procedure_simple_args: [
`CLASS amogus
	PUBLIC PROCEDURE name(x:INTEGER, y:STRING)
		OUTPUT x
		OUTPUT y
	ENDPROCEDURE
ENDCLASS`,
[]
],
parse_class_function_simple_args: [
`CLASS amogus
	PUBLIC FUNCTION name(x:INTEGER, y:STRING) RETURNS INTEGER
		OUTPUT x
		OUTPUT y
		RETURN x + 1
	ENDFUNCTION
ENDCLASS`,
[]
],
parse_class_procedure_complex_args: [
`CLASS amogus
	PUBLIC PROCEDURE name(x, y: INTEGER, z, aa_aaaa: ARRAY[0:50, 0:10] OF BOOLEAN)
		OUTPUT x
		OUTPUT y
		FOR i <- 0 TO 50
			OUTPUT z[i, 5]
		NEXT i
	ENDPROCEDURE
ENDCLASS`,
[]
],
parse_class_function_complex_args: [
`CLASS amogus
	PUBLIC FUNCTION name(x, y: INTEGER, z, aa_aaaa: ARRAY[0:50, 0:10] OF BOOLEAN) RETURNS INTEGER
		OUTPUT x
		OUTPUT y
		FOR i <- 0 TO 50
			OUTPUT aa_aaaa[i, 5]
		NEXT i
		RETURN x + 1
	ENDFUNCTION
ENDCLASS`,
[]
],
parse_class_procedure_complex_args_pass_mode: [
`CLASS amogus
	PUBLIC PROCEDURE name(BYVAL x, BYREF y: INTEGER, z, BYVAL aa_aaaa: ARRAY[0:50, 0:10] OF BOOLEAN)
		OUTPUT x
		OUTPUT y
		FOR i <- 0 TO 50
			OUTPUT aa_aaaa[i, 5]
		NEXT i
	ENDPROCEDURE
ENDCLASS`,
[]
],
parse_class_function_complex_args_pass_mode: [
`CLASS amogus
	PUBLIC FUNCTION name(BYVAL x, BYREF y: INTEGER, z, BYVAL aa_aaaa: ARRAY[0:50, 0:10] OF BOOLEAN) RETURNS INTEGER
		OUTPUT x
		OUTPUT y
		FOR i <- 0 TO 50
			OUTPUT aa_aaaa[i, 5]
		NEXT i
		RETURN x + 1
	ENDFUNCTION
ENDCLASS`,
[]
],
parse_class_inherits_blank: [
`CLASS amogus
	PUBLIC PROCEDURE NEW()
	ENDPROCEDURE
ENDCLASS
CLASS mogus INHERITS amogus
ENDCLASS`,
[]
],
parse_class_inherits_override: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW()
		CALL SUPER.NEW()
	ENDPROCEDURE
	PUBLIC FUNCTION name(BYVAL x, BYREF y: INTEGER, z, BYVAL aa_aaaa: ARRAY[0:50, 0:10] OF BOOLEAN) RETURNS INTEGER
		OUTPUT x
		OUTPUT y
		FOR i <- 0 TO 50
		OUTPUT aa_aaaa[i, 5]
		NEXT i
		RETURN x + 1
	ENDFUNCTION
ENDCLASS
CLASS mogus INHERITS amogus
	PUBLIC FUNCTION name(BYVAL x, BYREF y: INTEGER, z, BYVAL aa_aaaa: ARRAY[0:50, 0:10] OF BOOLEAN) RETURNS INTEGER
		RETURN 0 + x
	ENDFUNCTION
ENDCLASS`,
[]
],
parse_class_inherits_illegal_method_type: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
	PUBLIC FUNCTION name() RETURNS INTEGER
		RETURN 5
	ENDFUNCTION
ENDCLASS
CLASS mogus INHERITS amogus
	PUBLIC PROCEDURE name()

	ENDPROCEDURE
ENDCLASS`,
`function`
],
parse_class_inherits_illegal_return_type_different: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
	PUBLIC FUNCTION name() RETURNS INTEGER
		RETURN 5
	ENDFUNCTION
ENDCLASS
CLASS mogus INHERITS amogus
	PUBLIC FUNCTION name() RETURNS CHAR
		RETURN '5'
	ENDFUNCTION
ENDCLASS`,
`"CHAR" is not assignable to "INTEGER"`
],
parse_class_inherits_return_type_covariant_1: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
	PUBLIC FUNCTION name() RETURNS amogus
		RETURN NEW amogus(2)
	ENDFUNCTION
ENDCLASS
CLASS mogus INHERITS amogus
	PUBLIC FUNCTION name() RETURNS mogus
		RETURN NEW mogus(2)
	ENDFUNCTION
ENDCLASS`,
[],
],
parse_class_inherits_return_type_covariant_2: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
	PUBLIC FUNCTION name() RETURNS mogus
		RETURN NEW mogus(2)
	ENDFUNCTION
ENDCLASS
CLASS mogus INHERITS amogus
	PUBLIC FUNCTION name() RETURNS amogus
		RETURN NEW amogus(2)
	ENDFUNCTION
ENDCLASS`,
`"amogus" is not assignable to "mogus"`
],
parse_class_inherits_return_type_covariant_3: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
	PUBLIC FUNCTION name() RETURNS INTEGER
		RETURN NEW mogus(2)
	ENDFUNCTION
ENDCLASS
CLASS mogus INHERITS amogus
	PUBLIC FUNCTION name() RETURNS 1..10
		RETURN NEW amogus(2)
	ENDFUNCTION
ENDCLASS`,
[]
],
parse_class_inherits_return_type_covariant_4: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
	PUBLIC FUNCTION name() RETURNS 1..10
		RETURN NEW mogus(2)
	ENDFUNCTION
ENDCLASS
CLASS mogus INHERITS amogus
	PUBLIC FUNCTION name() RETURNS INTEGER
		RETURN NEW amogus(2)
	ENDFUNCTION
ENDCLASS`,
`"INTEGER" is not assignable to "1..10"`
],
parse_class_inherits_parameter_type_count: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
	PUBLIC PROCEDURE name(arg: INTEGER)
		
	ENDPROCEDURE
ENDCLASS
CLASS mogus INHERITS amogus
	PUBLIC PROCEDURE name(arg: INTEGER, arg2: INTEGER)
		
	ENDPROCEDURE
ENDCLASS`,
`Method should have 1 parameter`
],
parse_class_inherits_parameter_type_mode: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
	PUBLIC PROCEDURE name(BYREF arg: INTEGER)
		
	ENDPROCEDURE
ENDCLASS
CLASS mogus INHERITS amogus
	PUBLIC PROCEDURE name(arg: INTEGER)
		
	ENDPROCEDURE
ENDCLASS`,
`pass mode`
],
parse_class_inherits_parameter_type_contravariant_1: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
	PUBLIC PROCEDURE name(arg:mogus)
		
	ENDPROCEDURE
ENDCLASS
CLASS mogus INHERITS amogus
	PUBLIC PROCEDURE name(arg:amogus)
		
	ENDPROCEDURE
ENDCLASS`,
[]
],
parse_class_inherits_parameter_type_contravariant_2: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
	PUBLIC PROCEDURE name(arg:amogus)
		
	ENDPROCEDURE
ENDCLASS
CLASS mogus INHERITS amogus
	PUBLIC PROCEDURE name(arg:mogus)
		
	ENDPROCEDURE
ENDCLASS`,
`"amogus" is not assignable to type "mogus"`
],
parse_class_inherits_parameter_type_contravariant_3: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
	PUBLIC PROCEDURE name(arg:INTEGER)
		
	ENDPROCEDURE
ENDCLASS
CLASS mogus INHERITS amogus
	PUBLIC PROCEDURE name(arg:1..10)
		
	ENDPROCEDURE
ENDCLASS`,
`"INTEGER" is not assignable to type "1..10"`
],
parse_class_inherits_parameter_type_contravariant_4: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
	PUBLIC PROCEDURE name(arg:ARRAY OF INTEGER)
		
	ENDPROCEDURE
ENDCLASS
CLASS mogus INHERITS amogus
	PUBLIC PROCEDURE name(arg:ARRAY[1:10] OF INTEGER)
		
	ENDPROCEDURE
ENDCLASS`,
`cannot assign an array with unknown length to an array requiring a specific length`
],
parse_class_inherits_recursive_illegal: [
`CLASS amogus INHERITS mogus
	PUBLIC PROCEDURE NEW()
		CALL SUPER.NEW()
	ENDPROCEDURE
ENDCLASS
CLASS mogus INHERITS amogus
ENDCLASS`,
``
],
parse_illegal_super_use_1: [
`OUTPUT SUPER`,
`expression`
],
parse_illegal_super_use_2: [
`OUTPUT (1+2+(3*SUPER)+4+5)`,
`expression`
],
instantiate_class_blank: [
`CLASS amogus
	PUBLIC PROCEDURE NEW()
	ENDPROCEDURE
ENDCLASS
DECLARE a: amogus
a <- NEW amogus()`,
[]
],
instantiate_class_no_constructor: [
`CLASS amogus
ENDCLASS
DECLARE a: amogus
a <- NEW amogus()`,
`No constructor was defined for class "amogus"`
],
instantiate_class_private_contructor: [
`CLASS amogus
	PRIVATE PROCEDURE NEW()
	ENDPROCEDURE
ENDCLASS
DECLARE a: amogus
a <- NEW amogus()`,
`Constructors cannot be private`
],
read_write_class_property: [
`CLASS amogus
	PUBLIC x: INTEGER
		PUBLIC PROCEDURE NEW(X: INTEGER)
	ENDPROCEDURE
ENDCLASS
DECLARE a: amogus
a <- NEW amogus(5)
a.x <- 6
OUTPUT a.x`,
["6"]
],
read_class_property: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
ENDCLASS
DECLARE a: amogus
a <- NEW amogus(5)
OUTPUT a.x`,
["5"]
],
write_class_property_nonexistent: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
ENDCLASS
DECLARE a: amogus
a <- NEW amogus(5)
a.properties <- "hi"
OUTPUT a.x`,
`"properties"`
],
illegal_read_private_class_property: [
`CLASS amogus
	PRIVATE x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
ENDCLASS
DECLARE a: amogus
a <- NEW amogus(5)
OUTPUT a.x`,
`Property "x" is private`
],
illegal_write_private_class_property: [
`CLASS amogus
	PRIVATE x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
ENDCLASS
DECLARE a: amogus
a <- NEW amogus(5)
a.x <- 6`,
`Property "x" is private`
],
call_class_procedure: [
`CLASS amogus
	PRIVATE x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
	PUBLIC PROCEDURE hello()
		OUTPUT "hello"
	ENDPROCEDURE
ENDCLASS
DECLARE a: amogus
a <- NEW amogus(5)
CALL a.hello()`,
["hello"]
],
call_class_procedure_access_property: [
`CLASS amogus
	PRIVATE x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
	PUBLIC PROCEDURE hello()
		OUTPUT "hello, ", x
	ENDPROCEDURE
ENDCLASS
DECLARE a: amogus
a <- NEW amogus(5)
CALL a.hello()`,
["hello, 5"]
],
call_class_procedure_read_write_property: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
		OUTPUT "Constructed"
	ENDPROCEDURE
	PUBLIC PROCEDURE inc()
		OUTPUT "x was ", x
		x <- x + 1
		OUTPUT "x is ", x
	ENDPROCEDURE
ENDCLASS
DECLARE a: amogus
a <- NEW amogus(5)
CALL a.inc()
a.x <- a.x + 90
CALL a.inc()
OUTPUT "done"`,
["Constructed", "x was 5", "x is 6", "x was 96", "x is 97", "done"]
],
call_class_function_read_write_property: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
		OUTPUT "Constructed"
	ENDPROCEDURE
	PUBLIC FUNCTION inc() RETURNS STRING
		OUTPUT "x was ", x
		x <- x + 1
		OUTPUT "x is ", x
		RETURN "done"
	ENDFUNCTION
ENDCLASS
DECLARE a: amogus
a <- NEW amogus(5)
OUTPUT a.inc()
a.x <- a.x + 90
OUTPUT a.inc()`,
["Constructed", "x was 5", "x is 6", "done", "x was 96", "x is 97", "done"]
],
call_class_function_read_write_private_property: [
`CLASS amogus
	PRIVATE x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
		OUTPUT "Constructed"
	ENDPROCEDURE
	PUBLIC FUNCTION inc() RETURNS STRING
		OUTPUT "x was ", x
		x <- x + 1
		OUTPUT "x is ", x
		RETURN "done"
	ENDFUNCTION
ENDCLASS
DECLARE a: amogus
a <- NEW amogus(5)
OUTPUT a.inc()
OUTPUT a.inc()`,
["Constructed", "x was 5", "x is 6", "done", "x was 6", "x is 7", "done"]
],
call_class_method_recursive: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
		OUTPUT "Constructed"
	ENDPROCEDURE
	PUBLIC PROCEDURE a()
		OUTPUT "a"
		CALL b()
	ENDPROCEDURE
	PUBLIC PROCEDURE b()
		OUTPUT "b"
	ENDPROCEDURE
ENDCLASS
DECLARE a: amogus
a <- NEW amogus(5)
CALL a.a()
OUTPUT "done"`,
["Constructed", "a", "b", "done"]
],
illegal_call_private_class_procedure: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
	ENDPROCEDURE
	PRIVATE PROCEDURE priv()
		OUTPUT "priv"
	ENDPROCEDURE
	PUBLIC PROCEDURE pub()
		OUTPUT "pub"
		CALL priv()
	ENDPROCEDURE
ENDCLASS
DECLARE a: amogus
a <- NEW amogus(5)
CALL a.priv()
OUTPUT "done"`,
`Method "priv" is private`
],
legal_call_private_class_procedure: [
`CLASS amogus
	PUBLIC x: INTEGER
	PUBLIC PROCEDURE NEW(X: INTEGER)
		x <- X
		OUTPUT "Constructed"
	ENDPROCEDURE
	PRIVATE PROCEDURE priv()
		OUTPUT "priv, ", x
	ENDPROCEDURE
	PUBLIC PROCEDURE pub()
		OUTPUT "pub, ", x
		CALL priv()
	ENDPROCEDURE
ENDCLASS
DECLARE a: amogus
a <- NEW amogus(5)
CALL a.pub()
OUTPUT "done"`,
["Constructed", "pub, 5", "priv, 5", "done"]
],
private_class_property_returned_pointer: [
`TYPE pINTEGER = ^INTEGER
CLASS a
	PRIVATE x: INTEGER
	PUBLIC PROCEDURE NEW()
		x <- 5
	ENDPROCEDURE
	PUBLIC FUNCTION x() RETURNS pINTEGER
		RETURN ^x
	ENDFUNCTION
	PUBLIC PROCEDURE printX()
		OUTPUT x
	ENDPROCEDURE
ENDCLASS
DECLARE a: a
DECLARE p: pINTEGER
a <- NEW a()
CALL a.printX()
(a.x())^ <- 6
CALL a.printX()
p <- a.x()
p^ <- 7
OUTPUT p^
CALL a.printX()`,
["5", "6", "7", "7"]
],
call_class_method_polymorphically: [
`CLASS Animal
	PUBLIC Name: STRING
	PUBLIC PROCEDURE NEW(name: STRING)
		Name <- name
	ENDPROCEDURE
	PUBLIC FUNCTION isSus() RETURNS BOOLEAN
		RETURN TRUE
	ENDFUNCTION
ENDCLASS
CLASS Dog INHERITS Animal
	PUBLIC PROCEDURE NEW(name: STRING)
		CALL SUPER.NEW(name)
	ENDPROCEDURE
	PUBLIC FUNCTION isSus() RETURNS BOOLEAN
		RETURN FALSE
	ENDFUNCTION
ENDCLASS

DECLARE animal: Animal
animal <- NEW Animal("doggy")
DECLARE dog: Animal
dog <- NEW Dog("doggy")
OUTPUT animal.isSus()
OUTPUT dog.isSus()`,
["TRUE", "FALSE"]
],
illegal_call_class_method_polymorphically: [
`CLASS Animal
	PUBLIC Name: STRING
	PUBLIC PROCEDURE NEW(name: STRING)
		Name <- name
	ENDPROCEDURE
	PUBLIC FUNCTION isSus() RETURNS BOOLEAN
		RETURN TRUE
	ENDFUNCTION
ENDCLASS
CLASS Dog INHERITS Animal
	PUBLIC PROCEDURE NEW(name: STRING)
		CALL SUPER.NEW(name)
	ENDPROCEDURE
	PUBLIC FUNCTION isSus() RETURNS BOOLEAN
		RETURN FALSE
	ENDFUNCTION
	PUBLIC PROCEDURE bark()
	ENDPROCEDURE
ENDCLASS

DECLARE dog: Animal
dog <- NEW Dog("doggy")
CALL dog.bark()`,
`Method "bark" does not exist`
],
call_class_method_in_function_polymorphically: [
`CLASS Animal
	PUBLIC Name: STRING
	PUBLIC PROCEDURE NEW(name: STRING)
		Name <- name
	ENDPROCEDURE
	PUBLIC FUNCTION isSus() RETURNS BOOLEAN
		RETURN TRUE
	ENDFUNCTION
ENDCLASS
CLASS Dog INHERITS Animal
	PUBLIC PROCEDURE NEW(name: STRING)
		CALL SUPER.NEW(name)
	ENDPROCEDURE
	PUBLIC FUNCTION isSus() RETURNS BOOLEAN
		RETURN FALSE
	ENDFUNCTION
ENDCLASS

DECLARE animal: Animal
animal <- NEW Animal("animal")
DECLARE dog: Dog
dog <- NEW Dog("doggy")
DECLARE dogAnimal: Animal
dogAnimal <- NEW Dog("doggy2")
PROCEDURE test(arg:Animal)
	OUTPUT arg.isSus()
ENDPROCEDURE
CALL test(animal)
CALL test(dog)
CALL test(dogAnimal)`,
["TRUE", "FALSE", "FALSE"]
],
call_class_method_in_function_polymorphically_and_mutate_byref: [
`CLASS Animal
	PUBLIC Name: STRING
	PUBLIC PROCEDURE NEW(name: STRING)
		Name <- name
	ENDPROCEDURE
	PUBLIC FUNCTION isSus() RETURNS BOOLEAN
		RETURN TRUE
	ENDFUNCTION
ENDCLASS
CLASS Dog INHERITS Animal
	PUBLIC PROCEDURE NEW(name: STRING)
		CALL SUPER.NEW(name)
	ENDPROCEDURE
	PUBLIC FUNCTION isSus() RETURNS BOOLEAN
		RETURN FALSE
	ENDFUNCTION
ENDCLASS

DECLARE animal: Animal
animal <- NEW Animal("animal")
DECLARE dog: Dog
dog <- NEW Dog("doggy")
DECLARE dogAnimal: Animal
dog <- NEW Dog("doggy2")
PROCEDURE test(BYREF arg:Animal)
	OUTPUT arg.isSus()
ENDPROCEDURE
CALL test(animal)
CALL test(dog)
CALL test(dogAnimal)`,
`Cannot coerce BYREF`
],
call_class_method_in_function_polymorphically_and_mutate_byval: [
`CLASS Animal
	PUBLIC Name: STRING
	PUBLIC PROCEDURE NEW(name: STRING)
		Name <- name
	ENDPROCEDURE
	PUBLIC FUNCTION isSus() RETURNS BOOLEAN
		OUTPUT "Animal ", Name, " is sus"
		RETURN TRUE
	ENDFUNCTION
ENDCLASS
CLASS Dog INHERITS Animal
	PUBLIC PROCEDURE NEW(name: STRING)
		CALL SUPER.NEW(name)
	ENDPROCEDURE
	PUBLIC FUNCTION isSus() RETURNS BOOLEAN
		OUTPUT "Dog ", Name, " is not sus"
		RETURN FALSE
	ENDFUNCTION
ENDCLASS

DECLARE animal: Animal
animal <- NEW Animal("animal")
DECLARE dog: Dog
dog <- NEW Dog("doggy")
DECLARE dogAnimal: Animal
dogAnimal <- NEW Dog("doggy2")
PROCEDURE test(BYVAL arg:Animal)
	OUTPUT arg.isSus()
	arg.Name <- arg.Name & "_checked"
	OUTPUT arg.isSus()
ENDPROCEDURE
CALL test(animal)
OUTPUT animal.isSus()
CALL test(dog)
OUTPUT dog.isSus()
CALL test(dogAnimal)
OUTPUT dogAnimal.isSus()`,
[
	"Animal animal is sus", "TRUE", "Animal animal_checked is sus", "TRUE", "Animal animal is sus", "TRUE",
	"Dog doggy is not sus", "FALSE", "Dog doggy_checked is not sus", "FALSE", "Dog doggy is not sus", "FALSE",
	"Dog doggy2 is not sus", "FALSE", "Dog doggy2_checked is not sus", "FALSE", "Dog doggy2 is not sus", "FALSE",
]
],
run_double_inheritance: [
`CLASS A
	PUBLIC PROCEDURE NEW()
	ENDPROCEDURE
	PUBLIC PROCEDURE test()
		OUTPUT "A"
	ENDPROCEDURE
ENDCLASS
CLASS B INHERITS A
	PUBLIC PROCEDURE NEW()
		CALL SUPER.NEW()
	ENDPROCEDURE
	PUBLIC PROCEDURE test()
		OUTPUT "B"
		CALL SUPER.test()
	ENDPROCEDURE
	PUBLIC PROCEDURE test2()
		OUTPUT "B2"
		CALL SUPER.test()
	ENDPROCEDURE
ENDCLASS
CLASS C INHERITS B
	PUBLIC PROCEDURE NEW()
		CALL SUPER.NEW()
	ENDPROCEDURE
	PUBLIC PROCEDURE test()
		OUTPUT "C"
		CALL SUPER.test()
	ENDPROCEDURE
ENDCLASS

DECLARE bb: B
DECLARE bc: B
DECLARE cc: C
bb <- NEW B()
bc <- NEW C()
cc <- NEW C()
CALL bb.test()
OUTPUT " "
CALL bc.test()
OUTPUT " "
CALL cc.test()
OUTPUT "  "
CALL bb.test2()
OUTPUT " "
CALL bc.test2()
OUTPUT " "
CALL cc.test2()`,
["B", "A", " ", "C", "B", "A", " ", "C", "B", "A", "  ", "B2", "A", " ", "B2", "A", " ", "B2", "A"]
],
run_super_call: [
`CLASS a
	PUBLIC PROCEDURE NEW()
	ENDPROCEDURE
	PUBLIC FUNCTION Sus() RETURNS INTEGER
		RETURN 5
	ENDFUNCTION
ENDCLASS
CLASS b INHERITS a
	PUBLIC FUNCTION Sus() RETURNS INTEGER
		RETURN SUPER.Sus() + 6
	ENDFUNCTION
ENDCLASS
DECLARE myB: b
myB <- NEW b()
OUTPUT myB.Sus()`,
["11"]
],
run_weird_super: [
`CLASS a
	PUBLIC PROCEDURE NEW()
	ENDPROCEDURE
ENDCLASS
CLASS b INHERITS a
	PUBLIC FUNCTION Sus() RETURNS INTEGER
		RETURN SUPER.NEW
	ENDFUNCTION
ENDCLASS

DECLARE b: b
b <- NEW b()
OUTPUT 5 + b.Sus()`,
`member access on SUPER`
],
//#endregion
//#region typos
check_typos_in_keywords: [
`OUYPUT "aaa"`,
`OUTPUT`
],
check_typos_in_keywords_2: [
`FUNCTION amogus() RETUNS INTEGER
	RETURN 5
ENDFUNCTION`,
`RETURNS`
],
check_typos_in_keywords_3: [
`FOR i <- 1 TO 10 STEp 1
NEXT i`,
`STEP`
],
check_typos_in_variables: [
`DECLARE abcdefgh: INTEGER
abcdefgH <- 5`,
`abcdefgh`
],
check_typos_in_variables_2: [
`DECLARE abcdefgh: INTEGER
abcdefgj <- 5`,
`abcdefgh`
],
check_typos_in_variables_3: [
`DECLARE abcdefgh: INTEGER
abcdefzgh <- 5`,
`abcdefgh`
],
check_typos_in_types: [
`TYPE abcdefgh = ^INTEGER
DECLARE x: abcdefgH`,
`abcdefgh`
],
check_typos_in_functions: [
`PROCEDURE abcdefgh()
ENDPROCEDURE
CALL abcdefgH()`,
`abcdefgh`
],
//#endregion
//#region programs
rickroll: [
`CONSTANT input = "qkfd{ql^yk  maqmthqkd^  ielfxthb  }uui|n  {oqo  ugfd}ok_wm  ieskplsid^  phj\`xp  yyui{o  j^pnyunn,,  sihb{qk_rr  ieqmomqkc_  vnzprj  b\`sqtjzpnndd  c_rjj^  gal^ssk_uous  yyuivt..  hhb\`qovj}u  b\`tltpmese  kaskvhoiss''  h\`c_~t"
FUNCTION parse(BYVAL input: STRING) RETURNS STRING
	WHILE 1 + 2 / 3 * 4 MOD 5 DIV 6 > 420
		OUTPUT "Processing..."
	ENDWHILE
	RETURN (CHR(((((ASC(MID(input, 1, 1)) + ASC(MID(input, 2, 1)))))) DIV 2))
ENDFUNCTION
TYPE NUMBER = ^INTEGER
PROCEDURE run()
	DECLARE x: INTEGER
	DECLARE y: NUMBER
	DECLARE z: INTEGER
	x <- 1
	z <- x
	y <- ^x
	y^ <- y^ + x
	DECLARE output: STRING
	output <- "hello! "
	WHILE z < LENGTH(input)
		output <- output & parse(MID(input, z, 2))
		z <- z + y^
	ENDWHILE
	OUTPUT output
ENDPROCEDURE
CALL run()
`,
["hello! never gonna give you up never gonna let you down, never gonna run around and desert you. happy april fools' day"]
],
vecinteger: [
`CLASS VecInteger
PUBLIC array: ARRAY OF INTEGER
PUBLIC length: INTEGER
PUBLIC PROCEDURE NEW(Length: INTEGER)
	length <- Length
	DECLARE arr: ARRAY[0:length - 1] OF INTEGER
	array <- arr
ENDPROCEDURE
PUBLIC PROCEDURE Resize(Length: INTEGER)
	IF length < Length THEN
		DECLARE newArr: ARRAY[0:Length - 1] OF INTEGER
		FOR i <- 1 TO length - 1
			newArr[i] <- array[i]
		NEXT i
		array <- newArr
	ENDIF
ENDPROCEDURE
ENDCLASS

DECLARE x: VecInteger
x <- NEW VecInteger(10)
x.array[5] <- 20
OUTPUT x.array[5]
CALL x.Resize(20)
OUTPUT x.array[5]
x.array[15] <- 30
OUTPUT x.array[15]
DECLARE sussy: ARRAY[0:49] OF INTEGER
x.array <- sussy`,
["20", "20", "30"]
]
//#endregion
};

describe("soodocode", () => {
	for(const [name, [code, expectedOutput, inputs]] of Object.entries(fullTests)){
		it(`should produce the expected output for ${name}`, () => {
			const outputs:string[] = [];
			const runtime = new Runtime(
				() => inputs?.shift() ?? crash(`Program required input, but none was available`),
				t => outputs.push(t.map(x => x.asString()).join(""))
			);
			if(Array.isArray(expectedOutput)){
				runtime.runProgram(parse(tokenize(symbolize(code))).nodes);
				expect(outputs).toEqual(expectedOutput);
			} else {
				let err;
				try {
					runtime.runProgram(parse(tokenize(symbolize(code))).nodes);
					crash(`Execution did not throw an error`);
				} catch(e){ err = e; }
				if(!(err instanceof SoodocodeError)) throw err;
				expect(err.formatMessage(code)).toContain(expectedOutput);
			}
		});
	}
});
