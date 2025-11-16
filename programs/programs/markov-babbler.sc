TYPE pARRAY_OF_STRING = ^ARRAY OF STRING
TYPE pARRAY_OF_VecString = ^ARRAY OF VecString

FUNCTION wrapArrayString(x: ARRAY OF STRING) RETURNS ARRAY OF STRING
	RETURN x
ENDFUNCTION
FUNCTION wrapArrayVecString(x: ARRAY OF VecString) RETURNS ARRAY OF VecString
	RETURN x
ENDFUNCTION

CLASS VecString
	PRIVATE array: ARRAY OF STRING
	PRIVATE arrayLength: INTEGER
	PRIVATE length: INTEGER
	PRIVATE loadFactor: REAL
	PUBLIC PROCEDURE NEW(Length: INTEGER)
		length <- 0
		arrayLength <- Length
		IF arrayLength <= 0 THEN
			arrayLength <- 1
		ENDIF
		DECLARE arr: ARRAY[0:arrayLength - 1] OF STRING
		array <- arr
		loadFactor <- 0.7
	ENDPROCEDURE
	PUBLIC FUNCTION length() RETURNS INTEGER
		RETURN length
	ENDFUNCTION
	PUBLIC FUNCTION get(i: INTEGER) RETURNS STRING
		IF i < 0 OR i >= length THEN
			DECLARE array: ARRAY[0:length - 1] OF STRING
			//Array index out of bounds
			OUTPUT array[i]
		ENDIF
		RETURN array[i]
	ENDFUNCTION
	PUBLIC FUNCTION rand() RETURNS STRING
		RETURN array[INT(RAND(length))]
	ENDFUNCTION
	PUBLIC PROCEDURE set(i: INTEGER, val: STRING)
		IF i < 0 OR i >= length THEN
			DECLARE array: ARRAY[0:length - 1] OF STRING
			//Array index out of bounds
			OUTPUT array[i]
		ENDIF
		array[i] <- val
	ENDPROCEDURE
	PUBLIC PROCEDURE push(val: STRING)
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
			DECLARE newArr: ARRAY[0:Length - 1] OF STRING
			FOR i <- 0 TO length - 1
				newArr[i] <- array[i]
			NEXT i
			array <- newArr
			arrayLength <- Length
		ENDIF
	ENDPROCEDURE
ENDCLASS

FUNCTION hash(str: STRING, size: INTEGER) RETURNS INTEGER
	DECLARE hash: INTEGER
	hash <- 0
	FOR i <- 1 TO LENGTH(str)
		hash <- hash + i * ASC(MID(str, i, 1))
	NEXT i
	RETURN hash MOD size
ENDFUNCTION

