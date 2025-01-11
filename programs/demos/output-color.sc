TYPE Outer
  DECLARE field1: INTEGER
  DECLARE field2: BOOLEAN
  DECLARE field3: STRING
  DECLARE inner: Inner
  DECLARE field4: ARRAY[1:4] OF INTEGER
ENDTYPE
TYPE Inner
  DECLARE field1: DATE
  DECLARE field2: ARRAY[1:4] OF REAL
ENDTYPE

CLASS Foo
  PUBLIC prop1: CHAR
  PUBLIC outer: Outer
  PUBLIC prop2: STRING
  PUBLIC inner: Inner
  PUBLIC prop3: CHAR
  PUBLIC PROCEDURE NEW()
    prop1 <- 'a'
    prop2 <- "Property 2"
    prop3 <- 'z'
    outer.field1 <- 54
    outer.field2 <- FALSE
    outer.field3 <- "Inner struct"
    outer.field4[1] <- 1
    outer.field4[2] <- 2
    outer.field4[3] <- 3
    outer.field4[4] <- 4
    inner.field1 <- SETDATE(31, 5, 2025)
    outer.inner.field1 <- SETDATE(15, 1, 2025)
    inner.field2[2] <- 4.5
    outer.inner.field2[2] <- 45
  ENDPROCEDURE
ENDCLASS

DECLARE foo: Foo
foo <- NEW Foo()
OUTPUT "Formatting demo: ", foo
OUTPUT "Formatting complete"
