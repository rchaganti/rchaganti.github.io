# Local MCP tools in Microsoft Agent Framework


The [function tools article](/blog/function-tools-in-microsoft-agent-framework/) covered the case where you write the tool yourself: a Python function, type hints, a docstring, and Microsoft Agent Framework (MAF) takes care of the rest. That works beautifully when you control the code. It does not scale when the tool already exists somewhere else, when a vendor publishes a tool you want to use, or when your team wants to share a single tool implementation across multiple agents and frameworks.

The Model Context Protocol (MCP) is the standard answer for that case. An MCP server exposes a set of tools (and other capabilities) over a well-defined protocol; an MCP client connects to the server and uses those tools. We compared the protocol to the Skills abstraction in an [earlier article](/blog/agent-skills-vs-model-context-protocol-how-do-you-choose/); this one focuses on the practical side, namely, how to wire an MCP server into a MAF agent and what changes when you do.

In this article, we will connect to two flavors of MCP server: a local stdio server you run as a subprocess and a remote HTTP server somewhere on the network, and look at how MAF presents the resulting tools to the agent.

## What an MCP tool looks like to the agent

Before any code, the most useful thing to understand is what changes for the agent when you bring in MCP. From the agent's perspective, almost nothing changes. The agent still sees a list of tools, each with a name, a description, and a JSON schema for its parameters. It calls them the same way it calls a Python function tool. The model does not know whether a tool is implemented in your process or out in a separate server, and it does not need to.

What MAF does on your behalf is the plumbing. When you attach an MCP server to an agent, MAF connects to the server, discovers the tools it exposes, builds tool definitions from the server's metadata, and routes any tool call the model decides to make back to the server. The server runs the tool, returns a result, and MAF puts the result back into the conversation as a tool message. The agent reasoning loop is unchanged.

The implication is that everything you learned about function tools, naming, descriptions, return shape, and error handling applies to MCP tools, too. If the upstream server has bad descriptions, the model picks the wrong tool. If a tool returns a 200 KB blob, your context window pays for it. The lessons are the same; they just apply to a tool you do not own.

## A first stdio MCP server

The simplest kind of MCP server runs as a local subprocess and communicates over `stdin` and `stdout`. MAF's `MCPStdioTool` handles the subprocess for you: tell it the command and the arguments, hand it to the agent, and you are done.

For this example, we will use the open-source `mcp-server-time` server, which exposes a couple of time-related tools. It runs from `uvx`, the same single-shot runner you might be using for Python tooling.

