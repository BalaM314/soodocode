import * as sc from "../core/build/index.js";

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
const runtime = new sc.Runtime(() => sc.crash("No input in perf test runtime"), () => {}, new sc.LocalFileSystem(false));
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

const times = [];
for(let i = 0; i < count; i ++){
	performance.mark("execution");
	runtime.runProgram(program.nodes);
	// console.log(jsSieve(100_000).join("\n").length);
	const duration = performance.measure("execution", "execution").duration;
	times.push(duration);
	console.log(duration.toFixed(4) + "ms");
}
console.log("Cold: " + times[0].toFixed(4) + "ms");
console.log("Average: " + (times.reduce((a, b) => a + b, 0) / times.length).toFixed(4) + "ms");

