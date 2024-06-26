import * as sc from "../build/index.js";
const limit = 100000;
const program = sc.parse(sc.tokenize(sc.symbolize(`DECLARE primeCount : INTEGER
CONSTANT limit = ${limit}
primeCount <- 0

DECLARE isPrime : ARRAY[2:${limit}] OF BOOLEAN

// Initialise array
FOR n <-- 2 TO limit
    isPrime[n] <-- TRUE
NEXT n

FOR n <-- 2 TO limit
    IF isPrime[n] THEN
        // Print n if it is prime
        OUTPUT n
        primeCount <-- primeCount + 1
        
        // Then mark all its multiples as not prime
        FOR i <-- 2 TO limit STEP n
            isPrime[i] <-- FALSE
        NEXT i
    ENDIF
NEXT n

OUTPUT "There are " & primeCount & " primes in the range 2-" & limit
`)));
const runtime = new sc.Runtime(() => sc.crash("No input in perf test runtime"), () => { });
function jsSieve(limit) {
    let primeCount = 0;
    const isPrime = Array(limit).fill(true);
    for (let n = 2; n <= limit; n++) {
        if (isPrime[n]) {
            primeCount++;
            for (let i = 2; i <= limit; i += n) {
                isPrime[i] = false;
            }
        }
    }
    return isPrime;
}
for (let i = 0; i < 10; i++) {
    performance.mark("execution");
    console.log(jsSieve(10000000).join("\n").length);
    console.log(performance.measure("execution", "execution").duration.toFixed(4) + "ms");
}
