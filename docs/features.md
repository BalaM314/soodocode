# Soodocode features list

# Syntax

## Literals

* [x] Numeric literals
* [x] String literals
  * [x] Multiline string literals
* [x] Char literals
* [ ] Date literals

## Operators
| Name | Syntax | Type | Supported |
| ---- | ---- | ---- | --------- |
| add | + | binary | [x] |
| subtract | - | binary | [x] |
| negate | - | unary prefix | [x] |
| multiply | * | binary | [x] |
| divide | / | binary | [x] |
| integer_divide | DIV | binary | [x] |
| mod | MOD | binary | [x] |
| or | OR | binary | [x] |
| and | AND | binary | [x] |
| not | NOT | unary prefix | [x] |
| equal_to | = | binary | [x] |
| not_equal_to | <> | binary | [x] |
| less_than | < | binary | [x] |
| less_than_equal | <= | binary | [x] |
| greater_than | > | binary | [x] |
| greater_than_equal | >= | binary | [x] |
| string_concatenate | & | binary | [x] |
| pointer_reference | ^ | unary prefix | [x] |
| pointer_dereference | ^ | unary postfix | [x] |
| access | . | binary | [x] |
| array access | \[ ] | special | [x] |
| function call | \( ) | special | [x] |
| new | NEW | special | [x] |

## Comments
* [x] Single line comments (from `//` not in a string, to the end of the line)
* [x] Multiline comments (from `/*` not in a string, to the next `*/` )

# Types

