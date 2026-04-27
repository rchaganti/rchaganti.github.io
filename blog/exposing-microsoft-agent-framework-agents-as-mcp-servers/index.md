# Exposing Microsoft Agent Framework agents as MCP servers


So far in this series, we have used MCP in one direction. The [local MCP article](/blog/local-mcp-tools-in-microsoft-agent-framework/) and the [hosted MCP article](/blog/hosted-mcp-tools-in-microsoft-agent-framework/) both treated the agent as a *client*: it found tools on someone else's server and called them. That is the more common pattern, and it is where most teams start.

The opposite direction is just as useful and gets less attention. A Microsoft Agent Framework (MAF) agent can also be published as an MCP server, which is how you let other agents and applications, in any framework, in any language, consume your agent's behavior as a tool. Once you have an agent that does something useful, exposing it over MCP is often the cleanest way to share it with the rest of your organization without forcing everyone onto MAF.

In this article, we will look at why you might want to do this, what the result looks like to a consumer, and how to wire it up. The pattern overlaps with the [A2A interop article](/blog/cross-framework-agent-communication-microsoft-agent-framework-meets-google-adk-via-a2a/) we covered earlier: A2A is the agent-to-agent protocol, while MCP is the tool-and-context protocol; you will sometimes use both for different audiences.

## Why expose an agent as an MCP server

A few patterns come up often enough to be worth naming.

The first is *capability publishing*. Your team builds a domain-specific agent, say, an internal "customer-history agent" that knows how to answer questions about a CRM. The natural question from another team is "how can my agent use yours?" Wrapping the agent as an MCP server gives you a stable, framework-neutral answer. They add it as a tool, just like any other MCP server, and your agent shows up alongside the rest of their tools.

The second is *cross-framework reuse*. The consumer might not be a MAF agent at all. It might be an OpenAI Assistant run, a Claude Desktop client, an Anthropic API caller using MCP, a LangGraph workflow, or a custom orchestrator. MCP works everywhere; once your agent is an MCP server, all of those become valid callers without a single line of consumer-side MAF code.

The third is the *separation of concerns*. The team that owns the agent owns its prompt, tools, model choice, and evaluation harness. Consumers do not need to know any of that. They see a tool with a name, a description, and a parameter schema, and they call it. That separation is exactly what good library boundaries look like, applied to agents.

## What consumers see

When you expose an MAF agent through MCP, the consumer sees one or more tools, depending on how you model the surface. The simplest shape is *one agent, one tool*: the agent's whole behavior collapses into a single tool that takes a question (or a structured input) and returns the agent's answer.

```text
Tool: ask_customer_history
Description: Answers questions about a customer's order and support history.
Parameters:
  - customer_id: string  (the customer to look up)
  - question:    string  (the natural-language question)
Returns: string
```

That is a perfectly good interface for an agent that mostly answers free-form questions. For agents whose behavior decomposes naturally into distinct operations, a multi-tool surface is sometimes cleaner: each operation becomes its own MCP tool with its own parameter schema, and the calling agent selects the appropriate one. We will see both shapes below.

What consumers do *not* see is everything that happens inside the agent-run. Tool calls the agent makes, function calls, MCP calls of its own, the model conversation, all of that is internal. The MCP boundary is the agent's input and output, nothing more.

## A first MCP server

The simplest way to publish a MAF agent over MCP is to wrap it inside the standard Python MCP server library. The `mcp` package ships with `FastMCP`, a small framework that turns decorated Python functions into MCP tools and serves them over stdio or HTTP.

Install the MCP SDK first:

```bash
pip install mcp
```

The example below uses `OpenAIChatClient` against an Azure OpenAI deployment. The Azure path requires either an `azure_endpoint=...` argument or an `AZURE_OPENAI_ENDPOINT` environment variable; without one of those, the constructor raises. Set it in your `.env` file alongside the model variables.

Now we can write a server that wraps a single MAF agent.

```python
import asyncio
import os

from agent_framework.openai import OpenAIChatClient
from azure.identity import DefaultAzureCredential
from mcp.server.fastmcp import FastMCP

from dotenv import load_dotenv

load_dotenv()

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

weather_agent = chat_client.as_agent(
    name="WeatherAgent",
    instructions="You are a concise weather assistant. Answer in one or two sentences.",
)

mcp = FastMCP("weather-agent-server")

@mcp.tool()
async def ask_weather(question: str) -> str:
    """Ask the weather agent a natural-language question about the weather."""
    result = await weather_agent.run(question)
    return result.text

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

A few things worth pulling out. The MAF agent is built exactly as it would be in any other MAF script; the MCP layer does not change anything about how you construct the agent or its tools. The `@mcp.tool()` decorator turns the `ask_weather` function into an MCP tool, and `FastMCP` derives the tool's schema from the function signature: a single string parameter `question`, return type `str`. The docstring becomes the tool description.

Inside the function, we simply forward the call to the agent and return the agent's text response. The consumer sees a clean, single-purpose tool. Behind the scenes, every call to that tool can fan out into model calls, function tool calls, MCP-client calls, whatever the agent decides to do, but the consumer never has to think about any of it.

Run the server with `python weather_server.py`. It will sit on stdin and stdout waiting for an MCP client to connect, in the same shape as any stdio MCP server. Now, any MCP client, including an MAF agent using `MCPStdioTool`, can use it as a tool.

## Multi-tool servers

When the agent's behavior naturally splits into a few distinct operations, exposing each as its own tool yields the calling model better selection accuracy than collapsing everything into a single ask-anything entry point.

```python
@mcp.tool()
async def get_temperature(location: str) -> str:
    """Return the current temperature for a city."""
    result = await weather_agent.run(f"What is the current temperature in {location}? Respond with just the temperature.")
    return result.text


