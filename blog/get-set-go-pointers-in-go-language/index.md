# Get set Go - Pointers in Go language


{{<img src="/images/getsetgo/banner.png" width="660">}}

In the previous part of this [series](https://ravichaganti.com/series/get-set-go/), you learned about slices in Go language. Slices, unlike arrays, allow flexibility and certainly are the most used compared to arrays in Go language. Towards the end of the article on slices, you learned that slices are essentially references to an underlying array and any changes made to the slice will reflect in the underlying array as well. In this article, you shall learn about another reference type called pointers in Go language.

## Pointers

Pointers in Go, like other languages, hold the memory address of a value. First, an example.

```go
package main

import "fmt"

func main() {
	a := 10
	b := &a

	fmt.Println("value of a is", a)
	fmt.Println("value of b is", b)
	fmt.Println("value at b is", *b)
}
```

The first variable declaration and initialization in the above example is already known. It is a simple integer. The line where variable b is declared is special. On the right-hand side, using & prefix tells Go that you want to store the memory location of the value represented by variable a. & is called the addressOf operator. So, variable b gets the memory address of variable a. In the last line, the asterisk (*) dereferences the value at variable b and therefore it is called the dereferencing operator.

This should be clear if you run this example.

```go
PS C:\GitHub\GetSetGo> go run .\pointers.go
value of a is 10
value of b is 0xc000012090
value at b is 10
```

The second output shows the value stored in variable b which is the memory address of variable a. And, the last line in the output shows the value at the memory address represented by variable b which is the value of variable a -- 10.

Since variable b is the address of value represented variable a, you cannot assign another integer value to b directly. Instead, you dereference and then assign a value which changes the value of variable a.

```go
package main

import "fmt"

func main() {
	a := 10
	b := &a

	fmt.Println("value of a is", a)
	fmt.Println("value of b is", b)
	fmt.Println("value at b is", *b)

	*b = 20
	fmt.Println("value of b is", b)
	fmt.Println("value of a is", a)
}
```

If you run this above example, you will see output similar to what is shown below.

```go
PS C:\GitHub\GetSetGo> go run .\pointers.go
value of a is 10
value of b is 0xc000012090
value at b is 10
value of b is 0xc000012090
value of a is 20
```

If you observe the output, the memory address stored in variable b itself does not change but the value assigned to variable gets updated to 20. This is good but are there other methods we can declare pointers in Go language?

The regular variable declaration syntax works for variables as well.

`var b *int = &a`

The above method is just an expanded form of what you learned in the first example. In this expanded form, there is explicit declaration of pointer type which is `*int` in this case or you can call it an integer pointer. You can skip the initialization part and just declare an integer pointer. In such as case the zero value of a pointer will be set to `nil` and you cannot dereference until you assign a value.

### Using new function

When you use the built-in `new` function to declare and initialize a variable, you get a pointer to its memory address. Take a look at the below example.

```go
package main

func main() {
	a := new(int)
	println(a)
	println(*a)
}
```

When you run this, the first `println` will print the memory address and when you dereference it's value, you will see a zero value.

This is just an introduction to pointers in Go language and you will learn more about the use cases of pointers when we discuss functions and other advanced concepts. Stay tuned. 