## Primitives
| Name | Comment | Supported |
| ---- | ------- | --------- |
| BOOLEAN | | [x] |
| INTEGER | | [x] |
| REAL | Usually known as "double" | [x] |
| STRING | Arbitrary length | [x] |
| CHAR | Stores a single [Unicode Scalar Value](https://www.unicode.org/glossary/#unicode_scalar_value) | [x] |
| DATE | Stores a day, month, and year | [x] |
| ARRAY | Stores a fixed number of another data type | [x] |

## User-defined types

| Name | Comment | Example | Supported |
| ---- | ------- | ------- | --------- |
| Record | Usually known as "struct". | TYPE name<br>DECLARE field: INTEGER<br>ENDTYPE | [x] |
| Pointer | Points at a variable and can be used to change it. | TYPE name = ^INTEGER | [x] |
| Set | Similar to an array, but without ordering. | TYPE name = SET OF INTEGER | [x] |
| Enum | Stores one of a few specified values. | TYPE name = (value1, value2, value3) | [x] |
| Class | Supports normal object-oriented programming features | CLASS name<br>ENDCLASS | [x] |
| Integer range | An INTEGER between two values (inclusive). | 1..10 | [x] |

### Records

A record type is a user-defined composite data type, made up of zero or more fields.

Initializing a variable of type (record type) causes all its fields to be initialized automatically.

## A note on recursive types

Because records do not have a constructor, initializing a variable of type (record type) causes all its fields to be initialized automatically.

This means recursive record types without indirection are not allowed.

```js
TYPE Foo
  DECLARE field: Foo //recursive without indirection
ENDTYPE
DECLARE foo: Foo
//Initializing this variable of type Foo requires initializing foo.field,
//which requires initializing foo.field.field...
```

To work around this, you can use a class, like this:

```js
CLASS Foo
  PUBLIC field: Foo //recursive without indirection
ENDCLASS

DECLARE foo: Foo
//this variable is currently uninitialized

foo <- NEW foo()
//foo.field is now uninitialized
foo.field <- NEW foo()
//foo.field.field is still uninitialized
//This does not create an infinite loop
```

Alternatively, use a pointer, like this:

```js
TYPE pFoo = ^Foo
TYPE Foo
  DECLARE field: ^Foo //recursive with indirection
ENDTYPE
DECLARE foo1, foo2: Foo
//foo1.field is now uninitialized

foo1.field <- ^foo2
```

These approaches have a drawback: there is no way to check if a variable is initialized without attempting to access it, which terminates the program. Use of a separate flag variable is recommended.

## A note on variable length array types

In Soodocode, all arrays must have a fixed length. The DECLARE statement automatically initializes an array, so it is not possible to DECLARE a variable with an unknown length and leave it uninitialized. However, there are a few places when variable-length array types can be used.

### In function parameters

```js
PROCEDURE arr(x: ARRAY OF INTEGER)
  OUTPUT LENGTH(x)
ENDPROCEDURE
DECLARE y: ARRAY[1:10] OF INTEGER
CALL arr(y)
```
Here, the parameter "x" can accept an array of any length, because when the function is actually running, it has a known length.

This can also be thought of as the function being generic:

```ts
function arr<const T extends number[]>(x:T){
  console.log(x.length);
}
const y = Array<number>(10).fill(0);
arr<number[] & {length: 10;}>(y);
```

Functions may return an array of arbitrary length, however, this is difficult to use. 

```js
//returns an array with a random length
FUNCTION arr() RETURNS ARRAY OF INTEGER
  DECLARE out: ARRAY[1:ROUND(RAND(100), 0)] OF INTEGER
  RETURN out
ENDFUNCTION

OUTPUT LENGTH(arr()) //we can call the function, but how do we store the return value?
DECLARE x: ARRAY OF INTEGER //not allowed, because DECLARE allocates and initializes the array
```

Variable-length arrays are also not allowed in record types, because record types automatically initialize their fields.

```js
TYPE foo
  DECLARE field: ARRAY OF INTEGER
ENDTYPE
DECLARE x: foo //not allowed: this tries to initialize x.field
```

There are two workarounds.

### Varlength arrays behind pointers

Pointers do not do any automatic initialization, so variable-length arrays can be safely stored behind a pointer.

```js
//returns an array with a random length
FUNCTION arr() RETURNS ARRAY OF INTEGER
  DECLARE out: ARRAY[1:ROUND(RAND(100), 0)] OF INTEGER
  RETURN out
ENDFUNCTION

//pointer to array of integer (unknown length)
TYPE arrayWrapper = ^ARRAY OF INTEGER
DECLARE x: arrayWrapper

x <- ^arr() //Store a pointer to the return value

OUTPUT LENGTH(x^)
FOR i <- 1 TO LENGTH(x^)
	OUTPUT (x^)[i]
NEXT i

x^ <- arr() //This also works
```

### Varlength arrays behind class fields

At first glance, it looks like class fields are automatically initialized, but there is a way to avoid initializing them.

```js
CLASS bar
  PUBLIC field: ARRAY OF INTEGER
  PUBLIC PROCEDURE NEW()
  ENDPROCEDURE
ENDCLASS

DECLARE x: bar; x <- NEW bar()
OUTPUT x.field //initialized?
```

The trick is to lazily initialize class fields: if the first assignment to a field occurs in the constructor, it never needs to be initialized. Therefore, the following code works:

```js
FUNCTION arr() RETURNS ARRAY OF INTEGER
  DECLARE out: ARRAY[1:ROUND(RAND(100), 0)] OF INTEGER
  RETURN out
ENDFUNCTION


CLASS bar
  PUBLIC field: ARRAY OF INTEGER
  PUBLIC PROCEDURE NEW()
    field <- arr()
    //field never needed to be initialized
  ENDPROCEDURE
ENDCLASS

DECLARE x: bar; x <- NEW bar()
OUTPUT LENGTH(x.field)
```

(If the field is not assigned to in the constructor, it will be automatically initialized after the constructor runs, which will cause an error)

### Varlength arrays behind class fields and pointers

```js
FUNCTION arr(x: INTEGER) RETURNS ARRAY OF INTEGER
	DECLARE out: ARRAY[1:x] OF INTEGER
	RETURN out
ENDFUNCTION

TYPE pArray = ^ARRAY OF INTEGER
CLASS bar
	PUBLIC field: ARRAY OF INTEGER
	PUBLIC PROCEDURE NEW(len: INTEGER)
		//The field is assigned to before it is used, so it does not need to be initialized
		field <- arr(len)
	ENDPROCEDURE
ENDCLASS

DECLARE x: bar
DECLARE y: pArray

x <- NEW bar(1)
y <- ^x.field //Create a pointer to x.field

FOR i <- 1 TO LENGTH(x.field) //Loop through x.field
	OUTPUT x.field[i]
NEXT i

FOR i <- 1 TO LENGTH(y^) //Loop through the pointer
	OUTPUT (y^)[i]
NEXT i

//Replace x.field with an array of different type
x.field <- arr(2)

//The pointer should still be pointing to x.field
FOR i <- 1 TO LENGTH(y^)
	OUTPUT (y^)[i]
NEXT i
```

This was difficult to implement, but it is supported.

# Expressions

## Operators

### add
Syntax: `a + b`

Adds two numbers and returns the result as a number.

Can also be used on enum values, returning the previous or next enum value.

### subtract
Syntax: `a - b`

Subtracts two numbers and returns the result as a number.

### negate
Syntax: `- a`

Returns the negation of a number (the number times -1).

### multiply
Syntax: `a * b`

Multiplies two numbers and returns the result as a number.

### divide
Syntax: `a / b`

Divides two numbers, giving the result as a REAL. The return type of this operator cannot be coerced to INTEGER, please use the DIV operator for that.

### integer_divide
Syntax: `a DIV b`

Divides two numbers using integer division, and returns the result as an INTEGER, discarding the remainder. Equivalent to FLOOR(a / b).

### mod
Syntax: `a MOD b`

Divides two numbers using integer division and returns the remainder.

### or
Syntax: `a OR b`

Returns TRUE if one or both of its boolean inputs are TRUE.

### and
Syntax: `a AND b`

Returns TRUE if both of its boolean inputs are TRUE.

### not
Syntax: `NOT a`

Returns the opposite of its boolean input: TRUE if the input is FALSE, and FALSE if the input is TRUE.

### equal_to
Syntax: `a = b`

Returns TRUE if the inputs are equal. Inputs can be of any type.

### not_equal_to
Syntax: `a <> b`

Returns TRUE if the inputs are not equal. Inputs can be of any type.

### less_than
Syntax: `a < b`

Returns TRUE if the first input is less than the second input.

### less_than_equal
Syntax: `a <= b`

Returns TRUE if the first input is less than or equal to the second input.

### greater_than
Syntax: `a > b`

Returns TRUE if the first input is greater than the second input.

### greater_than_equal
Syntax: `a >= b`

Returns TRUE if the first input is greater than or equal to the second input.

### string_concatenate
Syntax: `a & b`

Puts the second string input after the first and returns the combined string.

### pointer_reference
Syntax: `^a`

Returns a pointer to the input.

### pointer_dereference
Syntax: `a^`

Deferences the pointer input, accessing the underlying value.

### access
Syntax: `a.b`

Accesses a property on the first input.

### array access
Syntax: `a[b]` or `a[b, c]`

`a` must be an array with dimension equal to the number of indexes. Returns the value in the array at the specified index(es).

### function call
Syntax: `a()` or `a(b, c, d)`

`a` must be a function with parameter count equal to the number of arguments. Calls the function `a` with the specified arguments and returns the return value.

### new
Syntax: `NEW a()` or `NEW a(b, c, d)`

`a` must be the name of a class. Creates a new instance of the class by invoking the constructor with the given arguments and returns the class instance.

# Statements

## Basic

### DECLARE
### DEFINE
### CONSTANT
### Assignment
### OUTPUT
### INPUT

## Control flow

### RETURN
### CALL
### IF
### ELSE
### CASE OF
### Case branch
### Case branch (range)
### FOR..NEXT
### FOR..NEXT (step)
### WHILE
### REPEAT..UNTIL

## Types

### TYPE..ENDTYPE (record)
### TYPE (pointer)
### TYPE (enum)
### TYPE (set)

## Functions

### FUNCTION
### PROCEDURE

## File operations

### OPENFILE
### READFILE
### WRITEFILE
### CLOSEFILE
### SEEK
### GETRECORD
### PUTRECORD

## Classes

### CLASS
### CLASS INHERITS
### Class property
### Class procedure
### Class function

# Builtin functions

TODO
