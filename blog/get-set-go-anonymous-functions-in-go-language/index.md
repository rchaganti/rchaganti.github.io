# Get set Go - Anonymous Functions in Go language


{{<img src="/images/getsetgo/banner.png" width="660">}}

In the last part of the series, you learned about functions in Go language. Functions are first-class citizens in Golang. What this means is that you can not only use function declarations as just reusable code blocks but you can also assign functions to variables, use functions as parameters on other functions, and even return functions from other functions. This is achieved using function literals which are also known as anonymous functions.

## Function literals

Go language specification defines a function literal syntax as follows.

```go
FunctionLit = "func" Signature FunctionBody .
```

Compare this to the function declaration syntax.

```go
FunctionDecl = "func" FunctionName Signature [ FunctionBody ] .
```

The difference is in the name of the function. The function literals or anonymous functions do not have a name or an identifier. The function declaration binds an identifier to a function whereas function literals do not have a name or an identifier (and, therefore called anonymous functions) and can be assigned to a variable, passed to another function, and returned from a function.

### Inline execution

Here is an example of inline execution of a function literal.

```go
package main

import "fmt"

func main() {
	fmt.Println("Hello from main!")
    func() {
		fmt.Println("Hello from an anonymous function!")
	}()
}
```

In the above example, the function literal inside `main` is the function literal. It has no name or an identifier. And, the parenthesis at the end of the function literal make it execute inline. So, when you run this, the first `Println` gets called and then the `Println` inside the anonymous function gets called.

## Passing arguments

You can pass arguments to these anonymous functions.

```go
package main

import "fmt"

func main() {
	fmt.Println("Hello from main!")
	func(version float64) {
		fmt.Printf("Hello from an anonymous function in Go language %.2f!", version)
	}(1.15)
}
```

This example declares one parameter to the function called `version` which is of `float64` data type. And, at the end of function literal definition, you can pass the value associated with the version parameter within the parenthesis.

## Assigning functions to variables

Function literals, as mentioned earlier, can be assigned to variables. It is like any other value that you assign to a variable. Here is an example.

```go
package main

import "fmt"

func main() {
	fmt.Println("Hello from main!")
	f := func(version float64) {
		fmt.Printf("Hello from an anonymous function in Go language %.2f!", version)
	}

	f(1.15)
}
```

This example is similar the previous one. The only difference is the missing the parenthesis at the end of function literal. Instead, the function gets assigned to a variable and we use the variable -- `f(1.15)` -- to invoke the function. The value 1.15 gets passed to the anonymous function. So, what do you think the type of variable `f` will be? You can check that by adding `fmt.Printf("\n%T", f)` to the above example. This will be the output.

```go
PS C:\GitHub\GetSetGo> go run .\function.go
Hello from main!
Hello from an anonymous function in Go language 1.15!
func(float64)
```

So the variable `f` is of `func()` type. This leads us into the custom and user-defined function types.

## Custom function types

Similar to defining a struct, you can define a custom function type. The general syntax for defining a custom function type is:

```go
type <func-name> func(<parameter1 parameter-1type, parameter2 parameter2-type>) <return-type> 
```

For example, `type concat func(fName, lName string)` string defines a new custom function type named `concat`. This defines the signature of the function.

```go
package main

import "fmt"

type concat func(fName, lName string) string

func main() {
	var s concat = func(fName, lName string) string {
		msg := fmt.Sprintf("%s %s rocks!", fName, lName)
		return msg
	}

	fmt.Println(s("Go", "Language"))
	fmt.Printf("%T", s)
}
```

In the `main` function, you can use the new function type to create a variable and assign the function to it. The above example declares and initializes variable `s` for this purpose. You can then use variable `s` as you have already seen earlier. When you run this example, you will see that the type of the variable `s` is `main.concat` which is the custom function type.

## Passing functions as arguments

Function literals can be passed as arguments to other functions. You have learned how to create a custom function type in the previous section. The following example demonstrates how to pass that custom function type as an argument to another function. Take a look.

