# Get set Go - Maps in Go language


{{<img src="/images/getsetgo/banner.png" width="660">}}

In the previous part of this [series](https://ravichaganti.com/series/get-set-go/), you learned about pointers in Go language. In this part, you will learn about maps in Go language. Maps are another built-in data type in Go and maps store key-value pairs. This is like dictionaries in other programming languages. 

## Maps

First, look at the below example.

```go
package main

import "fmt"

func main() {
	var m1 map[string]int
	fmt.Println(m1)
}
```

In the above example, variable m1 is of map data type and declares an empty map. When you run this, all you will see is `map[]`. The zero value of map keys will be `nil` and therefore this will be called a nil map. Maps store key-value pairs. So, if we generalize the syntax from the above example, it will be:

`var <variable-name> map[<key-data-type>]<value-data-type>`

Keys in a map can be of any comparable type -- Boolean, integer, float, string, complex, and so on.

In the key-value pairs that you want to store, all keys have to be of the same data type and all values should also be. In the example above, all keys will have to of `string` type and all values should be of `int` type. Also, keys should be unique within a map. 

Now, since you have just created a nil map, how do you add key-value pairs or elements to this map?

### Adding Key Values

When you create a map using the example above, it creates a nil map which is equivalent to empty map but no elements can be added to it. If you indeed attempt something like `m1["Go"] = 1` you will see a panic. The following example shows how to initialize an empty map.

```go
package main

import "fmt"

func main() {
	m2 := make(map[string]int)

	m2["Go Language"] = 1
	fmt.Println(m2)
}
```

As you see in the example here, you need to use the built-in `make` function to declare and initialize the map. Once this is done, you can use the simple assignment syntax to add elements to the map.

Updating elements in a map is again same as how you added the element using assignment. So, by using `m2["Go Language"] = 10`, you will update the value associated with that key.

What if you have lot of items to add to a map? Do you need to perform assignment for each item? No, there is a better way to initialize the map like arrays and slices.

### Initialize during declaration

You can add values to a map while declaring the map. Here is the generic syntax.

`<variable-name> := map[<key-type>]<value-type>{ "key": "value", "key" : "value"}`

```go
package main

import "fmt"

func main() {
	m2 := map[string]int{
		"Go Language": 1,
		"PowerShell":  2,
		"Python":      3,
	}
	fmt.Println("length of map", len(m2))
	fmt.Println(m2)
}
```

Simple. Observe the trailing comma after the last item. This is needed since Go treats newline as end of statement. As shown in the example, you can use the built-in `len()` function to retrieve the length or number of elements in a map. 

If you want to retrieve a single element value from the map, you can do that simply by referencing the correct key name.

`m2["PowerShell"]` will return it's value 2. When you reference a non-existing key, you will simply get the zero value based on the type of the value specified during declaration. So, in this example, if you try `m2["Rust"]`, you will get 0 as the value. This is not always desired as the subsequent statements in the program might assume that 0 is a real value.

So, how do you check if a key exists in the map or not?

```go
package main

import "fmt"

func main() {
	m2 := map[string]int{
		"Go Language": 1,
		"PowerShell":  2,
		"Python":      3,
	}

	value, exists := m2["Rust"]
	fmt.Println(value, exists)
}
```

when you query for a non-existing key within a map, it will return both associated value and a Boolean value representing whether the key exists or not. Therefore, when you want to check if a key exists in a map or not, you should always use the method shown above. If you are only interested in verifying the key existence, you can ignore the value returned by using syntax as shown below.

`_, exists := m2["Rust"]`

### Delete items

You can use the built-in `delete()` function to delete items from a map.

```go
package main

import "fmt"

func main() {
	m2 := map[string]int{
		"Go Language": 1,
		"PowerShell":  2,
		"Python":      3,
	}

	fmt.Println(m2)

	delete(m2, "Python")
	fmt.Println(m2)
}
```

### Item ordering

You need to understand that maps in Go language are unordered. So, the order in which you add or initialize elements may not be the same when you retrieve or iterate over items in the map. Take a look at this example.

```go
package main

import "fmt"

func main() {
	m2 := map[string]int{
		"Go Language": 1,
		"PowerShell":  2,
		"Python":      3,
		"Rust":        4,
		"C++":         5,
	}

	fmt.Println(m2)
}
```

When you run this program, the order of items printed towards the end may not be same as the order in which they were initialized or added to the map.

Similar to slices, maps are also reference types. Take a look at this example.

```go
package main

import "fmt"

func main() {
	m2 := map[string]int{
		"Go Language": 1,
		"PowerShell":  2,
		"Python":      3,
	}

	m3 := m2

	m3["Rust"] = 4

	fmt.Println("Map m2", m2)
	fmt.Println("Map m3", m3)
}
```

When you run this program, you will see the same number of items printed for both maps. This is because maps are reference types. When you assign one map to another, all changes done to one map will be made in the other map as well.

Alright. This is all about basics of maps in Go language. You will learn more about using maps later in this series. Stay tuned. 
