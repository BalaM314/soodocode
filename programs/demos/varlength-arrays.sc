//Function that returns an array of arbitrary length
FUNCTION arr(x: INTEGER) RETURNS ARRAY OF INTEGER
	DECLARE out: ARRAY[1:x] OF INTEGER
	RETURN out
ENDFUNCTION

TYPE pArray = ^ARRAY OF INTEGER
CLASS bar
	PUBLIC field: ARRAY OF INTEGER
	PUBLIC PROCEDURE NEW(len: INTEGER)
		//The field is assigned to before it is used, so it does not need to be initialized
		field <- arr(len)
	ENDPROCEDURE
ENDCLASS

DECLARE x: bar
DECLARE y: pArray

x <- NEW bar(1)
y <- ^x.field //Create a pointer to x.field

FOR i <- 1 TO LENGTH(x.field) //Loop through x.field
	OUTPUT x.field[i]
NEXT i

FOR i <- 1 TO LENGTH(y^) //Loop through the pointer
	OUTPUT (y^)[i]
NEXT i

//Replace x.field with an array of different type
x.field <- arr(2)

//The pointer should still be pointing to x.field
FOR i <- 1 TO LENGTH(y^)
	OUTPUT (y^)[i]
NEXT i