```go
package main

import "fmt"

type concat func(fName, lName string) string

func wrapper(s concat) {
	fmt.Println(s("Go", "Language"))
}

func main() {
	a := func(f, l string) string {
		msg := fmt.Sprintf("%s %s rocks!", f, l)
		return msg
	}

	wrapper(a)
}
```

The function that is getting passed to the `wrapper` function need not be of a custom function type. The custom type in this example takes `string` arguments and returns `string` type. You can define any function signature as an argument and match that signature in the function literal body that you define.

## Functions as return values

In Go language, you can not only pass functions as arguments but you can also return functions from other functions. Here is a variation of the above example to demonstrate this.

```go
package main

import "fmt"

func wrapper() func(fName, lName string) string {
	a := func(f, l string) string {
		msg := fmt.Sprintf("%s %s rocks!", f, l)
		return msg
	}
	return a
}

func main() {
	concat := wrapper()
	fmt.Println(concat("Go", "Language"))
}
```

The wrapper function in this update example takes no arguments but returns a function. Within the `wrapper` function body, you simply declare and initialize a function literal and return that. In the `main` function, a variable called `concat` gets initialized to the return value of the `wrapper` function which is a function. Finally, the `concat` function literal gets invoked with the string arguments.

So, what happened to the custom type that you saw an earlier example? Can you still use that custom type as a return value? Yes, of course. Here is the updated example.

```go
package main

import "fmt"

type concat func(fName, lName string) string

func wrapper() concat {
	a := func(f, l string) string {
		msg := fmt.Sprintf("%s %s rocks!", f, l)
		return msg
	}

	return a
}

func main() {
	concat := wrapper()
	fmt.Println(concat("Go", "Language"))
}
```

This brings this part to the final concept around function literals called closures.

## Closures

Wikipedia describes closures as below.

> In programming languages, a closure, also lexical closure or function closure, is a technique for implementing lexically scoped name binding in a language with first-class functions. Operationally, a closure is a record storing a function together with an environment. The environment is a mapping associating each free variable of the function (variables that are used locally, but defined in an enclosing scope) with the value or reference to which the name was bound when the closure was created. Unlike a plain function, a closure allows the function to access those captured variables through the closure's copies of their values or references, even when the function is invoked outside their scope.

That is a lot to digest but pay attention to the last sentence. If we have to put that in simple words, a closure can access the variables defined outside its scope. Here is an example.

```go
package main

import (
	"fmt"
)

func main() {
	lang := "Go Language"
	func() {
		fmt.Println(lang, "rocks!")
	}()
}
```

In the above example, the function literal inside the `main` function can access the variable `lang` defined outside its scope. A closure in Go has access to its surrounding state and it gets bound to that. The state of the closure becomes unique when it is created.

Take a look at this example to understand this.

```go
package main

import (
	"fmt"
)

func sub() func() int {
	a := 100
	return func() int {
		a = a - 10
		return a
	}
}

func main() {

	a1 := sub()
	a2 := sub()

	fmt.Printf("\nValue from a1 %d", a1())
	fmt.Printf("\nValue from a2 %d", a2())

	fmt.Printf("\nValue from a1 again %d", a1())
	fmt.Printf("\nValue from a2 again %d", a2())
}
```

In the `sub()` function, variable a gets initialized to 100. Also, `sub()` function returns a function in which variable `a` gets decremented by 10 and the resulting value gets returned. In this main function, variables `a1` and `a2` get initialized to the closure returned from `sub()` function. Now, the interesting part comes when you invoke these closures. Here is the output.

```go
PS C:\GitHub\GetSetGo> go run .\function.go

Value from a1 90
Value from a2 90
Value from a1 again 80
Value from a2 again 80
PS C:\GitHub\GetSetGo>
```

The first calls to `a1` and `a2` return the same value. And, then when you call these closures again, they return the same value. What does this mean? This demonstrates that the closures do have a unique and isolated state when they get created. So, when you created a1 and a2, each of them have variable `a` at 100 and when these closures get invoked, value of `a` gets decremented by 10. Therefore, each set of invocation of these closures return the same value.

As you proceed learning more advanced concepts in Go language, you will start seeing real use cases of closures. Stay tuned.
