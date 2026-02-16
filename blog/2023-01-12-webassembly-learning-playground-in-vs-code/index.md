# WebAssembly (wasm) learning playground in VS Code


[WebAssembly,](https://webassembly.org/) a.k.a Wasm, defines a portable binary-code format for a stack-based virtual machine. Wasm enables developers to write code that runs in web browsers with near-native performance using languages such as C, C++, Rust, Go, and many other modern languages. Wasm is not a replacement for JavaScript but is designed to complement and run alongside JavaScript.

I am still learning about Wasm and looking at opportunities to use Wasm in designing modern and cloud-native applications. My focus has been using the Go programming language for Wasm as well. So, when I started learning Wasm, I quickly looked for ways to create a development environment that would help me in my journey toward mastering Wasm. For this, I started looking at [VS Code development containers](https://code.visualstudio.com/docs/devcontainers/containers). This resulted in a set of devcontainer features that I can use within a development container definition.

### TinyGo feature

The first feature I needed was [TinyGo](https://tinygo.org/). TinyGo compiles Go code for embedded systems and WebAssembly. This [feature installs tinygo](https://github.com/rchaganti/vsc-devcontainer-features/pkgs/container/vsc-devcontainer-features%2Ftinygo) in your dev container.

```json
{
    "image": "mcr.microsoft.com/vscode/devcontainers/base",
    "settings": {},
    "extensions": [],
    "features": {
        "ghcr.io/devcontainers/features/go:1": {
            "version": "latest"
        },
        "ghcr.io/rchaganti/vsc-devcontainer-features/tinygo:latest": {
            "version": "0.26.0"
        }
    },
    "remoteUser": "vscode"
}
```

### WebAssembly Binary Toolkit feature

The [next feature](https://github.com/rchaganti/vsc-devcontainer-features/pkgs/container/vsc-devcontainer-features%2Fwabt) is a set of tools that help learn the internals of Wasm and debug Wasm. These tools are packaged as [WABT](https://github.com/WebAssembly/wabt). 

```json
{
    "image": "mcr.microsoft.com/vscode/devcontainers/base",
    "settings": {},
    "extensions": [
        "dtsvet.vscode-wasm"
    ],
    "features": {
        "ghcr.io/devcontainers/features/go:1": {
            "version": "latest"
        },
        "ghcr.io/rchaganti/vsc-devcontainer-features/tinygo:latest": {
            "version": "0.26.0"
        },
        "ghcr.io/rchaganti/vsc-devcontainer-features/wabt:latest": {
            "version": "1.0.32"
        }
    },
    "remoteUser": "vscode"
}
```

This dev container definition provides all I need to learn and build Wasm in the Go programming language. 

What else? These features install the VS code extensions for TinyGo and WebAssembly. So, you have the full power of VS Code in your development container.

{{< figure src="/images/vscode-wasm.png">}} {{< load-photoswipe >}}

Go ahead and give this a try! [Let me know what else you want to see](https://github.com/rchaganti/vsc-devcontainer-features/issues) to help you learn or develop Wasm in VS Code.


