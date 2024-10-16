
/* Types */

//Pointer type alias
TYPE pINTEGER = ^INTEGER
//Set type alias
TYPE intSet = SET OF INTEGER
//Enum type
TYPE season = (spring, summer, fall, winter)
//Record type
TYPE record
  DECLARE field1: INTEGER
  DECLARE field2: STRING
ENDTYPE

/* Declarations */

//Declaration
DECLARE x: INTEGER
DECLARE var1, var2, var3: INTEGER
//Assignment
x <- 5
//Constants
CONSTANT y = 5
//Define (for sets)
DEFINE set (1, 2, 3, 4, 5): intSet

/* I/O */
//Output
OUTPUT "Hello, world!"
OUTPUT "The value of x is ", x, ", and the value of y is ", y
//Input
INPUT x

/* Control flow */
//If statements
IF NOT FALSE THEN
  IF 4 > 5 THEN
  ELSE
    IF 5 < 6 THEN
      
    ENDIF
  ENDIF
ENDIF

//Case statements
CASE OF 2 + 2
  2: OUTPUT "impossible"
  3: OUTPUT "also impossible"
     OUTPUT "yep, impossible"
  -1:
    OUTPUT "still impossible"
  4: OUTPUT "math works"
  3 TO 5: OUTPUT "not reached"
ENDCASE

//For statement
FOR i <- 1 TO 2
  OUTPUT i
NEXT i
//For with step
FOR i <- 1 TO 50 STEP 11
  OUTPUT i //1, 12, 23, 34, 45
NEXT i

DECLARE flag: BOOLEAN
flag <- TRUE

//While
WHILE flag
  flag <- FALSE
ENDWHILE
//Repeat..until
REPEAT
  flag <- TRUE
UNTIL flag

/* Functions */
//Procedure
PROCEDURE foo()
  OUTPUT "statement 1"
  OUTPUT "statement 2"
ENDPROCEDURE
//Call
CALL foo()
//Procedure with arguments
PROCEDURE foo2(arguments:STRING)
  OUTPUT "arguments: ", arguments
  OUTPUT "statement 1"
  OUTPUT "statement 2"
ENDPROCEDURE
CALL foo2("foo2 arguments")
//Function
FUNCTION double(x: INTEGER) RETURNS INTEGER
  //Return
  RETURN x * 2
ENDFUNCTION
OUTPUT double(2)

/* Classes */
//Class declaration
CLASS Amogus
  //Public field
	PUBLIC name: STRING
  //Private field
	PRIVATE susLevel: INTEGER
  //Constructor
	PUBLIC PROCEDURE NEW(Name: STRING, SusLevel: INTEGER)
    //Fields can be accessed directly
		name <- Name
		susLevel <- SusLevel
	ENDPROCEDURE
  //Public procedure
	PUBLIC PROCEDURE eject(requiredSusLevel: INTEGER)
		IF susLevel >= requiredSusLevel AND canEject() THEN
			OUTPUT name, " was ejected."
		ELSE
			OUTPUT "Nobody was ejected. (skipped)"
		ENDIF
	ENDPROCEDURE
  //Private function
  PRIVATE FUNCTION canEject() RETURNS BOOLEAN
    RETURN name <> "root"
  ENDFUNCTION
ENDCLASS

DECLARE amogus: Amogus
amogus <- NEW Amogus("mogus", 42)
CALL amogus.eject(30) //Nobody was ejected. (skipped)
CALL amogus.eject(50) //mogus was ejected
amogus <- NEW Amogus("root", 42)
CALL amogus.eject(50) //Nobody was ejected. (skipped)

//Inheritance
CLASS ToggleableImmortalityAmogus INHERITS Amogus
  //New fields
  PUBLIC isImmortal: BOOLEAN
  //New constructor
  PUBLIC PROCEDURE NEW(Name: STRING, SusLevel: INTEGER)
    //Use SUPER to call the base class constructor
    CALL SUPER.NEW(Name, SusLevel)
    isImmortal <- TRUE
  ENDPROCEDURE
  //Overriding an existing function
  PRIVATE FUNCTION canEject() RETURNS BOOLEAN
    RETURN isImmortal
  ENDFUNCTION
ENDCLASS

DECLARE amogus2: ToggleableImmortalityAmogus
amogus2 <- NEW ToggleableImmortalityAmogus("hello", 15)
CALL amogus2.eject(30) //Nobody was ejected. (skipped)
amogus2.isImmortal <- FALSE
CALL amogus2.eject(30) //hello was ejected

/* Files */
//Open a file for write
OPENFILE "file.txt" FOR WRITE
//Write to it
WRITEFILE "file.txt", "data 1"
WRITEFILE "file.txt", "data 2"
WRITEFILE "file.txt", "data 3"
//Close the file
CLOSEFILE "file.txt"

//Open a file for append
OPENFILE "file.txt" FOR APPEND
WRITEFILE "file.txt", "data 4!!!"
CLOSEFILE "file.txt"

//Read a file
DECLARE buffer: STRING
OPENFILE "file.txt" FOR READ
READFILE "file.txt", buffer
OUTPUT buffer
READFILE "file.txt", buffer
OUTPUT buffer
WHILE NOT EOF("file.txt")
  READFILE "file.txt", buffer
  OUTPUT buffer
ENDWHILE
CLOSEFILE "file.txt"
