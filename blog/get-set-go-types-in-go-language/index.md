# Get set Go - Types in Go language


After looking at variables in the [previous part](https://ravichaganti.com/blog/get-set-go-variables-in-go-language/) of this [series](https://ravichaganti.com/series/get-set-go/), you have a fair understanding of using different types of variable declarations and using the variable values in your program. Each of these variables you created and used have an associated type. The type of a variable dictates what that variable is allowed store. So, what are different data types in Go language? You will learn that today!

## Data types in Golang

Go language has several built-in data types and these types can be classified into three different categories -- basic data types, aggregate data types, reference types, and interface types. 

| Category             | Included types                            | Description                                                  |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| Basic data types     | Numerals, Strings, and Booleans           | Data types that form the basis or included in other data types |
| Aggregate data types | Arrays and Structs                        | Formed by combining the basic and simple data types          |
| Reference types      | Slices, Functions, Pointers, and Channels | Refer indirectly to state or program variables               |
| Interface types      |                                           | Abstractions around behavior of other types                  |

In this part, you will learn about basic data types and you will learn about other types as you proceed in this series.

## Basic data types

In the last chapter, some of the examples used variables of `integer`, `string`, and `boolean` data types. To recap, `var <variable-name> <data-type> = <value | expression>` is how you declare variables. You learned that the variable declaration can either use static type declaration or the type can be determined based on the value assigned to the variable. The three types mentioned here fall in the category of basic data types. The following sections dive into each of these basic data types.

### Numerals

Go language supports [different types to represent numbers](https://golang.org/ref/spec#Numeric_types). You can at a high-level categorize these into integers, floating point numbers, and complex numbers. Each of these types represent the size of the value that can be stored within a variable of that type. And, these types can be both signed and unsigned.

| Type       | Description                                           | Possible values                             |
| ---------- | ----------------------------------------------------- | ------------------------------------------- |
| uint8      | unsigned  8-bit integers                              | 0 to 255                                    |
| uint16     | unsigned 16-bit integers                              | 0 to 65535                                  |
| uint32     | unsigned 32-bit integers                              | 0 to 4294967295                             |
| uint64     | unsigned 64-bit integers                              | 0 to 18446744073709551615                   |
| int8       | signed 8-bit integers                                 | -128 to 127                                 |
| int16      | signed 16-bit integers                                | -32768 to 32767                             |
| int32      | signed 32-bit integers                                | -2147483648 to 2147483647                   |
| int64      | signed 64-bit integers                                | -9223372036854775808 to 9223372036854775807 |
| float32    | 32-bit floating-point numbers                         |                                             |
| float64    | 64-bit floating-point numbers                         |                                             |
| complex64  | complex numbers with float32 real and imaginary parts |                                             |
| complex128 | complex numbers with float64 real and imaginary parts |                                             |
| byte       | alias for uint8                                       |                                             |
| rune       | alias for int32                                       |                                             |

Well, this is a huge list and what you choose to use in your program really depends on your need. Within integers, unsigned integers (uint) contain only the positive numbers while signed (int) contains both positive and negative numbers. Integers come in different sizes -- 8, 16, 32, and 64 bits. `int` is probably the most commonly used numeric type. 

A `byte` type is same as `unit8`. You will see a good number of examples using `byte` type in this series of articles. The type `rune` is same as `int32`.

Floating point numbers contain a decimal component. For example 3.14 is a floating point number. Floating point numbers come in 32 and 64 bit sizes. The `complex64` and `complex128` are essentially floating point types with the imaginary part.

Like every other programming language, Go too supports a wide array of arithmetic operators to work with different data types. For example, `+`, `-`, `*`, `/`, and `%`. The first four operators apply to all types if numerals while the last one -- remainder operator (`%`) -- applies only to integers. 

Here is an example that sh ows all these numeric data types.

```go
package main

import "fmt"

func main() {
	fmt.Println(1 + 10)
	fmt.Println(2.0 * 10)
	fmt.Println(3.3 / 3.1)
	fmt.Println(4 - 5)
	fmt.Println(5 % 5)
}
```

Using complex numbers in Go language is a bit different from how you initialize and use ints and floats. 

```go
package main

import "fmt"

func main() {
	// using constructor to create a comples number
	c1 := complex(56, 3)

	// gets real part
	realPart := real(c1)

	// gets imaginary part
	imgPart := imag(c1)

	fmt.Println(c1)
	fmt.Println(realPart)
	fmt.Println(imgPart)

	// second method to creating complex numbers
	c2 := 10 + 6i
	fmt.Println(real(c2))
	fmt.Println(imag(c2))

	//complex number arithmetic
	fmt.Println(c1 + c2)
}
```

In the above example, the constructor function `complex()` creates a complex number. The two arguments to this function are the real and imaginary parts of the number. The `real()` function gets the real part of a complex number while the imaginary part can be retrieved using `imag()` function. Finally, the last line shows the complex number arithmetic.

### Strings

Strings are sequences of characters. Each character is represented by a byte value. Go language supports unicode characters as well as a part of the strings. So, one of the examples you saw earlier -- "I ❤ Golang!" -- is a totally valid string in Golang. String literals should always be enclosed either in double-quotes or back ticks.

```go
package main

import "fmt"

func main() {
	fmt.Println("I ❤ Golang!")
	fmt.Println(`Go language is simple to learn!`)
}
```

In other languages -- if you are familiar with PowerShell like I do -- you might have used single-quotes as well to represent strings. While single-quotes are not permitted, using back ticks is in a way similar to single-quotes. For example, in Go, the escape sequences such as `/n` (newline) and `/t` (tab) have no meaning when the string is enclosed in back ticks. Update the example above to add one of these escape sequences and try out the program again.   Do you see something similar where the escape sequence at the end of string enclosed in back ticks does not get replaced to its meaning?

{{<img src="/images/getsetgo/d4-strings-01.png" width="500">}}

As mentioned earlier, strings are sequence of characters and get indexed from 0. So, for example, `"Golang"[3]` refers to byte representation of character "a". So, if you use `fmt.Println("Golang"[3])`, you will see 97 printed on the console.   So, how can you print the character "a" instead of its byte representation? For this, you use format verbs. You will learn more about string formatting in a later article but if you are keen on trying this, you can use the following statement to print the character instead of its byte value.

```go
fmt.Printf("%q", "Golang"[3])
```

Note that in the above example, `Printf` function is used instead of the `Println`. 

The length of a string is equivalent to the number of bytes in the string. You can derive the length of a string in Go using the predeclared function called `len`.

```go
fmt.Println(len("Golang"))
```

Finally, you can concatenate strings using the `+` operator.

```go
fmt.Println("I " + "❤ " + "Golang!")
```

### Booleans

Booleans represent a `true` or `false` value. true and false are predeclared constants in Go and represent the boolean truth values. The predeclared boolean type is `bool`. Booleans are represented using special one bit integer values. With boolean values, you use logical operators such as `&&` (and), `||` (or), and `!` (not). 

```go
package main

import (
	"fmt"
	"reflect"
)

func main() {
	// using constructor to create a comples number
	var isTypeNum bool
	a := 10

	isTypeNum = (reflect.TypeOf(a).String() == "int")
	fmt.Println("Is variable a of type int?:", isTypeNum)
}
```

The statement `var isTypeNum bool` creates a variable named `isTypeNum` of type boolean. The expression `(reflect.TypeOf(a).String() == "int")` uses the `TypeOf()` function in the `reflect` package to retrieve the type of variable a, convert it to string and then compare it to the string "int" using the `==` operator. This comparison (you will learn about comparison operators when looking at control flow statements) results in a boolean value -- true or false and that gets assigned to the variable `isTypeNum` as value.

This is quick overview of basic data types in Go language. It is time to practice what you learned today.

## Exercises

- Create a program that declares two variables -- an integer and a floating pointing type. Perform multiplication of these values and print the result using `Println` function. Post your solution [here](https://gist.github.com/rchaganti/687707e99bb63cb59bdc37bf9e8f7b79).
- Create a program that uses shorthand declaration to declare variables of types `int`, `string`, and `bool` and assigns the values 10, 'hello', and true respectively. What happens when you use the statement `fmt.Println(i == s)`. Publish your answer [here](https://gist.github.com/rchaganti/b15475bb628b88cd3e905564427cf531). What did you learn from this exercise?
