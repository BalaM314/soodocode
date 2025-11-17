TYPE pARRAY_OF_STRING = ^ARRAY OF STRING

FUNCTION wrapArrayString(x: ARRAY OF STRING) RETURNS ARRAY OF STRING
	RETURN x
ENDFUNCTION

FUNCTION hash(str: STRING, size: INTEGER) RETURNS INTEGER
	DECLARE hash: INTEGER
	hash <- 0
	FOR i <- 1 TO LENGTH(str)
		hash <- hash + i * ASC(MID(str, i, 1))
	NEXT i
	RETURN hash MOD size
ENDFUNCTION

CLASS HashMapStringString
	PUBLIC tableWidths: ARRAY OF INTEGER
	PUBLIC keys: ARRAY OF pARRAY_OF_STRING
	PUBLIC values: ARRAY OF pARRAY_OF_STRING
	PUBLIC tableSize: INTEGER

	PUBLIC PROCEDURE NEW()
		tableSize <- 101
		DECLARE keys_: ARRAY[0: tableSize - 1] OF pARRAY_OF_STRING
		DECLARE values_: ARRAY[0: tableSize - 1] OF pARRAY_OF_STRING
		DECLARE tableWidths_: ARRAY[0: tableSize - 1] OF INTEGER
		keys <- keys_
		values <- values_
		tableWidths <- tableWidths_
		FOR i <- 0 TO tableSize - 1
			DECLARE keys_list: ARRAY[1:1] OF STRING
			DECLARE values_list: ARRAY[1:1] OF STRING
			keys[i] <- ^wrapArrayString(keys_list)
			values[i] <- ^wrapArrayString(values_list)
		NEXT i
	ENDPROCEDURE

	PUBLIC FUNCTION has(key: STRING) RETURNS BOOLEAN
		DECLARE h: INTEGER
		h <- hash(key, tableSize)
		FOR i <- 1 TO tableWidths[h]
			IF (keys[h]^)[i] = key THEN
				RETURN TRUE
			ENDIF
		NEXT i
		RETURN FALSE
	ENDFUNCTION

	PUBLIC FUNCTION get(key: STRING) RETURNS STRING
		DECLARE h: INTEGER
		h <- hash(key, tableSize)
		FOR i <- 1 TO tableWidths[h]
			IF (keys[h]^)[i] = key THEN
				RETURN (values[h]^)[i]
			ENDIF
		NEXT i
		OUTPUT "Error: key ", key, " was not found in the hash map"
		OUTPUT 1 DIV 0
	ENDFUNCTION

	PUBLIC FUNCTION set(key: STRING, val: STRING) RETURNS BOOLEAN
		DECLARE h: INTEGER
		h <- hash(key, tableSize)
		IF LENGTH(keys[h]^) <= tableWidths[h] THEN
			//Resize backing array
			DECLARE newLength: INTEGER
			newLength <- tableWidths[h] * 2
			DECLARE newKeys: ARRAY[0:newLength - 1] OF STRING
			DECLARE newVals: ARRAY[0:newLength - 1] OF STRING
			FOR i <- 1 TO newLength - 1
				newKeys[i] <- (keys[h]^)[i]
				newVals[i] <- (values[h]^)[i]
			NEXT i
			keys[h] <- ^wrapArrayString(newKeys)
			values[h] <- ^wrapArrayString(newVals)
		ENDIF
		FOR i <- 1 TO tableWidths[h]
			IF (keys[h]^)[i] = key THEN
        (values[h]^)[i] <- val
				RETURN FALSE
			ENDIF
		NEXT i
		tableWidths[h] <- tableWidths[h] + 1
		(keys[h]^)[tableWidths[h]] <- key
		(values[h]^)[tableWidths[h]] <- val
		RETURN TRUE
	ENDFUNCTION
ENDCLASS

DECLARE map: HashMapStringString
map <- NEW HashMapStringString()

OUTPUT map.has("key 1")
CALL map.set("key 1", "value 1")
OUTPUT map.has("key 1")

CALL map.set("key 2", "value 2")
CALL map.set("key 3", "value 3")

CALL map.set("foo", "AAAAA")
CALL map.set("foo", "BBBBB")

OUTPUT map.get("foo")
OUTPUT map.get("key 3")
OUTPUT map.get("key 1")
OUTPUT map.get("key 2")
OUTPUT map.has("nothing")
