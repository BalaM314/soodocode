
FUNCTION amogus(BYVAL x, y, z:INTEGER) RETURNS INTEGER
	OUTPUT "X is ", x
	DECLARE a: INTEGER
	a <- 10
	FOR i <- 1 TO 10
		a <- a + x * i - y DIV i + z
	NEXT i
	RETURN a
ENDFUNCTION

OUTPUT STR_TO_NUM(amogus(1, 2, 3))
OUTPUT STR_TO_NUM(amogus(2, 3, 4))
OUTPUT STR_TO_NUM(amogus(3, 4, 5))

