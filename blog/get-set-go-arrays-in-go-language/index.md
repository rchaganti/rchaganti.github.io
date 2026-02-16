# Get set Go - Arrays in Go language


{{<img src="/images/getsetgo/banner.png" width="660">}}

In the earlier part of this [series](https://ravichaganti.com/series/get-set-go/), you looked at types in Go language and learned about the basic data types -- int, float, and strings. You also learned about other categories of data types such as aggregate types, reference types, and interface types. In the next subsequent parts, you will dive into each of these different types.

## Aggregate Types

Aggregate types in Go language include [arrays](https://golang.org/ref/spec#Array_types) and [structs](https://golang.org/ref/spec#Struct_types). These data types are formed by combining basic data types. Learning structs will require knowledge of a few more things about Go language and Go types. You will learn about that soon. In today's part, you will learn about arrays.

### Arrays

An array in Go language is a **fixed-length** sequence of **homogeneous** elements in the memory. There is emphasis on two words in the previous sentence -- fixed-length and homogeneous. The length of the array is decided at the time of declaration. You cannot change it runtime and therefore fixed-length. And, an array can only be used store elements of the same data type and that is the homogeneous part in the definition. The number of elements in the array is called the length of the array and it will be an integer that is either zero or more than zero.

The method to define/declare an array in Go is similar to that of a variable. 

```go
var <variable_name> [SIZE] <variable_type>
```

As you see in the above syntax, size is a part of the array declaration. So, for example, `var names [4] string` will declare an array of fixed-length 4 to store values of string data type. The size must be an integer greater than zero. You can access the array elements using the index operator and the index always starts at zero and goes up to index of last element - 1. The built-in `len` function can be used to find the length of the array. Therefore, the index of the last element can be derived using `len(arrayName) - 1`.

Take a look at this example.

```go
package main

import "fmt"

func main() {
	var names [4]string

	// elements get initialized to a zero value based on type
	fmt.Println("value at index 0 is", names[0])

	// set a value at an index
	names[0] = "Go Language"
	fmt.Println("value at index 0 is", names[0])

	// get length of the array
	var l = len(names)
	fmt.Println("Length of names array is", l)
	fmt.Println("value at last index is", names[l-1])
}
```

As shown in the above example, using the index operator gives you the value at that index and you can assign / update a value at a given array index. Using this method of assigning values can be tedious and error-prone if you have a larger array. You can initialize arrays in a way similar to how variables of basic types are initialized during declaration or using shorthand form.

```Go
var variable_name = [SIZE]<variable_type>{item1, item2, item3, ...itemN}
```

`var names = [4]string{"Go", "Python", "PowerShell", "Rust"}` will declare and initialize the names array. The number of values you specify within the curly brackets should be equal to the size of the array specified within square brackets. You can avoid specifying the size of the array too -- `var languages = [4]string{"Go", "Python", "PowerShell", "Rust"}`. The number of values specified in the initialization will be used to set the size of the array.

And, finally, within a function, you can always use the shorthand declaration. For example, `languages := [4]string{"Go", "Python", "PowerShell", "Rust"}`

Here is an example.

```go
package main

import "fmt"

func main() {
	languages := []string{"Go", "Python", "PowerShell", "Rust"}
    fmt.Println("All elements in the array are", languages)
	fmt.Println("value at index 0 is", languages[0])

	// get length of the array
	var l = len(languages)

	fmt.Println("Length of languages array is", l)
	fmt.Println("value at last index is", languages[l-1])
}
```

Whatever you have seen so far are single-dimension arrays. You can create multi-dimension arrays too in Go language. The syntax for that is not too different from what you have already tried. You just have to add multiple size values.

```go
var <variable-name> = [SIZE1][SIZE2][SIZEn]<variable-type>{{values1},{values2},{valuesn}}
```

for example, `var languages = [2][2]string{{"Go","PowerShell"},{"English", "Spanish"}}` will declare a two-dimensional array. Notice the curly brackets around the value specification in the array declaration. You can access the array elements in a multi-dimensional array by specifying multiple indices. For example, `languages[0][0]` will result in the value Go retrieved from the array. If you specify only one index, Go will present the entire set of elements at the dimension that matches the index.

Here is an example.

```go
package main

import "fmt"

func main() {
	languages := [2][2]string{{"Go", "Python"}, {"English", "PowerShell"}}
	fmt.Println("value at index 0 is", languages[0][0])

	// get length of the array
	var l = len(languages)

	fmt.Println("Length of languages array is", l)
	fmt.Println("value at last index is", languages[l-1])
}
```

In the example above, the length of the languages array is 2. It is the number of dimensions and not the total number of elements.

So far, you have learned about arrays in Go language. To summarize,

- Arrays in Go are fixed-length and can contain elements of the same data type
- Arrays in Go can either be single or multi dimensional.
- Arrays in Go can neither be resized nor a sub-array can be retrieved

The last point can be addressed using slices in Go language. And, that is the next part of this series.
