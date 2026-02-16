# Get set Go - Variables in Go language


{{<img src="/images/getsetgo/banner.png" width="660">}}

In the [last part](https://ravichaganti.com/blog/get-set-go-first-program/) of this [series](https://ravichaganti.com/series/get-set-go/), you looked at writing your first program and understood the program structure and understood the keywords such as `package`, `import`, and `func`. It was a good start. In this part, you will learn how to declare and use variables in Go programs.

## Naming convention in Go

Before you start looking at variables in Golang, you must first understand some rules for naming different program entities -- variables, types, statements, packages, and constants -- in Go. 

- Names or identifiers for any of these entities must start either with a letter or an underscore. You can use Unicode letters as well.
- These names or identifiers can have any number of additional letters or underscores or digits. 
- The case of a name matters in Go language. For example, firstName is different from Firstname or FirstName.

You learned in the last part that [Go language has 25 keywords](https://golang.org/ref/spec#Keywords). These keyword names are reserved and may not be used as names or identifiers for any of the program entities. There are also a [few predeclared identifiers](https://golang.org/ref/spec#Predeclared_identifiers) in Go language. You may use the names of predeclared identifiers for your program entities but make sure you do not confuse yourself or create confusion for others reading your code.

While there is no limit on the number of characters in a name or an identifier, [Gophers tend to use shorter names](https://www.reddit.com/r/golang/comments/3aporh/why_so_many_gophers_use_single_letter_variables/) for program entities. It may sound strange for people coming from other programming language background but many Go programmers use single letter names and it is [highly recommended](http://doc.cat-v.org/bell_labs/pikestyle). The recommendation here is to use shorter names or identifiers for local scope and longer names for names or identifiers that have a larger visibility. You will learn more about scopes in a different part of this article. 

Finally, names or identifiers starting with an uppercase letter are used only when you want to make the program entity visible outside the current package. For example, if you revisit the code of your first program, the function that we used to print text on the console was `Println` in the `fmt` package. Otherwise, the general recommendation is to begin the name or identifier with a lowercase letter or underscore.

Alright, with this background, you can now get started with variables.

## Variables

A variable is essentially a storage location in memory to store a specific value of a given type. Variable declaration names the storage location for easier identification. The general syntax for declaring variables in Go language is as shown below.

```go
var name_of_variable type = value_or_expression
```

For example, `var s string` declares an identifier `s` to store a value of type string. This declaration also allocates the storage needed for storing the value. Assigning type or assigning a value at the time of variable declaration is optional. In Go language, there is no concept of uninitialized variables. When no value is assigned during declaration, the variable gets initialized to a default or zero value based on the type. For string type, it will be an empty string. The zero value assignment ensures that a variable always hold a valid value of the type specified.

When you specify the type during declaration, it defines the static type of the variable. If a type name is not specified during the declaration, a dynamic type gets determined based on the value assigned. 

You cannot skip both type and value assignment during variable declaration.

Let us see this in action.

```go
package main

import (
	"fmt"
	"reflect"
)

func main() {
	// declare a string variable without assigning a value
	var s string

	// print variable value
	fmt.Println("Value of variable s is", s)

	//declare a variable without type
	var fName = "Go"
	fmt.Println("type of variable fName is", reflect.TypeOf(fName))
}
```

When you run this Go program, you will see the following output.

 {{<img src="/images/getsetgo/d3-variable-01.png" width="300">}}

As seen in the output, the dynamic type of variable `fName` is set to `string`. After this, within this program, you cannot assign a value of another type to `fName`.

Go language allows you to declare multiple variables at the same time and these variable can be of different types as well. For example,

```go
	// multiple variables initialized to zero values
	var n1, n2, n3, n4 int

	// muliple variables with no type declaration but initializer values
	var n, s, f, b = 4, "golang", "3.14", true
```

In the above examples, the first one declares multiple integer type variables. In the second declaration, the values get on the right-hand side get assigned to the variables in the order specified. Also, you must match the number of values provided on the right to number of identifiers specified on the left. The variable initializers (on the right) can be literal values like what is specified above or can be expressions as well.

You can, similar to the import statement, wrap variable declaration in (). For example, the above two declarations can be changed to use the following syntax.

```go
	var (
		n1, n2, n3, n4 int
		n, s, f, b = 4, "golang", "3.14", true
	)
```

This is yet another way and usage depends on the readability requirements and preferences in your code. 

### Short variable declaration

Within Go functions, you can use a short variable declaration and syntax for that is:

```go
variable-name := value-or-expression
```

Remember that this can be used only within functions as non-declaration statements are not allowed at the package level. Here is a quick example of using short variable declaration method.

```go
package main

import (
	"fmt"
	"reflect"
)

func main() {
	//simple short variable declaration
	s := "Go Language"

	fmt.Println("Value of variable S is", s)
	fmt.Println("Type of variable s is", reflect.TypeOf(s))

	//short variable declaration for multiple variables
	n, b := 10, false
	fmt.Println("Values of n and b are", n, b)
}
```

Unlike `=` (assignment operator), `:=` is a declaration. Even in this case too, the initializer can either be a literal value or an expression such as a function call. You will see several examples this method of variable declaration as you go forward in this series.

Alright, that is a quick overview of declaring and using variables in Go language. It is time to practice what you learned. 

## Exercises

- In the first exercise, update the hello world program you create in the [last part](https://ravichaganti.com/blog/get-set-go-first-program/) to add a variable `fName` and initialize it with your name as the value. Finally, print the statement Hello, fName to the screen. Post your solution [here](https://gist.github.com/rchaganti/daa5741378a401935ee08102652ad278).
- Create a program that declares two integer variables i and j and assigns values 10 and 30. Print the values of these variables. Add an expression to swap the values of the variables using assignment operator. Finally, print the values of the variable values after swapping. Post your solution [here](https://gist.github.com/rchaganti/33b2cbf4fc121999d38c6ead7911eecd).
