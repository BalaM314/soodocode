/**
Copyright © <BalaM314>, 2024. All Rights Reserved.
This file is part of soodocode. Soodocode is open source and is available at https://github.com/BalaM314/soodocode

This file contains blackbox tests that can be applied to other pseudocode engines.
*/
/* eslint-disable indent */
import "jasmine";
import { symbolize, tokenize } from "../../build/lexer.js";
import { parse } from "../../build/parser.js";
import { Runtime } from "../../build/runtime.js";
import { SoodocodeError, fail, forceType } from "../../build/utils.js";

type ErrorData = string;

const fullTests:Record<string, [code:string, output:string[] | ErrorData, inputs?:string[]]> = {
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
parse_class_inherits: [
``,
[]
],
};

describe("soodocode", () => {
	for(const [name, [code, expectedOutput, inputs]] of Object.entries(fullTests)){
		it(`should produce the expected output for ${name}`, () => {
			const program = parse(tokenize(symbolize(code)));
			const outputs:string[] = [];
			const runtime = new Runtime(() => inputs?.shift() ?? fail(`Program required input, but none was available`), t => outputs.push(t));
			if(Array.isArray(expectedOutput)){
				runtime.runProgram(program.nodes);
				expect(outputs).toEqual(expectedOutput);
			} else {
				let err;
				try {
					runtime.runProgram(program.nodes);
					fail(`Execution did not throw an error`);
				} catch(e){ err = e; }
				expect(err).toBeInstanceOf(SoodocodeError);
				forceType<SoodocodeError>(err);
				expect(err.message).toEqual(expectedOutput);
			}
		});
	}
});
