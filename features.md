# Soodocode features list

# Syntax

## Literals

* [x] Numeric literals
* [x] String literals
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

<!-- TODO more detail -->
| Name | Comment | Supported |
| ---- | ------- | --------- |
| Record | Usually known as "struct". | [x] |
| Pointer | Points at a variable and can be used to change it. | [x] |
| Set | Similar to an array, but without ordering. | [~] |
| Enum | Stores one of a few specified values. | [x] |
| Class | Supports normal object-oriented programming features | [x] |

# Expressions

## Operators

### add
Syntax: `a + b`

Adds two numeric values and returns the numeric result.

Can also be used on enum values, returning the previous or next enum value.

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
