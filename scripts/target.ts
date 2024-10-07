import * as sc from "../build/index.js";

const limit = Number(process.argv[2]);
const count = Number(process.argv[3]);
if(isNaN(limit) || isNaN(count)) throw new Error(`Invalid arguments`);
const program = sc.parse(sc.tokenize(sc.symbolize(`\
DECLARE primeCount : INTEGER
CONSTANT limit = ${limit}
primeCount <- 0

DECLARE isPrime : ARRAY[2:limit] OF BOOLEAN

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
`)));
const runtime = new sc.Runtime(() => sc.crash("No input in perf test runtime"), () => {});
sc.configs.statements.max_statements.value = 10_000_000;

function jsSieve(limit:number){
	let primeCount = 0;
	const isPrime = Array<boolean>(limit).fill(true);

	for(let n = 2; n <= limit; n ++){
		if(isPrime[n]){
			// Print n if it is prime
			// OUTPUT n
			primeCount ++;
			
			// Then mark all its multiples as not prime
			for(let i = 2; i <= limit; i += n){
				isPrime[i] = false;
			}
		}
	}
	return isPrime;
}

 
for(let i = 0; i < count; i ++){
	performance.mark("execution");
	await runtime.runProgram(program.nodes);
	// console.log(jsSieve(100_000).join("\n").length);
	console.log(performance.measure("execution", "execution").duration.toFixed(4) + "ms");
}

