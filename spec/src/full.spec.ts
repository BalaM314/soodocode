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
run_array_basic: [
`DECLARE x: ARRAY[1:10] OF INTEGER
x[10] <- 5
OUTPUT x[10]`,
["5"]
],
illegal_array_type_in_variable: [
`DECLARE x: ARRAY OF INTEGER`,
``
],
legal_array_type_in_function: [
`FUNCTION amogus(x: ARRAY OF INTEGER) RETURNS INTEGER
	RETURN LENGTH(x)
ENDIF`,
``
],
call_array_type_in_function: [
`FUNCTION amogus(x: ARRAY OF INTEGER) RETURNS INTEGER
	RETURN LENGTH(x)
ENDIF
DECLARE x: ARRAY[1:10] OF INTEGER
x[1] <- 5
OUTPUT amogus(x)`,
["5"],
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
dog <- NEW Dog("doggy2")
PROCEDURE test(BYREF arg:Animal)
	OUTPUT arg.isSus()
ENDPROCEDURE
CALL test(animal)
CALL test(dog)
CALL test(dogAnimal)`,
["TRUE", "FALSE", "FALSE"]
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
]
};

describe("soodocode", () => {
	for(const [name, [code, expectedOutput, inputs]] of Object.entries(fullTests)){
		it(`should produce the expected output for ${name}`, () => {
			const outputs:string[] = [];
			const runtime = new Runtime(() => inputs?.shift() ?? fail(`Program required input, but none was available`), t => outputs.push(t));
			if(Array.isArray(expectedOutput)){
				runtime.runProgram(parse(tokenize(symbolize(code))).nodes);
				expect(outputs).toEqual(expectedOutput);
			} else {
				let err;
				try {
					runtime.runProgram(parse(tokenize(symbolize(code))).nodes);
					fail(`Execution did not throw an error`);
				} catch(e){ err = e; }
				expect(err).toBeInstanceOf(SoodocodeError);
				forceType<SoodocodeError>(err);
				expect(err.message).toContain(expectedOutput);
			}
		});
	}
});
