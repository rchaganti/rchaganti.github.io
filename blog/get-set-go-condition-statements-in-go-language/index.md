# Get set Go - Condition statements in Go language


{{<img src="/images/getsetgo/banner.png" width="660">}}

With what you learned about basic data types and structs in this [series so far](https://ravichaganti.com/series/get-set-go/), you are now ready to look at the branching constructs in Go language. You may have used branching constructs such as `if..else if..else` and `switch` statements in other languages. Go language too offers these constructs. 

## If .. else if .. else

If construct in any programming language is a branching construct and moves the execution from one place in the code to another based on a condition. Go language is no exception.

The general syntax of if statement in Go language is as below.

```go
if condition {
	// code	
} else if condition {
    // code
} else {
    // code
}
```

For the code in the `if` and `else if` blocks to execute, the condition must evaluate to `true`. If none of the conditions in the `if` and `else if` do not evaluate to true, the code in `else` gets executed. The `else if` and `else` blocks are optional. As with other types of command blocks in Go, all opening brackets must be on the same line as `if`, `else if`, and `else` statements.

Take a look at this example.

```go
package main

import "fmt"

func main() {
	a := 10
	if a > 10 {
		fmt.Println("Varible a is greater than 10")
	} else if a < 10 {
		fmt.Println("Varible a is less than 10")
	} else {
		fmt.Println("Varible a is equal to 10")
	}
}
```

When you run this program, the `Println` statement in the `else` block will execute since the variable `a` is initialized to a value 10. The first and second conditions will evaluate to `false` and therefore the control goes into the `else` block. 

## Assignment in a comparison

As a part of the if construct you can perform variable declaration and initialization as well.

```go
package main

import "fmt"

func main() {
	if a := 10; a%2 == 0 {
		fmt.Println("10 is an even number")
	}
}
```

What you have seen in the above example, `>`, `<`, and `==`, are just two of the available comparison operators in Go language.

## Comparison Operators

There are different comparison operators you can in use in Go language. These operators compare two operands and return a boolean value -- `true` or `false`. While using any comparison operator, both operands must be of the same type. For example, you can compare an integer to a float without explicitly casting one of the operand.

| Operator | Description              | Type     |
| -------- | ------------------------ | -------- |
| ==       | Equal to                 | Equality |
| !=       | Not equal to             | Equality |
| <        | Less than                | Ordering |
| >        | Greater than             | Ordering |
| <=       | Less than or equal to    | Ordering |
| >=       | Greater than or equal to | Ordering |

The equality operators from the above table apply to types that are comparable. Booleans, integers, strings, arrays, structs, complex numbers, and floating point values are all comparable in addition to a few more types such as channels and interfaces that you will learn in the future. Slices and maps are not comparable types.

The second type of operators, ordering operators, can be used only with types that can be ordered. Ordering operators cannot be used with structs, pointers, arrays, complex numbers, booleans, interfaces, and channels. So, that essentially leaves you with integers, strings, and floating point values.

Go language allows chaining different comparisons using logical operators. 

## Logical Operators

With the logical operators the operands are always boolean values and return a boolean result.

| Operator  | Syntax         | Description                                               |
| --------- | -------------- | --------------------------------------------------------- |
| && (AND)  | if a && b {}   | Evaluates to true only if both `a` and `b` are true.      |
| \|\| (OR) | if a \|\| b {} | Evaluates to true if any of operands `a` or `b` are true. |
| ! (NOT)   | if !a          | Evaluates to true if a is false.                          |

Take a look at this example that uses the logical operators along with `if` statement.

```go
package main

import "fmt"

func main() {
	a := 10
	if a > 1 && a < 10 {
		fmt.Println("Varible a has a value between 2 and 9")
	} else if a >= 10 && a <= 20 {
		fmt.Println("Varible a has a value greater than or equal to 10 and less than or equal to 20")
	}
}
```

When you have multiple conditions to evaluate and take an action, the typical if construct may become too long. This is where many programming languages, including Go, provide the `switch` construct.

## Switch

A `switch` statement evaluates an expression and compares the result against a few possible matches defined within the `switch` block. 

The general syntax for writing a switch construct is as follows.

```go
switch <expression> {
	case <expr1>: 
        //code
    case <expr2>:
        //code
    default:
        //code
}
```

As you see in the above syntax, the `switch` statement is followed by an expression. This can be a simple variable or an expression that evaluates to a value that can be looked up in the possible matches in a `switch` block. You can have any number of cases to match. These cases must all be unique. The `default` block gets executed when no other cases match. Default is optional.

Here is a full example.

```go
package main

import "fmt"

func main() {
	a := 10
	switch a {
		case 20:
			fmt.Println("Value of a is 20")
		case 30:
			fmt.Println("Value of a is 30")
		case 10:
			fmt.Println("Value of a is 10")
		default:
			fmt.Println("Value of a did not match any cases above")
	}
}
```

When you run this program, the third case gets evaluated and "Value of a is 10" gets printed. The case statement can have multiple expressions as well. For example,

```go
package main

import "fmt"

func main() {
	string1 := "o"
	switch string1 {
	case "a", "e", "i", "o", "u":
		fmt.Println("Supplied string is an vowel")
	default:
		fmt.Println("Supplied string is not an vowel")
	}
}
```

Unlike other languages, Go does not allow an automatic fall through. If you need a fall through execution of all subsequent case blocks, you need to explicitly specify that using the `fallthrough` keyword.

```go
package main

import "fmt"

func main() {
	switch a := 56; {
	case a < 50:
		fmt.Println("a is less than 50")
		fallthrough
	case a < 100:
		fmt.Println("a is less than 100")
		fallthrough
	case a < 150:
		fmt.Println("a is less than 150")
		fallthrough
	case a < 200:
		fmt.Println("a is less than 200")
	}
}
```

In this program, variable `a` is getting declared and initialized as a part of the `switch` statement expression. In the `case` statements, there are checks to see if the value if less than 50, 100, 150, and 200. If the value of variable `a` is less than 50, all other cases will evaluate to `true`. In such a scenario, all other case statements will have to be executed as well. This is where `fallthrough` keyword plays a role. 

When you execute the above program, you will see the following output.

```go
PS C:\GitHub\GetSetGo> go run .\switch.go
a is less than 100
a is less than 150
a is less than 200
```

 Now, you may ask about how the one of the examples that demonstrated the `if` statement can be translated to use `switch` construct. One way is what you already seen in the above example. An alternate way is to use expressionless `switch` construct. Here is how it is done.

```go
package main

import "fmt"

func main() {
	a := 21
	switch {
	case a > 1 && a < 10:
		fmt.Println("Varible a has a value between 2 and 9")
	case a >= 10 && a <= 20:
		fmt.Println("Varible a has a value greater than or equal to 10 and less than or equal to 20")
	default:
		fmt.Println("Variable a is greater than 20")
	}
}
```

In the above example, there is no expression associated with the `switch` statement. Instead, we have expressions matching at the `case` statement.

This brings this part to an end. In the next part of this series, you will learn about loops in Go language.