@mcp.tool()
async def get_forecast(location: str, days: int = 3) -> str:
    """Return a short multi-day weather forecast for a city."""
    result = await weather_agent.run(f"Give me a {days}-day forecast for {location}.")
    return result.text


@mcp.tool()
async def get_weather_alerts(location: str) -> str:
    """List any active weather alerts for a city."""
    result = await weather_agent.run(f"Are there any active weather alerts for {location}?")
    return result.text
```

Each function becomes a separately documented tool. The calling model picks the right one based on the question, the same way it would for a hand-written tool, and you get the benefit of distinct names, descriptions, and parameter schemas.

The trade-off is brittleness. Splitting into many tools makes the server's prompt-to-prompt behavior more constrained: each entry point essentially fixes the prompt template the agent is run with. Lean on multi-tool surfaces when the operations really are distinct; if they all collapse to "answer a question about weather," a single tool is cleaner.

A useful middle ground is to expose one general-purpose tool plus a small number of specialized ones. Consumers can reach for the specialized tools when they fit and fall back to the general one otherwise.

## Sessions and state

A subtle point about exposing an agent over MCP: each MCP tool call is independent. Unless you do something extra, two calls to `ask_weather` start two separate agent runs with no shared history. That is usually what you want when the consumer is treating your agent as a single-shot tool.

When the consumer needs continuity, for example, a customer-support agent that keeps context across several questions, you have two options. One is to make the `session_id` (or equivalent) part of the tool's input, and to keep `AgentSession` instances keyed by that id on the server side. Calls with the same id share state; calls with different ids are independent. The other is to expose multi-turn conversation as its own protocol layer, possibly with A2A rather than MCP, since A2A models multi-turn conversation as a first-class concept and MCP does not.

Most of the time, MCP-exposed agents are stateless from the consumer's perspective. Build for that, and only add session affinity when you have a concrete use case that needs it.

## Transports: stdio vs HTTP

`FastMCP` supports both stdio and HTTP transports. The choice depends on where your callers run.

Stdio is the right answer when the consumer launches the server as a subprocess. Many MCP clients work this way, including MAF's `MCPStdioTool`, Claude Desktop, and most local development setups. The server starts when the client connects, and stops when the client disconnects. There is no network exposure, which is good for security but limits scope to clients on the same machine.

HTTP is the right answer when consumers are remote. Switch the run line:

```python
if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="0.0.0.0", port=8080)
```

The server now listens on `http://0.0.0.0:8080/mcp` and accepts MCP requests over the streamable-HTTP transport. Anything that speaks MCP over HTTP can call it: a Foundry-backed agent via `FoundryChatClient.get_mcp_tool(...)`, a local MAF agent via `MCPStreamableHTTPTool`, an Anthropic API caller, or any other MCP client.

HTTP also unlocks the standard set of HTTP concerns: TLS, authentication, rate limiting, and reverse proxies. None of those are MCP-specific, but they all become your problem the moment your agent is reachable over the network. Most teams put the HTTP server behind their existing API gateway and let the gateway handle auth and TLS, leaving the MCP server itself focused on routing tool calls into the agent.

## Pitfalls

A few things to plan for once your agent is on the other end of an MCP call.

Errors propagate in unhelpful ways by default. If the agent run fails, the simplest implementation lets the exception bubble out of `ask_weather`, which the MCP framework turns into a generic tool error on the consumer side. The consumer's model sees a wall-of-text traceback and usually does not recover well. Catch the exception in the wrapper, log the details on the server side, and return a short, actionable error string the calling model can actually use.

Tracing crosses a process boundary and breaks unless you carry it across. If you have OpenTelemetry set up on both sides, propagate the trace context through the MCP call so the agent run on the server side joins the consumer's trace. Without this, an MCP-exposed agent looks like a black box in your traces, which is exactly the wrong signal for debugging an agent-of-agents system. We will dig into this in the observability article later in the series.

Security is your responsibility once the server is exposed over HTTP. The MCP protocol does not specify authentication; that lives at the transport layer. For internal-only servers, network ACLs are usually enough. For anything internet-facing, pair the server with the same authentication path your other internal APIs use, and assume that any unauthenticated call is hostile.

Tool descriptions matter even more than they did when you were the consumer. The model on the *other* side is the one selecting your tool, and its decision is based entirely on the description text. Treat the docstrings on your `@mcp.tool()` functions like a public API: short, action-oriented, unambiguous, and stable across versions.

Finally, agents are stochastic. A tool that wraps an agent will not always return identical results for identical inputs, the way a deterministic tool would. Document this. Consumers will reasonably assume they can cache the result of a tool call by its inputs, and an agent-backed tool that quietly returns different answers on retry can produce confusing downstream behavior.

## Summary

Wrapping a MAF agent in `FastMCP` turns it into a server that any MCP client can use, in any framework or language. The shape of the server is up to you: a single ask-anything entry point for free-form agents, a small set of specialized tools when the behavior decomposes cleanly, or a mix of both. The boundary between server and consumer is the agent's input and output; everything inside the agent stays internal.

In the next article, we will look at the other side of "things outside the agent's process": context providers and pluggable memory. We have leaned on `AgentSession` to keep a single conversation alive in memory; for agents that need to remember a user across days, weeks, or systems, the session is too thin a primitive on its own.

