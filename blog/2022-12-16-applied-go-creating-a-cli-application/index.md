# Applied Go - Creating a CLI application


> Practice makes permanent - Bobby Robson.

When learning a new programming language or any technology for that matter, we need to practice what we learn, and that is when it becomes permanent. I am starting a new series of posts to share what I have tried or built, so that what I have learned— through Go programming books, video courses, and community content—stays with me permanently.

The first one in this series is about using [Cobra](https://github.com/spf13/cobra) package to build a CLI application.

#### What you will learn today?

- Using the Cobra package to add command line parameters
- The typical program structure when using Cobra package to create a CLI application
- Converting command line arguments to the relevant data type using [strconv](https://pkg.go.dev/strconv) package.

#### What is Cobra?

Cobra is the most popular and most powerful library for creating modern CLI applications. `kubectl`, `docker`, `hugo`, `gh`, and several other popular command line tools use Cobra library. Cobra lets us create CLI tools with nested subcommands, global, local and cascading flags among many other powerful features. Talk is cheap, so let us get started with a tiny command line calculator project to understand how to use the Cobra package. This may not be a useful utility but helps in understanding the basics of implementing a CLI application. We can build on this later by looking at more advanced use cases.

#### Creating a project

To start with, let us create the folder structure we need to build this project.

```shell
$ mkdir gcalc && cd gcalc

$ go mod init github.com/rchaganti/gcalc

$ touch main.go
$ mkdir -p cmd/gcalc
$ mkdir -p pkg/gcalc

$ go get -u github.com/spf13/cobra@latest
```

The main project folder is `gcalc`. We, then, run `go mod init` to initialize a module within this project folder. I have used a fully-qualified path to the GitHub repo but that is not necessary. The repo need not even exist if we don't intend to share this external world. Finally, to complete the folder structure, we created two folders -- `cmd/gcalc` for storing all command/subcommand logic and `pkg/gcalc` for storing the actual arithmetic functions that we will soon implement. The `go get command` at the end pulls Cobra package and stores it locally.

When using Cobra, all commands get structure as a tree with one root. So, the first thing we need to do is create the root command.

```shell
$ touch cmd/gcalc/root.go
```

Within root.go, we will add the root of the command structure that we need to implement. You can copy/paste the following code.

```go
package gcalc

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "gcalc",
	Short: "gcalc - a commandline calculator for basic arithmetic",
	Long: `gcalc is a simple yet powerful command line calculator

	You can use gcalc for quick calculations at the command line.`,
	Run: func(cmd *cobra.Command, args []string) {},
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Ooops. There was an error while executing your CLI '%s'", err)
		os.Exit(1)
	}
}
```

In Cobra, every command that we need to add is represented using `cobra.Command` [struct](https://github.com/spf13/cobra/blob/f25a3c6e0b4220c616a3b342b57b055c1256d318/command.go#L48). This struct has many fields, but, for now, let us limit it to minimum needed to implement our calculator.

> **Tip:** Always look at the package / library source code to understand the package better. This is not just better than documentation but also a good way to learn new techniques.

Within `root.go`, we start by declaring and initializing `rootCmd` variable. The `Use`, `Short`, and `Long` fields are related to the command help. The `Run` field is what identifies what happens when you invoke this command. Since this the root of the command tree, the `Execute()` function gets invoked in the main function. Let us see how the main.go looks like.

```go
package main

import "github.com/rchaganti/gcalc/cmd/gcalc"

func main() {
	gcalc.Execute()
}
```

At this point in time, our CLI is ready for a trial.

```shell
$ go run main.go --help
gcalc is a simple yet powerful command line calculator

        You can use gcalc for quick calculations at the command line.

Usage:
  gcalc [flags]

Flags:
  -h, --help   help for gcalc
```

Now that we have the CLI root command working well, we can start adding the commands for basic arithmetic. But, before that, let us add the functions that actually perform the arithmetic. We will do this in the `pkg/gcalc/gcalc.go`.

```shell
$ touch pkg/gcalc/gcalc.go
```

```go
package gcalc

import (
	"fmt"
	"strconv"
)

func Add(args []string) (sum int) {
	for _, i := range args {
		realInt, err := strconv.Atoi(i)
		if err != nil {
			fmt.Println(err)
		}
		sum += realInt
	}
	return sum
}

func Subtract(args []string) (diff int) {
	num1, err := strconv.Atoi(args[0])
	if err != nil {
		fmt.Println(err)
	}

	num2, err := strconv.Atoi(args[1])
	if err != nil {
		fmt.Println(err)
	}

	return num1 - num2
}

func Multiply(args []string) (product int) {
	product = 1
	for _, i := range args {
		realInt, err := strconv.Atoi(i)

		if err != nil {
			fmt.Println(err)
		}
		product *= realInt
	}

	return product
}

func Divide(args []string) (dividend int) {
	num1, err := strconv.Atoi(args[0])
	if err != nil {
		fmt.Println(err)
	}

	num2, err := strconv.Atoi(args[1])
	if err != nil {
		fmt.Println(err)
	}

	return num1 / num2
}
```

In this package, we define four functions -- `Add`, `Subtract`, `Multiply`, and `Divide`. This is our business logic. Each function takes a slice of strings as input and return an integer value based on the arithmetic the function implements. Each function takes a slice of strings since that is what we get from the command line. Therefore, we need to convert the values to integer and we do that using the `strconv.Atoi()` function. The `Add` and `Multiply` functions can operate on any number of arguments but the `Subtract` and `Divide` functions operate on two arguments only.

Our package with business logic is ready. But, to consume these functions, we need the commands within our command tree. We can add additional commands by using multiple .go files under `cmd/gcalc` folder.

```shell
$ touch cmd/gcalc/add.go
$ touch cmd/gcalc/subtract.go
$ touch cmd/gcalc/multiply.go
$ touch cmd/gcalc/divide.go
```

While you can have all command registrations in a single file, I believe this a better and clean approach I have seen many CLIs implement.

Let us populate each of these files in the same order.

```go
package gcalc

import (
	"fmt"

	"github.com/rchaganti/gcalc/pkg/gcalc"
	"github.com/spf13/cobra"
)

var addCmd = &cobra.Command{
	Use:     "add",
	Aliases: []string{"a"},
	Short:   "Adds a bunch of integers",
	Run: func(cmd *cobra.Command, args []string) {
		res := gcalc.Add(args)
		fmt.Println(res)
	},
}

func init() {
	rootCmd.AddCommand(addCmd)
}
```

```go
package gcalc

import (
	"fmt"

	"github.com/rchaganti/gcalc/pkg/gcalc"
	"github.com/spf13/cobra"
)

var subtractCmd = &cobra.Command{
	Use:     "subtract",
	Aliases: []string{"s"},
	Short:   "Subtracts two integers",
	Args:    cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		res := gcalc.Subtract(args)
		fmt.Println(res)
	},
}

func init() {
	rootCmd.AddCommand(subtractCmd)
}
```

```go
package gcalc

import (
	"fmt"

	"github.com/rchaganti/gcalc/pkg/gcalc"
	"github.com/spf13/cobra"
)

var multiplyCmd = &cobra.Command{
	Use:     "multiply",
	Aliases: []string{"m"},
	Short:   "Multiplies a bunch of integers",
	Run: func(cmd *cobra.Command, args []string) {
		res := gcalc.Multiply(args)
		fmt.Println(res)
	},
}

func init() {
	rootCmd.AddCommand(multiplyCmd)
}
```

```go
package gcalc

import (
	"fmt"

	"github.com/rchaganti/gcalc/pkg/gcalc"
	"github.com/spf13/cobra"
)

var divideCmd = &cobra.Command{
	Use:     "divide",
	Aliases: []string{"d"},
	Short:   "Divides two integers",
	Args:    cobra.ExactArgs(2),
	Run: func(cmd *cobra.Command, args []string) {
		res := gcalc.Divide(args)
		fmt.Println(res)
	},
}

func init() {
	rootCmd.AddCommand(divideCmd)
}
```

The content of all these files is more or less same but there are a couple of things we should note.

Using `cobra.ExactArgs()` method, we can restrict how many command line arguments a user can pass to the command. This is useful within both `subtract` and `divide` commands. The second thing we should note here is the `init()` function in each of these files. This function gets invoked first and helps register the command in the command tree.

Here is how the final program folder structure should be once you add the remaining command program files.

```shell
$ tree .
.
├── cmd
│   └── gcalc
│       ├── add.go
│       ├── divide.go
│       ├── multiply.go
│       ├── root.go
│       └── subtract.go
├── go.mod
├── go.sum
├── main.go
└── pkg
    └── gcalc
        └── gcalc.go

4 directories, 9 files
```

Alright! Time for another test ride.

```shell
$ go run main.go --help
gcalc is a simple yet powerful command line calculator

        You can use gcalc for quick calculations at the command line.

Usage:
  gcalc [flags]
  gcalc [command]

Available Commands:
  add         Adds a bunch of integers
  completion  Generate the autocompletion script for the specified shell
  divide      Divides two integers
  help        Help about any command
  multiply    Multiplies a bunch of integers
  subtract    Subtracts two integers

Flags:
  -h, --help   help for gcalc

Use "gcalc [command] --help" for more information about a command.
```

This is good. We have the command help printed as we expect. Let us test each command.

```shell
$ go build -o gcalc main.go 

$ ./gcalc add 1 2 3 4 5
15

$ ./gcalc subtract 1 2 3 4 5
Error: accepts 2 arg(s), received 5
Usage:
  gcalc subtract [flags]

Aliases:
  subtract, s

Flags:
  -h, --help   help for subtract

Ooops. There was an error while executing your CLI 'accepts 2 arg(s), received 5'

$ ./gcalc subtract 1 2
-1

$ ./gcalc multiply 1 2 3 4
24

$ ./gcalc divide 4 2
2
```

What if we pass float values instead of integers?

```go
$ ./gcalc add 1 2.0 3.1 5.5
strconv.Atoi: parsing "2.0": invalid syntax
strconv.Atoi: parsing "3.1": invalid syntax
strconv.Atoi: parsing "5.5": invalid syntax
```

As expected. Our calculator can handle only integers. One method to address this is to consider input as floating point values and return floating point values. Here is how we can update the business logic.

```go
package gcalc

import (
	"fmt"
	"strconv"
)

func Add(args []string) (sum float64) {
	for _, i := range args {
		realValue, err := strconv.ParseFloat(i, 64)
		if err != nil {
			fmt.Println(err)
		}
		sum += realValue
	}
	return sum
}

func Subtract(args []string) (diff float64) {
	num1, err := strconv.ParseFloat(args[0], 64)
	if err != nil {
		fmt.Println(err)
	}

	num2, err := strconv.ParseFloat(args[1], 64)
	if err != nil {
		fmt.Println(err)
	}

	return num1 - num2
}

func Multiply(args []string) (product float64) {
	product = 1
	for _, i := range args {
		realValue, err := strconv.ParseFloat(i, 64)

		if err != nil {
			fmt.Println(err)
		}
		product *= realValue
	}

	return product
}

func Divide(args []string) (divident float64) {
	num1, err := strconv.ParseFloat(args[0], 64)
	if err != nil {
		fmt.Println(err)
	}

	num2, err := strconv.ParseFloat(args[1], 64)
	if err != nil {
		fmt.Println(err)
	}

	return num1 / num2
}
```

With this in place, our calculator can now take both floats and integers or a mix of both types.

```shell
$ go build -o gcalc main.go 

$ ./gcalc add 1 2.0 3.1 5.5
11.6

$ ./gcalc subtract 1.1 2
-0.8999999999999999

$ ./gcalc multiply 1 4
4

$ ./gcalc divide 3 4
0.75
```

What we have seen so far is a simple implementation of a CLI using Cobra library. You can add global and local flags and nest commands within commands. We shall see that in a future post with when we build something useful than just a calculator. Stay tuned.