Before running the example, get the server on your machine. The simplest route is to install [`uv`](https://docs.astral.sh/uv/) (Astral's Python package manager) and let `uvx` fetch the server on demand:

```bash
# One-time setup: install uv
pip install uv

# Confirm uvx is available
uvx --version

# Sanity-check that the time server starts
uvx mcp-server-time
```

The first call to `uvx mcp-server-time` downloads and caches the `mcp-server-time` package from PyPI; subsequent runs are fast. When you run the server directly like this, it speaks MCP over stdin and stdout and waits for a client to connect, so the process will sit and do nothing visible until you stop it with Ctrl+C. That is expected. In the example below, MAF will be the client, and it will start and stop the server for us via `MCPStdioTool`.

If you prefer a permanent install over running through `uvx` every time, run `uv tool install mcp-server-time`. That puts a `mcp-server-time` binary on your `PATH`, and you can pass `command="mcp-server-time"` and `args=[]` to `MCPStdioTool` instead of using `uvx`.

```python
import asyncio
import os

from agent_framework import MCPStdioTool
from agent_framework.openai import OpenAIChatClient
from azure.identity import DefaultAzureCredential

from dotenv import load_dotenv

load_dotenv()

async def main():
    model = (
        os.getenv("AZURE_OPENAI_CHAT_MODEL")
        or os.getenv("AZURE_OPENAI_MODEL")
        or os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME")
        or os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
    )
    chat_client = OpenAIChatClient(
        model=model,
        credential=DefaultAzureCredential(),
    )

    async with MCPStdioTool(
        name="time",
        command="uvx",
        args=["mcp-server-time"],
    ) as time_tool:
        agent = chat_client.as_agent(
            name="TimeAgent",
            instructions="You are a time assistant. Use the available tools to answer questions about the current time and time zones.",
            tools=[time_tool],
        )

        result = await agent.run("What is the current time in Bengaluru and in New York?")
        print(result.text)


asyncio.run(main())
```

A few things worth pointing out. The `async with` block matters: `MCPStdioTool` starts the subprocess when the context is entered and stops it cleanly when the context exits. If you skip the `async with` and use the tool plain, you risk leaving the subprocess running after the script exits, especially when an exception fires.

`name` is the name MAF uses internally to refer to the server, which is helpful when more than one MCP server is attached. The `command` and `args` are what you would type at the shell to launch the server. Anything that produces a stdio MCP server will work, whether it is a Python `uvx`-launched server, a Node.js `npx -y @modelcontextprotocol/server-everything` server, or a binary you built yourself.

You do not need to enumerate the tools the server exposes. MAF discovers them at connect time from the server's `tools/list` response and automatically registers them with the agent. The agent simply sees a richer set of tools to choose from.

## How tool discovery works

When `MCPStdioTool.__aenter__` runs, MAF performs an MCP handshake with the server: the protocol version, the server's capabilities, and the list of tools it exposes. For each tool, the server returns a name, a description, and a JSON schema for its inputs. MAF turns each of those into a tool definition, the same shape the model sees for any other tool.

The practical implication: the *quality* of the tools, from the model's perspective, depends entirely on the server author. Servers with sharp, action-oriented descriptions and well-named parameters work well. Servers that describe a tool as "Retrieves data" with a parameter called `args` work poorly. If a particular MCP server consistently produces bad behavior in your agent, the first place to look is the descriptions, not the agent.

The schema generation is also the server's responsibility. If you write your own MCP server in Python, you typically describe inputs with Pydantic models, and the server emits the JSON schema for you, exactly the same loop we covered in the function tools article. From the MAF side, you only see the result.

## Talking to a remote HTTP server

Not every MCP server runs as a subprocess. Many useful ones, including those that need authentication or persistent state, run as HTTP services, often over the streamable-HTTP transport. MAF has a separate tool class for this case.

```python
from agent_framework import MCPStreamableHTTPTool

async with MCPStreamableHTTPTool(
    name="github",
    url="https://api.example.com/mcp",
    headers={"Authorization": f"Bearer {os.environ['MCP_TOKEN']}"},
) as github_tool:
    agent = chat_client.as_agent(
        name="GitHubAgent",
        instructions="Use the available tools to answer questions about repositories.",
        tools=[github_tool],
    )

    result = await agent.run("How many open issues does microsoft/agent-framework have?")
    print(result.text)
```

The shape mirrors the stdio case. Same `async with` lifecycle, same `tools=[...]` parameter on the agent. The differences are at construction time: `url` instead of `command`, and an optional `headers` dict for authentication, which is where most of the security configuration lives. If the server requires more elaborate auth, like signing requests or refreshing tokens, you can layer that on top of the HTTP transport.

A practical note: HTTP MCP servers tend to have higher per-call latency than stdio servers, because every tool invocation crosses the network. For interactive agents, this matters. If a tool that takes 50 ms locally takes 500 ms remotely, an agent that calls it five times in a turn now spends an extra two seconds waiting. We will see how to surface this to the user when we cover observability later in the series.

## Selecting and filtering tools

By default, every tool the server exposes becomes available to the agent. That is the right default for small servers, but it is the wrong default for large ones. A general-purpose MCP server might expose forty tools, and putting all forty into one agent's tool list bloats the prompt, dilutes selection accuracy, and makes the agent's behavior harder to reason about.

The cleanest fix is to declare which tools you want.

```python
async with MCPStdioTool(
    name="github",
    command="uvx",
    args=["mcp-server-github"],
    allowed_tools=["search_issues", "create_issue", "list_repositories"],
) as github_tool:
    ...
```

The agent now sees only those three tools, regardless of what else the server exposes. This pattern is also a good practice for security: even if the server exposes a tool that performs a destructive action, the agent cannot choose to call it if the tool is not in the allow-list.

If you need the inverse, exposing all but a few, MAF supports that too with a `denied_tools` argument; in practice, allow-lists age better, because new server versions may add tools that you have not vetted yet.

## Combining MCP tools with function tools

MCP tools and function tools live on the same `tools=[...]` list and are interchangeable from the agent's perspective. This makes it easy to mix and match: use a community MCP server for the public, well-defined operations, and write a few function tools for your application's private concerns.

```python
def get_active_user_id() -> str:
    """Return the user id for the currently authenticated user."""
    return os.environ["CURRENT_USER_ID"]


async with MCPStdioTool(name="time", command="uvx", args=["mcp-server-time"]) as time_tool:
    agent = chat_client.as_agent(
        name="ScheduleAgent",
        instructions="You schedule meetings. Use the time tool for time-zone math; use get_active_user_id for the current user.",
        tools=[time_tool, get_active_user_id],
    )
```

The agent does not distinguish the two kinds of tool. It sees a flat list, picks whichever is right for the question, and MAF handles the routing. The lessons from the function tools article still apply: keep descriptions sharp, do not overload the list with too many similar tools, and audit what the agent has access to before you ship.

## Lifecycle and connection management

Both `MCPStdioTool` and `MCPStreamableHTTPTool` are async context managers, and treating them as such is the right default. For one-shot scripts, an `async with` block around the agent's main work is enough. For long-running services, the answer is more nuanced.

If you have a single agent process that runs for hours and serves many requests, opening and closing the MCP connection on every request is wasteful. The cleaner pattern is to open the connection once at startup, hold it open, and reuse it across requests.

```python
async def lifespan():
    async with MCPStdioTool(name="time", command="uvx", args=["mcp-server-time"]) as time_tool:
        # Make `time_tool` available to your request handlers, e.g.
        # via a module-level variable, dependency injection, or your
        # framework's lifespan hook.
        await serve_forever(time_tool)
```

The exact wiring depends on your application framework, but the principle is the same: lifecycle of the MCP connection should match the lifecycle of the application, not the lifecycle of an individual request. For HTTP MCP servers, the same advice applies, with the additional concern that the server may close the connection on its end. Be ready to reconnect transparently if the underlying transport link drops, especially for services expected to stay up overnight.

## Pitfalls

A few things to watch for once MCP servers are in your agent's tool list.

Treat MCP servers as untrusted unless you wrote them. A tool description and a tool implementation are written by the server author, and a malicious or buggy server can return responses that lead the model into bad behavior, or worse, prompt-inject the agent through the description. For servers you do not control, allow-list the specific tools you want and review the descriptions before shipping.

Authentication failures are a class of bug worth pre-empting. If a tool the model decides to call returns an "unauthorized" error, the model will often retry with different arguments, sometimes inventing values. Surface auth failures with a clear error message, the same advice as in the function tools article, so the model can give up gracefully rather than guessing.

Schema mismatches between server versions can break runs that worked yesterday. Pin the server version where you can, especially for stdio servers launched via `uvx` or `npx`. A library that pins to `@latest` is convenient until a breaking change ships in a new release.

Latency adds up. An agent that calls four MCP tools in a turn waits for four round-trip times. If the server is local, this is rarely visible; if it is on the network, it becomes the dominant cost in your run. Measure, and if a single tool becomes a bottleneck, consider caching at the application layer.

Finally, MCP tools share the model's context window with everything else. A tool that returns a 200 KB blob is not free just because it came from an MCP server. The same advice applies to function tools: have the tool summarize before returning, or post-process the result on the application side before it enters the conversation.

## Summary

`MCPStdioTool` and `MCPStreamableHTTPTool` are the two front doors into the MCP ecosystem from MAF. They look identical from the agent's perspective, occupy the same position in the `tools=[...]` list as a function tool, and follow the same lessons on names, descriptions, errors, and return size. The differences lie in the lifecycle, latency, and trust model, and once you have those mapped, you can pull useful tools off the shelf rather than writing every capability from scratch.

In the next article, we will look at the other half of the MCP picture in MAF: hosted MCP tools, where Microsoft Foundry runs the MCP server for you, and your agent connects through the platform rather than directly. The day-to-day code stays familiar, but the deployment story changes.

{{< notice "info" >}}
**Updated 26th April 2026 for breaking API changes.** Microsoft Agent Framework's Python package was reorganized after this article was first published. The method for constructing an agent in the chat client changed from `chat_client.create_agent(...)` to `chat_client.as_agent(...)`. The `Multiple tools` example has been updated to match. Other articles in this series also include changes to imports and constructors; see the [client comparison article](/blog/choosing-the-right-microsoft-agent-framework-client/) for the current set of clients and how to use them.
{{< /notice >}}