CLASS HashMapStringVecString
	PUBLIC tableSizes: ARRAY OF INTEGER
	PUBLIC keys: ARRAY OF pARRAY_OF_STRING
	PUBLIC values: ARRAY OF pARRAY_OF_VecString
	PUBLIC tableSize: INTEGER
	PUBLIC PROCEDURE NEW()
		tableSize <- 101
		DECLARE keys_: ARRAY[0: tableSize - 1] OF pARRAY_OF_STRING
		DECLARE values_: ARRAY[0: tableSize - 1] OF pARRAY_OF_VecString
		DECLARE tableSizes_: ARRAY[0: tableSize - 1] OF INTEGER
		FOR i <- 0 TO tableSize - 1
			DECLARE keys_list: ARRAY[1:1] OF STRING
			DECLARE values_list: ARRAY[1:1] OF VecString
			keys_[i] <- ^wrapArrayString(keys_list)
			values_[i] <- ^wrapArrayVecString(values_list)
		NEXT i
		keys <- keys_
		values <- values_
		tableSizes <- tableSizes_
	ENDPROCEDURE
	PUBLIC FUNCTION has(key: STRING) RETURNS BOOLEAN
		DECLARE h: INTEGER
		h <- hash(key, tableSize)
		FOR i <- 1 TO tableSizes[h]
			IF (keys[h]^)[i] = key THEN
				RETURN TRUE
			ENDIF
		NEXT i
		RETURN FALSE
	ENDFUNCTION
	PUBLIC FUNCTION get(key: STRING) RETURNS VecString
		DECLARE h: INTEGER
		h <- hash(key, tableSize)
		FOR i <- 1 TO tableSizes[h]
			IF (keys[h]^)[i] = key THEN
				RETURN (values[h]^)[i]
			ENDIF
		NEXT i
		OUTPUT "Error: key ", key, " was not found in the hash map"
		OUTPUT 1 DIV 0
	ENDFUNCTION
	PUBLIC FUNCTION insert(key: STRING, vec: VecString) RETURNS BOOLEAN
		DECLARE h: INTEGER
		h <- hash(key, tableSize)
		IF LENGTH(keys[h]^) <= tableSizes[h] THEN
			//Resize backing array
			DECLARE newLength: INTEGER
			newLength <- tableSizes[h] * 2
			DECLARE newKeys: ARRAY[1:newLength] OF STRING
			DECLARE newVals: ARRAY[1:newLength] OF VecString
			FOR i <- 1 TO tableSizes[h]
				newKeys[i] <- (keys[h]^)[i]
				newVals[i] <- (values[h]^)[i]
			NEXT i
			keys[h] <- ^wrapArrayString(newKeys)
			values[h] <- ^wrapArrayVecString(newVals)
		ENDIF
		FOR i <- 1 TO tableSizes[h]
			IF (keys[h]^)[i] = key THEN
				RETURN FALSE
			ENDIF
		NEXT i
		tableSizes[h] <- tableSizes[h] + 1
		(keys[h]^)[tableSizes[h]] <- key
		(values[h]^)[tableSizes[h]] <- vec
		RETURN TRUE
	ENDFUNCTION
ENDCLASS

FUNCTION isSentenceEnding(word: STRING) RETURNS BOOLEAN
  RETURN RIGHT(word, 1) = '.' OR RIGHT(word, 1) = '!' OR RIGHT(word, 1) = '?'
ENDFUNCTION

FUNCTION createDictionary(input: STRING) RETURNS HashMapStringVecString
	DECLARE data: HashMapStringVecString
	data <- NEW HashMapStringVecString()
	DECLARE prevWord: STRING
	prevWord <- "$"
	
	//Split input into words
	DECLARE count: INTEGER
	count <- 1
	FOR i <- 1 TO LENGTH(input)
		IF MID(input, i, 1) = ' ' THEN
			count <- count + 1
		ENDIF
	NEXT i
	DECLARE words: ARRAY[1:count] OF STRING
	count <- 1
	FOR i <- 1 TO LENGTH(input)
		IF MID(input, i, 1) = ' ' THEN
			count <- count + 1
		ELSE
			words[count] <- words[count] & MID(input, i, 1)
		ENDIF
	NEXT i

	//Process words
	FOR i <- 1 TO LENGTH(words)
		IF words[i] <> "" THEN
			IF data.has(prevWord) THEN
				CALL data.get(prevWord).push(words[i])
			ELSE
				DECLARE vec: VecString
				vec <- NEW VecString(1)
				CALL vec.push(words[i])
				CALL data.insert(prevWord, vec)
			ENDIF
			IF isSentenceEnding(words[i]) THEN
				prevWord <- "$"
			ELSE
				prevWord <- words[i]
			ENDIF
		ENDIF
	NEXT i
	RETURN data
ENDFUNCTION

FUNCTION generateText(data: HashMapStringVecString, count: INTEGER) RETURNS STRING
	DECLARE prevWord: STRING; prevWord <- "$"
	DECLARE out: STRING; out <- ""
	FOR _ <- 1 TO count
		DECLARE word: STRING
	    word <- data.get(prevWord).rand()
	    out <- out & word & ' '
	    IF NOT data.has(word) THEN
		   	prevWord <- '$'
		ELSE
			prevWord <- word
		ENDIF
	NEXT _
	RETURN out
ENDFUNCTION


CONSTANT trainingData = "a b c d e f g h"

OUTPUT generateText(createDictionary(trainingData), 100)