# Get set Go - Slices in Go language


{{<img src="/images/getsetgo/banner.png" width="660">}}

In the previous part of this [series](https://ravichaganti.com/series/get-set-go/), you learned about arrays in Go language. As you have learned, arrays have a fixed size and therefore you cannot resize (grow or shrink) arrays. This limitation can be overcome using [slices](https://golang.org/ref/spec#Slice_types) in Go language. In this part, you will learn about slices and how to use this data type in your Go programs.

## Slices

A slice in Go language is a slice of an underlying array! Yes, no pun intended. 😊

Here is how the Go language specification describes slices. *A slice is a descriptor for a contiguous segment of an underlying array and provides access to a numbered sequence of elements from that array.*

There are different ways to declaring and initializing slices in Go language.  

### Slice literal

The syntax for declaring a variable as a slice is `var s1 = []int{1,2}`. This declare a slice of integers and initializes with two elements. This is similar to how you declared array variables. The only difference is that there is no size specification. You can avoid any values in the declaration to create an empty slice of integers. For example,  `var s2 = []int{}`. However, you cannot add elements (to an empty slice or at an index that is out of bound) using the indexer syntax. For example, specifying `s2[0]= 100` will result in an error. The indexer method works only when updating an existing element at a specific index in the slice. To add elements to an empty slice, you need use the built-in `append()` method.

Here is a quick example that shows both these methods.

```go
package main

import "fmt"

func main() {
	var s1 = []int{1, 2}
	s1[0] = 10
	fmt.Println(s1)

	var s2 = []int{}
	s2 = append(s2, 100)
	s2 = append(s2, 200)
	fmt.Println(s2)
}
```

With slices, unlike arrays, you can append elements. This essentially changes the size of the slice. You can use the `len()` built-in function to find the current number of elements and the `cap()` function to find the maximum capacity of the slice. Review the below example to understand the difference between length and capacity in-depth.

```go
package main

import "fmt"

func main() {
	var s1 = []int{1, 2}
	fmt.Println("Initial len and cap", len(s1), cap(s1))

	s1 = append(s1, 3)
	fmt.Println("len and cap after adding 3rd element", len(s1), cap(s1))

	s1 = append(s1, 4)
	fmt.Println("len and cap after adding 4th element", len(s1), cap(s1))

	s1 = append(s1, 5)
	fmt.Println("len and cap after adding 5th element", len(s1), cap(s1))
}
```

When you run this, you will see the following output. 

```shell
PS C:\GitHub\GetSetGo> go run .\slices.go
Initial len and cap 2 2
len and cap after adding 3rd element 3 4
len and cap after adding 4th element 4 4
len and cap after adding 5th element 5 8
```

If you observe the above output, the initial length and capacity of the slice is what you initialized it to -- with two elements. After adding a third element, the capacity changed to 4 and stayed as 4 even after the adding the 4th element. However, the moment the 5th element gets added, the capacity of the slice jumps to 8. So, what is happening here? 

With the `append` function, whenever you add an element, if the length exceeds the current capacity of the slice, Go simply doubles the capacity. So, when we added the 3rd element, the capacity doubled to 4 and then we added the 5th element, it doubled to 8. 

### Using Make

Slices can also be declared and initialized using the `make` built-in function. The syntax for using make to create a slice is as follows.

```go
var name = make(slice-type, slice-length, slice-capacity)
```

Here is an example that uses `make` function.

```go
package main

import "fmt"

func main() {
	var s3 = make([]int, 2, 4)
	s3[0] = 10
	s3[1] = 20
	s3 = append(s3, 20)

	fmt.Println(s3, len(s3), cap(s3))
}
```

In this example, the last integer value that is used to specify the capacity of the slice is optional. By default, the capacity will be same as length. The code in the above example creates a slice with length of 2 and capacity of 4. And, observe how the 3rd element is added. You have to use the append function since adding the 3rd element exceeds the length specified when using `make` function. This behavior is different from what you seen above with append method on a slice created using slice literal syntax.

### Slicing arrays

Yet another method of creating a slice is to slice an existing array! Take a look at this example.

```go
package main

import "fmt"

func main() {
	var languages = [6]string{"Go", "Python", "Rust", "Java", "C#", "PowerShell"}
	fmt.Println("Elements in the string array are", languages)

	var langSlice = languages[0:2]
	fmt.Println("\nElements in the derived slice are", langSlice)

	fmt.Println("\nSlicing without a start index is similar to using start index 0", languages[:3])
	fmt.Println("\nSlicing without an end index gets all elements from start_index till end of the array", languages[4:])
}
```

In the above example, the `languages` array has six elements. A slice of these elements -- from index 0 to 2 -- is assigned to the variable `langSlice`. This variable is of slice data type. In the variable assignment, you have specified the the slice as start_index:end_index in square brackets. In this specification, 

- The end_index in excluded. So, when the indexes specified are 0 and 2, the resulting slice will have elements from index 0 and 1 but not 2.
- Both start_index and end_index are optional. So, for example, if you specify [:3], the first three elements from the array. If you specify [4:], elements from index 4 till the end of the array get assigned to the slice. Finally, skipping both -- [:] -- will simply return all elements from the array.

You learned in an earlier part of this series that slices are reference types. This means that when you update an element in the slice the element in the underlying array gets updated as well. 

Take a look at this example.

```go
package main

import "fmt"

func main() {
	var languages = [6]string{"Go", "Python", "Rust", "Java", "C#", "PowerShell"}
	fmt.Println("Elements in the string array are", languages)

	var langSlice = languages[0:2]
	fmt.Println("\nElements in the derived slice are", langSlice)

	langSlice[1] = "C++"
	fmt.Println("\nElements in the updated slice are", langSlice)

	fmt.Println("\nElements in the underlying array are", languages)
}
```

If you run this above example, you will see output similar to what is shown here.

```go
PS C:\GitHub\GetSetGo> go run .\slices.go
Elements in the string array are [Go Python Rust Java C# PowerShell]

Elements in the derived slice are [Go Python]

Elements in the updated slice are [Go C++]

Elements in the underlying array are [Go C++ Rust Java C# PowerShell]
```

As you see here, once you update an element in the derived slice, the underlying array also gets updated. This brings us to the discussion around pointers in Go language which is the subject of next part in this series.

Stay tuned.
