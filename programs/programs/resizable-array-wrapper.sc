CLASS VecInteger
	PRIVATE array: ARRAY OF INTEGER
	PRIVATE arrayLength: INTEGER
	PRIVATE length: INTEGER
	PRIVATE loadFactor: REAL
	PUBLIC PROCEDURE NEW(Length: INTEGER)
		length <- Length
		arrayLength <- Length
		IF arrayLength <= 0 THEN
			arrayLength <- 1
		ENDIF
		DECLARE arr: ARRAY[0:arrayLength - 1] OF INTEGER
		array <- arr
		loadFactor <- 0.7
	ENDPROCEDURE
	PUBLIC FUNCTION length() RETURNS INTEGER
		RETURN length
	ENDFUNCTION
	PUBLIC FUNCTION get(i: INTEGER) RETURNS INTEGER
		IF i < 0 OR i >= length THEN
			DECLARE array: ARRAY[0:length - 1] OF INTEGER
			//Array index out of bounds
			OUTPUT array[i]
		ENDIF
		RETURN array[i]
	ENDFUNCTION
	PUBLIC PROCEDURE set(i: INTEGER, val: INTEGER)
		IF i < 0 OR i >= length THEN
			DECLARE array: ARRAY[0:length - 1] OF INTEGER
			//Array index out of bounds
			OUTPUT array[i]
		ENDIF
		array[i] <- val
	ENDPROCEDURE
	PUBLIC PROCEDURE push(val: INTEGER)
		CALL increaseLength(length + 1)
		CALL set(length - 1, val)
	ENDPROCEDURE
	PUBLIC PROCEDURE increaseLength(cap: INTEGER)
		IF cap > length THEN
			IF cap > arrayLength THEN
				CALL resizeBackingArray(INT(cap / loadFactor))
			ENDIF
			length <- cap
		ENDIF
	ENDPROCEDURE
	PRIVATE PROCEDURE resizeBackingArray(Length: INTEGER)
		IF length < Length THEN
			DECLARE newArr: ARRAY[0:Length - 1] OF INTEGER
			FOR i <- 1 TO length - 1
					newArr[i] <- array[i]
			NEXT i
			array <- newArr
			arrayLength <- Length
		ENDIF
	ENDPROCEDURE
ENDCLASS

DECLARE x: VecInteger
x <- NEW VecInteger(0)
FOR i <- 1 TO 100
	CALL x.push(i)
	OUTPUT x.length()
NEXT i
