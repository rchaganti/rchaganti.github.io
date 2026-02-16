# Get set Go - Structs in Go language


{{<img src="/images/getsetgo/banner.png" width="660">}}

So far in this series, you learned about different built-in data types such as integers, strings, floats, arrays, slices, maps, and pointers. All of these allow only one type of data. All elements in the array have to of the same time. All keys and values have to be of the same type. What if you have need to combine multiple types and create a custom type for your programs? This is where structs play a role in Go language.

## Structs

A struct in Go language is a user-defined data type which is essentially a collection of different types. For example, when describing information about a computer in a data structure, you will describes the properties of a computer such as Model, serial number, amount of physical memory, number of processor cores, size of the hard drive and so on. When you have to create a such a data structure, other programming languages that implement true object oriented programming (OOP) concepts have classes. However, Go is not a true OOP language. Instead, Go offers something closer with the help structs. What an OOP language supports -- such as inheritance and polymorphism -- out of the box can be done in Go by working around a few things but it still won't be true object oriented. 

The syntax to declare struct user-defined data type is as shown below.

```go
	type <name-of-custom-type> struct {
		field1-Name field1-Type
		field2-Name field2-Type
		...
	}
```

Take a look at this example to understand how you can implement a custom data type using the above syntax.

```go
package main

import "fmt"

func main() {
	type computer struct {
		model            string
		serialNumber     string
		memoryInGB       int
		numProcCores     int
		diskCapacityInTB int
	}

	cmp1 := computer{
		model:            "SuperComputer10",
		serialNumber:     "SCOMP123",
		memoryInGB:       96,
		numProcCores:     8,
		diskCapacityInTB: 5,
	}

	fmt.Println(cmp1)
}
```

The above example, declared a struct named `computer` and added five fields to it. Then, we created a struct `cmp1` of the type `computer` by specifying each field name and an associated value separated by a colon (:). If you prefer, you can totally eliminate specifying the field names. For example, `cmp1 := {"SuperComputer10", "SCOMP123", 96, 8, 5}` is totally valid as well but does not have convey how the values are associated to field names except the order in which they are specified. 

Finally, when you print a struct, it just prints the values you specified while creating the struct. You can retrieve a specific field value buy using the reference (.) operator.

```go
package main

import "fmt"

func main() {
	type computer struct {
		model            string
		serialNumber     string
		memoryInGB       int
		numProcCores     int
		diskCapacityInTB int
	}

	cmp1 := computer{
		model:            "SuperComputer10",
		serialNumber:     "SCOMP123",
		memoryInGB:       96,
		numProcCores:     8,
		diskCapacityInTB: 5,
	}

	fmt.Println(cmp1.model)
    fmt.Println(cmp1.memoryInGB)
}
```

While it is always possible to assign values to all fields while creating the struct, it is not mandatory. You can always create zero valued struct.

```go
package main

import "fmt"

func main() {
	type computer struct {
		model            string
		serialNumber     string
		memoryInGB       int
		numProcCores     int
		diskCapacityInTB int
	}

	var cmp1 computer
	fmt.Println(cmp1)

	cmp1.model = "SuperComputer10"
	cmp1.serialNumber = "SCOMP123"
	cmp1.memoryInGB = 96
	cmp1.numProcCores = 8
	cmp1.diskCapacityInTB = 6

	fmt.Println(cmp1)
}
```

When you run the above program, the first `Println` will print the zero values of fields in the struct based on their data types. The second `Println` will print the assigned values.

### Anonymous structs

In the examples so far, we declared a user-defined data type and have given it a name. We then used it to create a struct and initialized it with field values. However, it is possible to create structs without a name defined. Here is how you do that.

```go
package main

import "fmt"

func main() {
	cmp1 := struct {
		model            string
		serialNumber     string
		memoryInGB       int
		numProcCores     int
		diskCapacityInTB int
	}{
		model:            "SuperComputer10",
		serialNumber:     "SCOMP123",
		memoryInGB:       96,
		numProcCores:     8,
		diskCapacityInTB: 5,
	}

	fmt.Println(cmp1)
}
```

What you defined above as a struct, `cmp1`, is called an anonymous struct variable. And, similar to this, you can defined anonymous struct fields also.

```go
package main

import "fmt"

func main() {
	type computer struct {
		string
		int
	}

	cmp1 := computer{
		string: "SuperComputer10",
		int:    8,
	}

	fmt.Println(cmp1)
}
```

 In this example, the user-defined type `computer` has only two fields -- `string` and `int`. Unlike our earlier example that has named fields, you have multiple fields of the same data type when using anonymous fields in a struct.

## Nested Structs

Go allows adding user-defined struct data types as a field within another struct. Take a look at this example.

```go
package main

import "fmt"

func main() {
	type os struct {
		version string
		build   int
	}

	type computer struct {
		model            string
		serialNumber     string
		memoryInGB       int
		numProcCores     int
		diskCapacityInTB int
		operatingSystem os
	}

	cmp1 := computer{
		model:            "SuperComputer10",
		serialNumber:     "SCOMP123",
		memoryInGB:       96,
		numProcCores:     8,
		diskCapacityInTB: 6,
		opeatingSystem: os{
			version: "Windows 10",
			build:   2009,
		},
	}

	fmt.Println(cmp1)
}
```

In the above example, the struct named `os` declares a user-defined data type containing version and build as the fields. In the computer type declaration, you can simply added a new field called `operatingSystem` and assigned it the type `os`.

The nested fields from the struct can be accessed by following the complete field path. For example, `cmp1.operatingSystem.version`.

## Struct Pointers

In a previous part of this series, you learned about pointers where you have only seen integer and string pointers. You can create struct pointers as well. Here is an example.

```go
package main

import "fmt"

func main() {
	type os struct {
		version string
		build   int
	}

	type computer struct {
		model            string
		serialNumber     string
		memoryInGB       int
		numProcCores     int
		diskCapacityInTB int
		operatingSystem  os
	}

	cmp1 := &computer{
		model:            "SuperComputer10",
		serialNumber:     "SCOMP123",
		memoryInGB:       96,
		numProcCores:     8,
		diskCapacityInTB: 6,
		operatingSystem: os{
			version: "Windows 10",
			build:   2009,
		},
	}

	fmt.Println(*cmp1)
	fmt.Println((*cmp1).operatingSystem.version)
}
```

The process of creating a pointer to a struct is similar to the other data types. The only difference is in how you dereference the value of a struct. You can see that in the `Println` statements towards the end of the program.

This is it for today. You will learn more about adding methods to structs and using structs in a more meaningful way than these trivial examples. Stay tuned. 
