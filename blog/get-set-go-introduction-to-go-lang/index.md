# Get set Go - Introduction to Go language


{{<img src="/images/getsetgo/banner.png" width="660">}}

[Go programming language](https://golang.org/) isn't new. It existed for more than 13 years now. The idea of Go language was first conceived in 2007 at Google by Ken Thompson, Robert Griesemer, and Rob Pike. Go was developed in response to some of the challenges the development teams at Google were facing internally. Some of these issues included ridiculously longer build times, baggage that legacy languages imposed on modern infrastructure / systems development, and uncontrolled dependencies among many other pain points. Go was designed to make it easy and efficient to program modern multicore systems, web service backends, and command line tools. The design considerations such as rigorous dependency management and efficiency at scale make Go one of the best modern programming languages. 

Go was publicly announced in 2009. Version 1.0 of Go language was released in [March 2012](https://golang.org/doc/go1) and the current version (at this time of writing) is [1.14](https://golang.org/doc/go1.14). Today, Go is a part of many major online services and infrastructure tools that you use every day! Google, of course! [Docker](https://github.com/docker) -- the most popular container technology -- is written in Go. The most recent entrant in the CLI game, the [GitHub CLI](https://github.com/cli/cli), is written in Go. Every tool that [Hashicorp](https://www.hashicorp.com/) developed so far was in Go. Blockchain platform like [Ethereum](https://ethereum.org/en/) uses Go. This static page that you are reading right now was generated using [Hugo](https://gohugo.io/) which is written in Go. I can *Go* (pun intended) on with this list and [there are many more very well known names](https://github.com/golang/go/wiki/GoUsers) that use Go as their primary language for all their product development. So, what is Go?

## What is Go?

Go is an [open source](https://github.com/golang/go), general-purpose, and modern programming language with its roots in systems programming. If you are familiar with C programing language, you will find a few similarities between Go and C. Apart from C, Go language design was inspired from Pascal, Smalltalk, Modula, Oberon, and Algol. Go is a modern language and offers features such as garbage collection and better memory management. 

Go is a **compiled** language. Unlike other compiled languages, Go programs can be compiled directly to machine code and compile very fast. Faster compiler times are a part of Go's design. Go programs can be compiled for cross-platform execution which includes Windows, Linux, OS X, Solaris, Plan9 and many other operating systems. Go programs get compiled to a single executable which eliminates the dependency nightmares from other languages. 

Go is **statically typed strong language**. Go does not allow type coercion unlike weakly typed languages such as JavaScript. Like other statically typed languages, Go types are checked before run-time. This allows any errors related  to types surface right during compile time itself. 

Go's **package system** combines the best of libraries, namespaces, and modules. Every Go file is a package. The package system is designed to identify the package import using the package path than the name. There is no need to make package names unique in the Go package system.

Go has a **simple and clean syntax**. Go's grammar is modest in size compared to other languages such as C, C++, and Java. There are just 25 keywords in Go. 

Go offers **concurrency** that is important and well suited for developing modern computing application that run on multicore systems. Go implements a variant of [Communicating Sequential Processes](https://en.wikipedia.org/wiki/Communicating_sequential_processes) (CSP) to enable support for concurrency that is simple and robust. 

Overall, Go is powerful, simple to learn and use and that is what makes you productive. Now, you may ask, this is all good but why learn go?

## Why Learn Go?

{{<youtube "FTl0tl9BGdc">}}

This interview is 8 years old and Go language has progressed quite a bit and that is evident not only from the investments that big companies are making in Go but also from the developer surveys such as the surveys done by [Stack Overflow](https://insights.stackoverflow.com/survey/2020) and [HackerRank](https://research.hackerrank.com/developer-skills/2020). In the Stack Overflow survey, Go stood as 5th [most loved language and 3rd most wanted language](https://insights.stackoverflow.com/survey/2020#technology-most-loved-dreaded-and-wanted-languages-loved) to develop new applications. Go featured as the [3rd most highest paid programming skill](https://insights.stackoverflow.com/survey/2020#technology-what-languages-are-associated-with-the-highest-salaries-worldwide). In the HackerRank survey, Go -- for 3 consecutive years -- was at the top of the list of new languages developers want to learn. 

Apart from all this, Go is fun. I started learning this really as yet another programming language in my skillset but got hooked to this as I progressed in my journey. I started looking at some of the most popular tools implemented in Go and it was amazing to see how clean the code is and how readable it is. When compared to languages like C, C++, and Java, navigating Go code is so simple. The learning curve to get started with Go and do anything productive is very small.

Go language is the most popular choice for building web services and command line tools. This is where my interest as well and therefore learning Go is really paying off.

So, what are YOU waiting for? Start here and start today.

## Get started with Go

To get started with Go, you need not install anything on your system. Really. You can just use the [Go Playground](https://play.golang.org/) to start with the basics. 

{{<img src="/images/getsetgo/goPlayground.png" width="860">}}

With Go playground, you can write basic Go programs, execute, and see the output. You can also share the code that you write in the playground by clicking on the share button. This generates a unique link to access and share your code. 

[Go by example](https://gobyexample.com/) -- an online Go language tutorial site -- has examples that you can open in Go playground and try out. As you get started, this is certainly one place that you don't want to miss.

{{<img src="/images/getsetgo/goByExample.png" width="860">}}

For those of you who prefer having Go installed locally for all learning, you need to download and install the latest release of Go language from https://golang.org/dl/ and follow the [install instructions](https://golang.org/doc/install) to prepare the environment for getting started with Go.

> Note: I am writing these articles on my Windows 10 system and therefore you will see references to Windows paths and configuration. Otherwise, the content and examples can be used on any supported platform.

On Windows, you can either get the [zip archive](https://golang.org/dl/go1.14.6.windows-amd64.zip) of a Go language release, extract it to location of your choice on the local disk, and set up the required environment variables. At a minimum, you must configure the system PATH variable to include path to the bin folder. In the second but preferred method, you can download the [MSI file](https://golang.org/dl/go1.14.6.windows-amd64.msi) which installs, by default, at *C:\Go* and configures needed environment variables for you.

You can verify your Go binary installation and environment variable configuration by executing the `go env` or `go version` commands. You will have to re-open the command console before running this command. 

You should see output similar to what is shown below.

{{<img src="/images/getsetgo/goenv.png" width="460">}}

You can install and run multiple versions of Go language binaries side by side. The `go get` command, which you learn later in this series, can help get different versions of Go binaries.

```shell
go get golang.org/dl/go1.15rc1
```

The above command downloads unstable (under development) version of Go. Once this is installed, you can use `go1.15rc1` instead of `go` to explore the new features that are still in development or verify bug fixes. 

For writing Go programs, a simple notepad would be good enough but that won't make you productive. A good Integrated Development Environment (IDE) is needed for developing Go code with ease. There are many editors such as Visual Studio [Code](https://code.visualstudio.com/), JetBrains [GoLand](https://www.jetbrains.com/go/), Eclipse with [GoClipse](https://goclipse.github.io/) plugin, and many others. So far, I have used Visual Studio Code only and therefore it is my only preference. The [Go language extension](https://code.visualstudio.com/docs/languages/go) for VS code is a must. With this extension, VS Code gets support for IntelliSense, signature help, formatting, linting, build, and more importantly debugging features. As you proceed in this series, you will see mention different VS Code Go extension features and how those features can make you more productive when writing Go programs.

Ok. Enough talk. What are some resources that you can use to get started with Go language?

## Learning resources

There are many existing resources online for learning Go language. The following is a list of resources I used or often refer to. Depending what mode of learning you like, here are my recommendations. The Go language specification is not for an end-to-end reading but acts more like a reference. You will see references to the language specification throughout this series of articles.

| Resource                                                     | Link                                                | Category                      |
| ------------------------------------------------------------ | --------------------------------------------------- | ----------------------------- |
| Go language documentation                                    | https://golang.org/doc/                             | Documentation                 |
| Go language specification                                    | https://golang.org/ref/spec                         | Documentation                 |
| Go by example                                                | https://gobyexample.com/                            | Online tutorial               |
| Exercism                                                     | https://exercism.io/tracks/go                       | Code practice                 |
| The Go Programming Language                                  | https://cutt.ly/Ydfkm9w                             | Book                          |
| Introducing Go                                               | https://cutt.ly/VdfkoPp                             | Book                          |
| Go In Action                                                 | https://cutt.ly/Mdfj8Bs                             | Book                          |
| Learn How To Code: Google's Go (golang) Programming Language (Udemy) | https://www.udemy.com/course/learn-how-to-code/     | Video                         |
| Go Core Language (Pluralsight path)                          | https://www.pluralsight.com/paths/go-core-language  | Video                         |
| Go Fundamentals (Nigel Poulton)                              | https://www.pluralsight.com/courses/go-fundamentals | Video                         |
| Go Programming Language (Reddit)                             | https://www.reddit.com/r/golang/                    | Community Forum / Discussions |

There are a lot of companies that use Go language and there are quite a few of them in [open source](https://github.com/trending/go?spoken_language_code=en). Looking at the Go code in these open source repositories is another great exercise and gives you insights into how the language is used in the real-world. As a part of this series, you will see references to code from some of these open source projects while explaining a few concepts.

Finally, I am no expert in Go language and therefore these are the notes from a novice. These notes are how I learned (or still learning) Go language. At this point in time, I don't have a definite number of articles that I want to publish as a part of this series. I will go right from very basics to applied Go language. The applied Go language part of this series will deal with some sample utilities that I developed to strengthen my understanding of Go and walk-through how I went about developing those utilities and what I learned from that exercise. At the end of each part, starting next one, I will post a few exercises that you may want to try out and share your code with the others. Each of these exercises will be available as a [Gist](https://gist.github.com/) and you can comment there to share your solution to the exercise with other readers of this series.

Join me in this journey. Let us learn together. Stay tuned!

