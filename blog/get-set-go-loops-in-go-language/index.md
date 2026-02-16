# Get set Go - Loops in Go language


{{<img src="/images/getsetgo/banner.png" width="660">}}

With what you learned about basic data types and structs in this series so far, you are now ready to look at the looping construct in Go language. Go language is simple and to that extent Go has just one looping construct -- `For` loop.

## For loop

A few programming languages that you may have used in the past may have more than one looping construct -- `do - while`, `do - until`, `for`, and `foreach` and so on. You use a specific construct based on what you need to achieve and type of conditions that need to be tested. However, Go language has just one looping construct -- the `for` loop. Although there is just one looping construct, go supports multiple variations of this construct for different use cases.

The general syntax of writing a for loop is

```go
for <initialization>; <condition>; <post> {

}
```

In this general syntax, the three different components are given a specific purpose. Initialization is used initialize any variables needed. This runs only once. The condition in the middle gets checked in every iteration and the loop runs until this condition evaluates to false. The post statement gets executed after the iteration executes successfully. After every successful iteration, the condition gets evaluated again and the loop body will continue to execute. All these components are totally optional. This leads into the different for loop variations.

## Infinite loop

As you learned earlier, all components within the for loop syntax are optional. So, if you remove all the components mentioned earlier, it results in an infinite loop.

```go
package main

import "fmt"

func main() {
	for {
		fmt.Println("This is an infinite loop. You need to break the execution.")
	}
}
```

The above will continue to run until you interrupt it (CTRL+C on Windows). Infinite loops always need a way to break out of the loop. Here is a better example.

```go
package main

import (
	"fmt"
	"math/rand"
)

func main() {
	for {
		num := rand.Intn(100000)
		if num % 2 == 0 {
			break
		}

		fmt.Printf("\nGenerated random number '%d' is an odd number.", num)
	}
}
```

In this example, within the loop body, the `rand.Intn` function is used to generate a non-negative random integer between 0 and n and n here is set to 100000. In the next statement, the `if` condition is used to evaluate if the generated random number is an even number and if so, the loop breaks and exits. if the generate number is an odd number, the number gets printed and the loop continues execution.

### Break

The `break` statement in a loop is used to break out of the based on a condition like what you have seen in the previous example. Once the loop exits, the program control goes to the next line in the program, if any.

The next variant of `for` loop is the that uses a `boolean` expression.

## For loop with Boolean expression

In the general syntax of a for loop that you learned in the beginning of this part, there were three components -- initializer, condition, and post statement. In the absence of these three components, you get to define an infinite loop. You can add only the condition component and still create a for loop. Here is an example.

```go
package main

import (
	"fmt"
)

func main() {
	num := 1
	for num <= 10 {
		if num%2 == 0 {
			fmt.Printf("\n '%d' is an even number", num)
		} else {
			fmt.Printf("\n '%d' is an odd number.", num)
		}
		num++
	}
}
```

In the above example, for loop is using a `boolean` expression to determine the number of iterations. In this case, the loop iterates until the variable `num` is less than or equal to 10. Within the loop body, the post increment of variable `num` ensures that its value gets incremented. Without this, you will end up with an infinite loop again.

While what you have seen so far -- infinite loop and the loop with `boolean` expression -- indirectly used all three components you saw in the general for loop syntax. So, why not put all of them together and see another example.

## For loop with an initializer, condition, and post statement

Here is an example of what you have seen in the general syntax.

```go
package main

import (
	"fmt"
)

func main() {
	for num := 1; num <= 10; num++ {
		if num%2 == 0 {
			fmt.Printf("\n '%d' is an even number", num)
		} else {
			fmt.Printf("\n '%d' is an odd number.", num)
		}
	}
}
```

As you see in the above example, using all components essentially eliminates the need for a separate initialization and post increment. But, the result is same as the earlier example with just `boolean` expression as a part of `for` loop.

## For loop over a range

The final variant of for loop is iterate over a range of values. You may have an array or slice of integers or even a map of key value pairs. If you need to iterate over those values, you can use this variant of the `for` loop in Go language. 

```go
package main

import (
	"fmt"
)

func main() {
	a := [10]int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
	for i, v := range a {
		if v%2 == 0 {
			fmt.Printf("\n '%d' at index '%d' is an even number", v, i)
		} else {
			fmt.Printf("\n '%d' at index '%d' is an odd number.", v, i)
		}
	}
}
```

In the example above, the for loop used shorthand declaration to initialize two values -- `i` and `v`. But, you may ask. Isn't that a simple array? Yes, it is. But, when you iterate over an array using range, it returns two values -- index of the element and the value at that index. Therefore, the above example uses two variables -- `i` and `v`. Since Go does not allow you to declare a variable and not use it, the print statements in the subsequent code refer to both these variables. But, what if you want to ignore the index value? Simple.

```go
package main

import (
	"fmt"
)

func main() {
	a := [10]int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
	for _, v := range a {
		if v%2 == 0 {
			fmt.Printf("\n '%d' is an even number", v)
		} else {
			fmt.Printf("\n '%d' is an odd number.", v)
		}
	}
}
```

In this example, instead using two variables, the for loop used an underscore character (_) to ignore the value of index coming from `range`. This is called a blank identifier in Go. 

You can use the above method to iterate over a slice or even string as well.

Here is an example that shows how to iterate over a map.

```go
package main

import (
	"fmt"
)

func main() {
	a := map[int]string{0: "Go", 1: "PowerShell", 2: "Python"}
	for k, v := range a {
		fmt.Printf("\n%d ==> %s", k, v)
	}
}

```

In case of a map value, instead of index, you get the key and value. In the above example, the variables `k` and `v` represent key and value coming from the map.

## Continue

In one of the previous examples, you looked at how to break out of a loop based on a condition. But, what if you just want to skip to the next iteration instead? This is where the `continue` keyword is helpful. In the following example, the loop simply continues to the next element in the array on encountering an even number.

```go
package main

import "fmt"

func main() {
	a := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
	for _, v := range a {
		if v%2 == 0 {
			continue
		}

		fmt.Printf("\n%d is an odd number.", v)
	}
}
```

When you run this code, whenever `v` is an even number, you will see that the print statement gets skipped and the execution goes to the next element in the iteration and therefore printing only odd numbers between 1 and 10. So, whenever execution reaches to the `continue` statement, the rest of the statements in the loop body get skipped and loop continues to the next iteration.

## Nested loops

Similar to nested `if` statements, you can nest `for` loops too in Go language. Here is a very example.

```go
package main

import "fmt"

func main() {
	//OuterLoop:
	for x := 0; x < 3; x++ {
		for y := 0; y < 3; y++ {
			fmt.Printf("x=%v, y=%v\n", x, y)
		}
	}
}
```

You can nest any variants of `for` loop seen in the above examples. 

This is it for this part of the series. In the next part, you will learn about labels in Go language.
