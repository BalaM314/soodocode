/* Arithmetic */
OUTPUT 1 + 1 //Addition
OUTPUT 1 - 1 //Subtraction
OUTPUT 1 * 1 //Multiplication
OUTPUT 1 / 1 //Division
OUTPUT 1 DIV 1 //Integer division
OUTPUT 1 MOD 1 //Modulo
OUTPUT - 1 //Negation
OUTPUT "a" & "b" //String concatenation
/* Logical */
OUTPUT FALSE AND FALSE //Logical and
OUTPUT FALSE OR FALSE //Logical or
OUTPUT NOT FALSE //Logical not
/* Comparisons */
OUTPUT 1 = 1 //Equal to
OUTPUT 1 <> 1 //Not equal to
OUTPUT 1 < 1 //Less than
OUTPUT 1 > 1 //Greater than
OUTPUT 1 <= 1 //Less than or equal to
OUTPUT 1 >= 1 //Greater than or equal to
/* Pointers */
OUTPUT ^1 //Pointer reference
OUTPUT (^2)^ //Pointer dereference

/* Function calls */
OUTPUT func(1, 2, 3)
/* Array access */
OUTPUT arr[1]
OUTPUT arr[1, 2]
/* Class instantiation */
OUTPUT NEW class(1, 2, 3)

/* Precedence */
OUTPUT 2 + 2 * 2 //6
OUTPUT 2 + (2 * 2) //6
OUTPUT (2 + 2) * 2 //8
