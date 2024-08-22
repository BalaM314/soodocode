CONSTANT limit = 100000

DECLARE isPrime : ARRAY[2:limit] OF BOOLEAN
DECLARE primeCount: INTEGER
primeCount <- 0

// Initialise array
FOR n <- 2 TO limit
	isPrime[n] <- TRUE
NEXT n

FOR n <- 2 TO limit
	IF isPrime[n] THEN
		// Print n if it is prime
		OUTPUT n
		primeCount <- primeCount + 1
		
		// Then mark all its multiples as not prime
		FOR i <- 2 TO limit STEP n
			isPrime[i] <- FALSE
		NEXT i
	ENDIF
NEXT n

OUTPUT "There are ", primeCount, " primes in the range 2-", limit
