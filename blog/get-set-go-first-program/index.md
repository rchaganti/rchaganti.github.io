# Get set Go - First program


{{<img src="/images/getsetgo/banner.png" width="660">}}

With the background provided in the introduction part of this series, you must now be equipped with the necessary tools for the job -- learning Go! So, in this part, you will write your first program in Go language. You will not only learn about the very minimal structure needed for a Go program but you will also learn about organizing your Go programs and why it matters. Get set Go!

## Your first program

The most popular first program among many programmers or programming languages is the *hello world* program. Here is how you can write a hello world program in Go language.

{{<gist "rchaganti" "023b2d3ad10b4c53e997d58387d1ee2d" "d2-helloworld.go">}}

This is it. The above code presents the basic structure of Go programs.

All Go programs are packages and therefore every Go program starts with a package declaration. A Go package can be equated to a library or a module in other languages such as C or Python. In this example, [line1] the package name is `main`. main package in Go is a special package since any Go program execution starts with `main` function of the `main` package. You will learn more about using and building packages in-depth in a later part of this series.

The `import` keyword follows [line 7] the package declaration. This keyword is used to import other packages to use within the current package. In this example, you are importing the `fmt` package. Note that the `fmt` string is enclosed within double-quotes and it should be double-quotes only. If you are coming from other programming languages, you may start using single-quotes for representing strings but that is not valid in Go programming. The method of importing packages shown in the example works only for a single package. You can add multiple such import statements one after another or use a better method as shown below.

```go
import (
	"fmt"
	"os"
)
```

Go does not let you import packages that you are not using within the current program. If you add an import statement for a package but do not use it in your code, you will receive an error during compile time that a package has been imported but not used. This is by design.

Next thing that you see in the example is the `func` keyword to declare the `main` function. Like many other programming languages, functions in Go are the basic building blocks and the name of the function identifies a sequence of steps that you want to perform. In this example, you just have one step that is to print a message using `Println` function within the `fmt` package. You access functions from imported packages using the `<packageName>.<functionName>` syntax and therefore the example above uses `fmt.Println()`.

Go functions, similar to other languages, have input (arguments) and output (return values). However, `main` function in Go uses neither -- it neither takes any arguments nor returns any values. The `Println` function in the `fmt` package takes a string argument and prints the same to the console when executed. You will learn more about the functions in-depth in a later part of this series.

Also, notice that the opening and closing curly brackets in the function declaration. In Go programs, for any code block, the opening bracket has to be on the same line as the the keyword or code block identifier -- in this case the `func` keyword and the name of the function. There is no choice in the function declaration since a new line character is treated as the end of a statement. On a lighter note, this totally eliminates any [my-bracket-style-is-better-than-yours](https://softwareengineering.stackexchange.com/questions/2715/should-curly-braces-appear-on-their-own-line) kind of discussion.

Finally, to the other semantics I skipped. The `/* */` [line 3-5] and `//` [line 9 and end of line 10] indicate comments in Go language. No surprises there. The first method -- `/* */` -- is a multi-line or block comment where as the second one using `//` is a single line comment. Anything that you enclose within comments will be ignored at compile time.

### Executing Go programs

You can execute your Go programs using the `go run` command.

```shell
go run helloworld.go
```

{{<img src="/images/getsetgo/d2-output.png" width="260" caption="Figure 1 - Command Output">}}

When working with Go language, `go` and it's subcommands is all you need to compile your programs. In the above example, you are using the `run` subcommand. When this command is executed, the Go program code gets compiled and translated to machine code which then runs and prints the message that we specified as an argument to the `Println` function. 

What if you want to just build the binary and not run it? You can use the `go build` subcommand.

```go
go build hellworld.go
```

This command generates helloworld.exe in the current working directory. You can now execute the generated binary to see the output from the program.

With the `go build` subcommand, it is optional to specify the .go filename. If you don't specify a file name, go will try to find the Go source code package with main function and build it.

If you look at the screen capture (Figure 1 - Command Output) of program output above, the `go run` command did not use the full file name -- `helloworld.go`. Instead, it was just `helloworld`. It still worked! But, how? If you too thought about it, the answer follows. Read on.

## Go workspaces 

The command shown in the above output worked because the helloworld source code exists in a known Go workspace. In the introduction, you have learned about the `go env` command. In the output of this command, you see an environment variable called `GOPATH`. This variable represents the path where your Go program source code is. By default, this will be set to `%USERPROFILE%\go` on Windows and `$HOME/go` on Linux. You can change this path using the `go env` subcommand with `-w` flag.

```go
go env -w GOPATH=C:/GitHub/GetSetGo
```

Go workspace is essentially a location on your disk. The workspace folder should contain a folder named `src` for all your Go program source code. The other folder that gets created automatically is the `bin` folder for storing all binary files generated using `go install` subcommand. Here is how the folder structure looks like on my system.

{{<img src="/images/getsetgo/d2-gopath.png" width="260" caption="Figure 2 - Go workspace structure">}}

With this folder structure, when you run `go build helloworld` or `go run helloworld` or `go install helloworld` command, go will try to find if there is a match that exists at a path specified by either `GOROOT` or `GOPATH` environment variables. A typical Go workspace contains many source control repositories -- one for each package you are working on. So, in the example above, you can consider the folder *helloworld* under `src` to be a source control repository. It is a best practice among Go programmers to use single workspace for all their Go source code. 

The Go workspace is the folder structure that gets used when you use the `go get` subcommand to download Go packages. For example, if you are using VS Code with the Go extension to develop your Go programs, you might have seen VS Code prompting you to install necessary Go tools to enable the VS Code editor features such as Intellisense, linting, formatting, and so on. So, if you have used the Go: Install/Update Tools in VS Code, all tools get downloaded to `pkg` folder within the Go workspace and then the packages get compiled to binaries which get installed to the `bin` folder.

For now, it is not mandatory (but good) to use a Go workspace to try out the examples in this or the next few upcoming parts. You will revisit this in a later part discussing Go packages. In the next part of this series, you will get introduced to variables and types in Go language.

## Exercises

- Now that you have got introduced to basic Go program syntax, write a program that prints "I ❤ Golang!". You don't have to use anything more than what you learned today. Post your solution to this @ https://gist.github.com/rchaganti/725cc041a30ee90e19d4713a1514b432.
- Update the GOPATH environment variable to a different location than the default path and create folder structure similar to what is shown in Figure 2. Try `go build`, `go run`, and `go install` commands and understand the difference.
