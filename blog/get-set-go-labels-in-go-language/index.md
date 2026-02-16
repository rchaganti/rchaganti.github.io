# Get set Go - Labels in Go language


{{<img src="/images/getsetgo/banner.png" width="660">}}

In the two previous parts of the series, you learned how to use if, switch, and for loop in Go language. You also learned about using break and continue statements in Go language to alter the control flow. What you have seen in the examples with these statements was an unlabeled way to break or continue the iteration. Go language supports labels that let you transfer control to the place in the (same function) code where the label is defined. There are different ways to use labeled statements.

## Goto

Similar to `break` and `continue`, the `[goto](https://golang.org/ref/spec#Goto_statements)` statement in Go language transfers the control to the place in the code where a specific label is defined within the same function. Here is an example.

```go
package main

import "fmt"

func main() {
	num := 1

jumpTo:
	for num <= 10 {
		if num%2 == 0 {
			num++
			goto jumpTo
		}
		fmt.Printf("\n num has value set to %d", num)
		num++
	}

	fmt.Printf("\nFinal value of num is %d", num)
}
```

The above example's purpose is to print all odd numbers between 1 and 10. In this, the `goto` statement is used to jump to the start of the loop again. Note the way the label -- `jumpTo` -- is defined. The general syntax for defining a label in a Go program is `identifier:` and then with the `goto` statement, you just use the identifier -- `goto jumpTo`. 

Here is the output from this program.

```go
PS C:\GitHub\GetSetGo> go run .\for.go

 num has value set to 1
 num has value set to 3 
 num has value set to 5 
 num has value set to 7 
 num has value set to 9 
Final value of num is 11
```

The scope of a label is the function where it is defined. With the `goto` statement, it does not matter where the label is defined within the function. For example, the following program works as well. Of course, without printing all the odd number values.

```go
package main

import "fmt"

func main() {
	num := 1

	for num <= 10 {
		if num%2 == 0 {
			num++
			goto jumpTo
		}
		fmt.Printf("\n num has value set to %d", num)
		num++
	}

jumpTo:
	fmt.Printf("\nFinal value of num is %d", num)
}
```

This produces output as shown below.

```go
PS C:\GitHub\GetSetGo> go run .\for.go

 num has value set to 1
Final value of num is 3
```

Function scope of a label also means that you cannot have the same label identifier declared multiple times even within different code blocks within the same function. Also, using `goto` has a couple of caveats. 

- Since `goto` can be used to jump forward in the program flow, you cannot jump over a variable declaration.
- You cannot jump into a new code block.

## Continue and Break with labels

If you look at the `continue` and `break` statement syntax from the [Go language specification](https://golang.org/ref/spec#Continue_statements), you will notice that these statements have an optional label.

```go
BreakStmt = "break" [ Label ] .
ContinueStmt = "continue" [ Label ] .
```

`Break` statement works only within a `for` loop, `switch` or `select` statement while `continue` works only in a loop. You have already seen examples of `break` and `continue` within a `for` loop. Similar to the `goto` statement, you just need to suffix the label identifier to `continue` and `break` statements.

Continue statement without a label, it skips the current iteration of the innermost loop. First, take a look at this example.

```Go
package main

import "fmt"

func main() {
	s1 := []int{1, 2, 5, 6, 9, 10}
	for i := 0; i < 3; i++ {
		fmt.Printf("\n\ni is %d", i)

		for _, j := range s1 {
			if j%2 == 0 {
				continue
			}
			fmt.Printf("\nj is %d", j)

		}
	}
}
```

 This is straightforward. Within the inner loop, if you encounter an even number, you simply go to the next iteration using `continue`. Here is the output from this program.

```go
PS C:\GitHub\GetSetGo> go run .\for.go

i is 0
j is 1
j is 5
j is 9

i is 1
j is 1
j is 5
j is 9

i is 2
j is 1
j is 5
j is 9
```

Now, imagine based on the condition being checked in the inner loop, you may want to simply start again from the outer loop. You can achieve this with a simple change of adding the label to the continue statement. 

```go
package main

import "fmt"

func main() {
	s1 := []int{1, 2, 5, 6, 9, 10}

jumpTo:
	for i := 0; i < 3; i++ {
		fmt.Printf("\n\ni is %d", i)

		for _, j := range s1 {
			if j%2 == 0 {
				continue jumpTo
			}
			fmt.Printf("\nj is %d", j)

		}
	}
}
```

The only change here is that a label -- called `jumpTo` -- is added right before the outer `for` loop. And, the same identifier is added to `continue` statement inside the innermost loop. You can clearly see the difference in the control flow when you run this program. Here is what you will see.

```go
PS C:\GitHub\GetSetGo> go run .\for.go


i is 0
j is 1
      
i is 1
j is 1
      
i is 2
j is 1
```

Since the innermost loop reinitializes every time it is reached during execution, you will never go beyond the second element in the slice. The labeled `continue` becomes very useful in case of nested loops where exiting the current scope based on a condition is needed.

Similarly, labels can be used with `break` statement as well. For this, just replace `continue` with `break` in the above example.

```go
package main

import "fmt"

func main() {
	s1 := []int{1, 2, 5, 6, 9, 10}

jumpTo:
	for i := 0; i < 3; i++ {
		fmt.Printf("\n\ni is %d", i)

		for _, j := range s1 {
			if j%2 == 0 {
				break jumpTo
			}
			fmt.Printf("\nj is %d", j)

		}
	}
}
```

The following snippet shows the output both with and without the label to illustrate the difference.

```go
PS C:\GitHub\GetSetGo> go run .\for.go

//without break label
i is 0
j is 1

i is 1
j is 1

i is 2
j is 1
PS C:\GitHub\GetSetGo> go run .\for.go

//with break label
i is 0
j is 1
```

This is it about using labeled statements in Go. When you write some "real" Go code other than these trivial examples, you will understand the advantages of these labeled statements in control flow. In this next part, you will learn about functions in Go.
