# Notes

Contains writeups about interesting language features.

## A note on the DECLARE statement

The DECLARE statement works quite differently than many other languages.

In most other languages, you can declare an array or record variable, then assign an array or record to it, like this Typescript code:

```ts
let x: number[];
x = [1, 2, 3];
let y: { field: number };
y = { field: 123 };
```

However, pseudocode does not have array or object literals. The only way to get an array or object is from the DECLARE statement, which automatically allocates an array or object.

```js
DECLARE x: ARRAY[1:3] OF INTEGER
x[1] <- 1 //this is already accessible
DECLARE y: Recordtype
y.field <- 123 //y is already initialized
```

This initialization is also done recursively.

```js
TYPE Record
  DECLARE field: INTEGER
ENDTYPE
DECLARE x: ARRAY[1:10] OF Record //allocates the array, and also 10 records
x[0].field <- 50; //you can immediately write to the fields, the first declare statement already created all of the objects.
```

For comparison, in Typescript:
```ts
type Record = {
  field?: number;
};
const x = new Array<Record>(10);
x[0] = {};
x[0].field = 50; //in Typescript, you need to assign the object first before writing to a slot in that object
```

## A note on recursive types

Recursive record types without indirection are not allowed.

```js
TYPE Foo
  DECLARE field: Foo //recursive without indirection
ENDTYPE

DECLARE foo: Foo
//Because there is no way to say "foo <- Foo { }" like in Rust, the declare statement automatically initializes the fields
//that requires initializing foo.field,
//which requires initializing foo.field.field...
```

To work around this, you can use a class, like this:

```js
CLASS Foo
  PUBLIC field: Foo //recursive without indirection
ENDCLASS

DECLARE foo: Foo
//this variable is currently uninitialized, because it can be assigned to with foo <- NEW foo()

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
PROCEDURE foo(x: ARRAY OF INTEGER)
  OUTPUT LENGTH(x)
ENDPROCEDURE
DECLARE y: ARRAY[1:10] OF INTEGER
CALL foo(y)
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
FUNCTION arr(length: INTEGER) RETURNS ARRAY OF INTEGER
	DECLARE out: ARRAY[1:length] OF INTEGER
	RETURN out
ENDFUNCTION

TYPE pArray = ^ARRAY OF INTEGER
CLASS bar
	PUBLIC field: ARRAY OF INTEGER
	PUBLIC PROCEDURE NEW(len: INTEGER)
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
