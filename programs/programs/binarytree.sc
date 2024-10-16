TYPE pNode = ^Node
CLASS Node
	PUBLIC value: REAL
	PUBLIC hasLeft, hasRight: BOOLEAN
	PUBLIC left, right: pNode
	PUBLIC PROCEDURE NEW(Value: INTEGER)
		value <- Value
		hasLeft <- FALSE
		hasRight <- FALSE
	ENDPROCEDURE
	PUBLIC FUNCTION insert(data: INTEGER) RETURNS Node
		DECLARE newNode: Node
		IF data > value THEN
			IF hasRight THEN
				RETURN (right^).insert(data)
			ELSE
				newNode <- NEW Node(data)
				hasRight <- TRUE
				right <- ^newNode
			ENDIF
		ELSE
			IF hasLeft THEN
				RETURN (left^).insert(data)
			ELSE
				newNode <- NEW Node(data)
				hasLeft <- TRUE
				left <- ^newNode
			ENDIF			
		ENDIF
		RETURN newNode
	ENDFUNCTION
	PUBLIC FUNCTION print() RETURNS STRING
		DECLARE out: STRING
		out <- "("
		IF hasLeft THEN
			out <- out & (left^).print()
		ENDIF
		out <- out & " " & NUM_TO_STR(value) & " "
		IF hasRight THEN
			out <- out & (right^).print()
		ENDIF
		out <- out & ")"
		RETURN out
	ENDFUNCTION
ENDCLASS

DECLARE tree: Node
tree <- NEW Node(50)
PROCEDURE drop(arg:Node)
ENDPROCEDURE
CALL drop(tree.insert(0))
CALL drop(tree.insert(5))
CALL drop(tree.insert(100))
CALL drop(tree.insert(75))
CALL drop(tree.insert(20))
CALL drop(tree.insert(30))
OUTPUT tree.print()