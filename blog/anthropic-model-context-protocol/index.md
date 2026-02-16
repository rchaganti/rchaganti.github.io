# Model Context Protocol by Anthropic for connecting AI models to data


A couple of months ago, Anthropic introduced and open-sourced the [Model Context Protocol](https://www.anthropic.com/news/model-context-protocol) (MCP). MCP is the new standard for connecting AI models to external data sources and APIs more easily and consistently. With the advances in AI, models are becoming increasingly powerful in reasoning and quality. However, as text-completion machines, these models still lack access to real-time data. AI providers have worked around this using Retrieval Augmented Generation (RAG) and tool calling. Every data source requires custom implementation, and every provider has a way of integrating tools with AI models. MCP addresses these silos by providing a universal, open standard for connecting AI systems with data sources.

As Anthropic explains in its documentation, MCP is like a USB-C port for AI applications. Just as USB-C provides a standardized way to connect devices to various peripherals and accessories, MCP provides a standardized way to connect AI models to different data sources and tools.

There are a few components in the MCP architecture.

An *MCP host* is an AI application that needs access to external tools and data. These hosts get access to the tools, prompts, and resources an *MCP server* exposes through an *MCP client* inside the host application. Anthropic provides a set of [sample servers written in Python and TypeScript](https://modelcontextprotocol.io/examples). Implementing MCP servers and clients is easy if you are familiar with any of these languages. A few community members have implemented MCP SDKs in other languages as well. For example, [mcp-golang](https://mcpgolang.com/introduction) is a Go implementation of the MCP.

This article will look at building a simple MCP server in Python. This example demonstrates how you can get started with developing MCP servers. We shall look at useful MCP server implementations in Python and other languages in future articles.

## Getting started

As we will only implement an MCP server today, we must use an existing MCP host with an MCP client. We shall use [Claude Desktop](https://claude.ai/download) for this purpose. Anthropic added support for MCP in Claude Desktop. As of today, MCP servers can provide three types of capabilities: [resources](https://modelcontextprotocol.io/docs/concepts/resources), [prompts](https://modelcontextprotocol.io/docs/concepts/prompts), and [tools](https://modelcontextprotocol.io/docs/concepts/tools). This article will look at implementing tool capability in an MCP server.

Assuming you already have [Python](https://www.python.org/) and the [uv package manager](https://astral.sh/blog/uv) installed on your system, you can run the following commands to create the scaffold for a hello-world MCP server.

```shell
# Create a new directory for our project
uv init hello-world
cd hello-world

# Create virtual environment and activate it
uv venv
.venv\Scripts\activate

# Install dependencies
uv add mcp[cli]

# Create our server file
new-item hello-world.py
```

We will implement the necessary tools in the hello-world.py. 

```python
from typing import Any
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("hello")

@mcp.tool()
async def say_hello(name: str) -> str:
    """Say hello to the user.

    Args:
        name (str): The name of the user.
    """

    return f"Hello, {name}!"

@mcp.tool()
async def say_hello_to_everyone() -> str:
    """Say hello to everyone."""

    return "Hello, everyone!"

if __name__ == "__main__":
    mcp.run(transport='stdio')
```

This hello-world MCP server implements two tools -- `say_hello` and `say_hello_to_everyone`. The `@mcp.tool()` decorator indicates that the functions are MCP tools that a host can use. The doc strings inside the function definitions are important for identifying the right tools. 

We need to add the MCP server definition to the Claude Desktop configuration to make the MCP host (Claude Desktop) aware of the tools exposed by the MCP server. On a Windows system, this configuration file is located at `C:\Users\<username>\AppData\Roaming\Claude\claude_desktop_config.json`.

```json
{
    "mcpServers": { 
        "hello-world": {
            "command": "C:\\Users\\ravik\\.local\\bin\\uv.exe",
            "args": [
                "--directory",
                "C:\\GitHub\\mcp-servers\\hello-world",
                "run",
                "hello.py"
            ]
        },        
        "memory": {
            "command": "npx",
            "args": [
                "-y",
                "@modelcontextprotocol/server-memory"
            ]
        }
    }
}
```

Once you add the tool definition, restart the Claude Desktop application. You should then be able to see the tools available to Claude.

{{< figure src="/images/mcp-server-01.png" width="450px">}} {{< load-photoswipe >}}

Now, you are ready to prompt and see Claude you these tools. Once you prompt, if Claude finds a suitable tool, you will be prompted to allow access to the tool.

{{< figure src="/images/mcp-server-02.png" width="450px">}}

This is it. In the next set of articles in this series on MCP, we will look at developing some useful MCP servers and clients.




