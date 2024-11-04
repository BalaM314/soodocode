TYPE pINTEGER = ^INTEGER
CLASS Foo
	PUBLIC field: INTEGER
	PUBLIC array: ARRAY[1:10, 0:2] OF INTEGER
	PUBLIC PROCEDURE NEW()
    ENDPROCEDURE
ENDCLASS

DECLARE foo: Foo
foo <- NEW Foo()
foo.field <- 5

DECLARE zero: INTEGER; zero <- 0

OUTPUT ^(foo.field)
OUTPUT ^( ((foo)).array[1+1+1+1, zero] )
OUTPUT ^(foo.field DIV 1)
