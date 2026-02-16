# Get set Go - Functions in Go language


{{<img src="/images/getsetgo/banner.png" width="660">}}

Alright. In this [series](https://ravichaganti.com/series/get-set-go/) so far, you learned about some basics of programming in Go language, about data types, conditions, and loops. In all the examples in the earlier parts of the series, there was just the `main` function which is the entry point into a Go program. All execution of a Go program starts at the `main` function. The idea of a function in any language is to basically group together a set of instructions and these instructions can now be used repeatedly as needed. As you learned, the `main` function is a bit special though. Functions promote reusability and readability of your code. In this part of the series, you shall learn about functions in Go language.

## Functions

A function in go, like any other language, is a block of code that takes input, performs a specific task, and generates some output. The general syntax for declaring functions in Go language is shown below.

```go
func func-name(param1-name param1-type, param2-name param2-type) func-return-type {  
 	//statements that perform a specific task
}
```

 The `func` keyword, you have already seen this with the main function, is used to declare the function type in Go followed by a name given to the function. Within the parenthesis, you specify any parameters that are needed for the function to perform its task followed by function return type(s). Both parameters and return type are optional. Like the main function, the function body needs to be enclosed in a pair of curly brackets with the open bracket on the same line as the `func` declaration. The parameters in the function declaration are always in the format of parameter name followed by its type. You can have any number of parameters. Similarly, you can specify a comma separated list of return types as well. However, if you have more than one return type, you must enclose them in ().

Take a look at this example.

```go
package main

import "fmt"

func main() {
	a, b := 10, 20
	c := add(a, b)

	fmt.Println("Sum of a and b is", c)
}

func add(x int, y int) int {
    sum := x + y
    return sum
}
```

Well, this is a super trivial elementary type example but you get the point. In the `main` function, there are two variables `a` and `b`. These variables are declared and initialized with some integer values. Now, another variable named `c` is declared and initialized to the return value from the function `add`. This is yet another way to initialize variables in Go language. Observe how the function is called. We just use the name of the function with all parameter values enclosed in () -- like `add(a, b)`.

The `add` function is declared with two input parameters -- `x` and `y` -- of integer type. Since the variable `c` in function `main` gets its value from the `add` function, this function has an integer return type. Within the function body, the `sum` variable is declared and initialized to store the value of `x+y`. And, finally, the `return sum` statement 

Since both parameters of this function are of integer types, we can simplify the function declaration as follows.

```go
func add(x, y int) int {
	//code
}
```

## Named return values

Go functions support named return values. First, see the below example.

```go
package main

import "fmt"

func main() {
	a, b := 10, 20
	c := add(a, b)

	fmt.Println("Sum of a and b is", c)
}

func add(x int, y int) (sum int) {
	sum = x + y
	return
}
```

In this example which is more or less same as the first one, all that is modified is the `add` function. For the function return value, there is both name and type enclosed in parenthesis. And, within the function body, you don't have to declare the variable `sum` anymore since it is already declared as a part of the return value declaration. And, finally, observe the `return` statement. You don't have specify the name of the variable that you want to return. Instead, simply use the return statement. This tells Go to return values of variables declared as a part of the function declaration. So, what happens if you don't have a variable named sum in the function body? Does Go through an error? Not really. It simply returns a zero value for the type mentioned in the function return value declaration. 

See this example and the program output to understand this.

```go
package main

import "fmt"

func main() {
	a, b := 10, 20
	c := add(a, b)

	fmt.Println("Sum of a and b is", c)
}

func add(x int, y int) (sum int) {
	sum1 := x + y
	fmt.Println(sum1)
	return
}
```

In this modified example, `sum` is declared as the return value from function `add`. However, there is no value assigned to sum within the function body. So, the `return` statement returns the zero value of integer variable `sum`.

And, here is the output.

```go
PS C:\GitHub\GetSetGo> go run .\function.go   
30
Sum of a and b is 0        
PS C:\GitHub\GetSetGo> 
```

As you see in the program output, there is no error and the return value from the `add` function is 0 which gets assigned to variable `c` in the main function.

## Multiple return values

In Go, a function can return multiple values. The way you can declare such as function is shown here.

```go
package main

import "fmt"

func main() {
	a, b := 10, 20
	c, d := math(a, b)

	fmt.Println("Sum of a and b is", c)
	fmt.Println("Difference if a and b is", d)
}

func math(x int, y int) (sum, diff int) {
	sum = x + y
	diff = x - y
	return
}
```

In this example, the `add` function is renamed to `math` and one more return value called `diff` has been added. With this, you have two integer return values on the function. Similar the function parameters, you can specify the type of return values just once if you have more than one value of the same type. Once again, this example uses named return values to so there is no need to specify the variable names along with the return statement. 

In the `main` function, variables `c` and `d` get their values from the `math` function. Since sum is declared first in the return values of the function, variable `c` gets the value of `sum` and variable `d` gets the value of `diff` assigned respectively. If you are interested only in one value returning from the function, you can use the blank identifier (`_`) you learned in an earlier part of this series.

## Variadic functions

In the example above, function `add` takes exactly two values and adds them up and returns the result to `main` function. Is there a way you can pass it an arbitrary number of values to get the sum of those values? This is where variadic functions play a role. 

First, take a look at this example.

```go
package main

import "fmt"

func main() {
	c := add(10, 20, 30, 40, 50)

	fmt.Println("Sum of a and b is", c)
}

func add(values ...int) int {
	sum := 0
	for _, i := range values {
		sum = sum + i
	}

	return sum
}
```

In this example, the add function's parameter definition is different from what you have seen so far. In the parameter definition -- `values ...int` -- `values` is the name of the parameter and `int` is the data type of that parameter. The three dots `...` (Ellipsis) indicate that the parameter `values` must be rolled into a slice type. Observe that there is no space between the Ellipsis and the data type of the parameter. Essentially, you prefix Ellipsis to the data type of the parameter.

Within the add function, once the parameters values are received and rolled into a slice, the rest of the logic using the `for` loop is similar to what you have learned in an earlier part of the series. When you use Ellipsis in a function parameter definition, the function becomes a variadic function. With this change, it does not matter how many values of the same data type you specify.

Now, what if you have to pass some more values (as parameters) to this variadic function? This can be done but the Ellipsis can be used only with the final parameter of the function.

Take a look at this example.

```go
package main

import "fmt"

func main() {
	num := []int{10, 20, 30, 40, 50}
	c := add(0, num...)

	fmt.Println("Sum of a and b is", c)
}

func add(x int, values ...int) int {
	sum := 0
	for _, i := range values {
		sum = sum + i + x
	}

	return sum
}
```

In this example,the add function is updated to add one more integer parameter called `x`. As you can see in the function parameter definition, the add function has two parameters -- `x` and `values`. Within `main` function, you now have a slice called `num`. And, the way `add` function invoked is also a bit different. Instead of passing the slice directly, Ellipsis is postfixed to the variable name -- `num...` -- to unroll the slice values into a bunch of integers. These values get rolled into a slice again within the add function.

There are several use cases for variadic function. First and foremost, when you do not know in advance how many values you may have to pass to a function. Secondly, using variadic functions, you can avoid creating a temporary slice to just pass a bunch of values to a function.

## Passing by value vs passing by reference

Like many other programming languages, Go language too supports pointers which form the basis of passing values to a function by reference. First, take a look at this example.

```go
package main

import "fmt"

type person struct {
	firstName string
	lastName  string
	age       int
}

func main() {
	p1 := person{
		firstName: "Ravikanth",
		lastName:  "Chaganti",
		age:       39,
	}
	//print p1
	fmt.Println(p1)
	//increment age
	incrementAge(p1)
	//print p1 again
	fmt.Println(p1)
}

func incrementAge(p1 person) {
	p1.age++
	fmt.Println(p1)
}
```

In this example, the struct `person` is a custom type which has three elements -- `firstName`, `lastName`, and `age`. Age is an integer can be incremented using the `increment()` function. In the main function, `p1` is declared and initialized. 

Here is how the output will be when you run this program.

```go
PS C:\GitHub\GetSetGo> go run .\function.go
{Ravikanth Chaganti 39}
{Ravikanth Chaganti 40}
{Ravikanth Chaganti 39}
PS C:\GitHub\GetSetGo>
```

As you see here, the changes done to the age element within `p1` are not visible within the `main` function. The reason is, by default, when you pass a value to a function in Go, a copy of that variable gets created within the function scope. So, essentially, the `increment()` function gets copy of the `p1` struct and then it modifies the age element within that copy which is certainly not visible to the `main` function. So, how do we pass values by reference so that the calling function sees the changes in values? We need to use pointers. Here is an updated example.

```go
package main

import "fmt"

type person struct {
	firstName string
	lastName  string
	age       int
}

func main() {
	p1 := &person{
		firstName: "Ravikanth",
		lastName:  "Chaganti",
		age:       39,
	}

	fmt.Println(*p1)

	incrementAge(p1)

	fmt.Println(*p1)
}

func incrementAge(p1 *person) {
	p1.age++
}
```

In this updated example, `p1` is a reference to the `person` struct and by passing this pointer to the `incrementAge()` function, the value of `age` element gets incremented and becomes available to the main function. Observe how the `incrementAge()` function parameter definition is updated to receive the pointer to `person` struct. And, within the function, you simply reference the `age` element and increment it.

Wow! This has been a long post. This is a good overview of function basics in Go. In the next part, you will learn about anonymous functions in Go language. Stay tuned.
