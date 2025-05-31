
FOR i <- 1 TO 100
  IF i MOD 15 = 0 THEN
    OUTPUT "FizzBuzz"
  ELSE; IF i MOD 5 = 0 THEN
    OUTPUT "Buzz"
  ELSE; IF i MOD 3 = 0 THEN
    OUTPUT "Fizz"
  ELSE
    OUTPUT i
  ENDIF; ENDIF; ENDIF
NEXT i
