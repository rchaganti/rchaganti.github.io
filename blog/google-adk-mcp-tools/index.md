# Google ADK - MCP tools


Consider you are building an agent that needs to interact with a company's database, pull data from a third-party API, and read files from a shared drive. Without a standard protocol, you would end up writing custom integration code for each backend. Every new tool means a new adapter. Every new agent that needs the same tool means duplicating that adapter. This approach does not scale. The Model Context Protocol (MCP) solves this by providing a universal standard for how agents connect to external tools and data sources. With MCP, a tool is built once, and any MCP-compatible agent can discover and use it. Google ADK has first-class support for MCP, enabling your agents to both consume tools from MCP servers and expose their own tools as MCP servers.

## What is MCP?

MCP is an open standard initiated by Anthropic that defines how LLMs communicate with external applications, data sources, and tools. It follows a client-server architecture. An MCP server exposes capabilities such as data (resources), interaction templates (prompts), and executable functions (tools). An MCP client, which in our case is the ADK agent, connects to the server, discovers what it offers, and uses those capabilities as if they were native.

The key benefit is standardization. Instead of building one-off integrations for every external system, you write an MCP server once, and any MCP client can talk to it. Conversely, your ADK agent, acting as a client, can connect to any MCP server without needing to know the implementation details behind it.

ADK supports two primary integration patterns with MCP.

- **Consuming MCP servers:** Your ADK agent acts as an MCP client, using the tools provided by an external MCP server.
- **Exposing ADK tools via an MCP server:** You wrap your existing ADK tools inside an MCP server, making them accessible to any MCP-compatible client, not just ADK agents.

## Consuming MCP servers

This is the most common pattern. You have an existing MCP server, one from the community, a cloud-managed service, or one you built for another application, and you want your ADK agent to use its tools.

### McpToolset

`McpToolset` is the class at the heart of ADK's MCP integration. When you add an `McpToolset` instance to your agent's `tools` list, it handles the entire lifecycle behind the scenes.

| Responsibility        | What happens                                                 |
| --------------------- | ------------------------------------------------------------ |
| Connection management | Establishes and maintains the connection to the MCP server, and tears it down on shutdown |
| Tool discovery        | Queries the server for its available tools via the MCP `list_tools` method |
| Schema adaptation     | Converts each discovered MCP tool schema into an ADK-compatible `BaseTool` instance |
| Transparent proxying  | When the LLM invokes a discovered tool, `McpToolset` forwards the call via the MCP `call_tool` method |
| Filtering             | Selectively exposes only the tools you want, instead of all the tools the server advertises |

The connection to an MCP server can use one of three transport mechanisms.

| Transport              | Class                          | Use case                                                               |
| ---------------------- | ------------------------------ | ---------------------------------------------------------------------- |
| Standard I/O (Stdio)   | `StdioConnectionParams`        | The MCP server runs as a local subprocess; communication via stdin/stdout |
| Server-Sent Events (SSE) | `SseConnectionParams`       | The MCP server is a remote HTTP service using the legacy SSE transport |
| Streamable HTTP        | `StreamableHTTPConnectionParams` | The MCP server is a remote HTTP service using the newer single-endpoint transport |

### Connecting via Stdio

Stdio is the simplest transport. The MCP server runs as a child process on the same machine, and ADK communicates with it through standard input and output pipes. Many community MCP servers distributed as Node.js packages use this model.

Here is an example that connects an ADK agent to the community filesystem MCP server. This server provides tools for listing directories, reading files, and performing other file operations.

```python
import os
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters

from dotenv import load_dotenv  
load_dotenv()

ACCESSIBLE_FOLDER = "C:/GitHub/google-adk-101"

root_agent = LlmAgent(
    model="gemini-2.0-flash",
    name="file_assistant",
    instruction=f"""Help the user manage files. You can list directories, read files, and search for content.
You have access to the directory: {ACCESSIBLE_FOLDER}
Always use the full absolute path when calling filesystem tools.
Use list_directory first to explore, then read specific files.""",
    tools=[
        McpToolset(
            connection_params=StdioConnectionParams(
                server_params=StdioServerParameters(
                    command="npx.cmd",
                    args=[
                        "-y",
                        "@modelcontextprotocol/server-filesystem",
                        ACCESSIBLE_FOLDER,
                    ],
                ),
                timeout=60,
            ),
        )
    ],
)

```

When this agent starts, `McpToolset` spawns `npx @modelcontextprotocol/server-filesystem` as a subprocess, queries it for tools, and makes them available to the LLM. The agent can now respond to prompts such as "*list all Python files in my project directory*" or "*show me the contents of config.yaml*" without any custom tool code.

```shell
> adk run .\mcp_agent\

Running agent file_assistant, type exit to exit.
[user]: list files in mcp_agent folder

[file_assistant]: Okay, I see the following files and directories in the `mcp_agent` folder:

*   `.adk` (directory)
*   `agent.py` (file)
*   `__init__.py` (file)
*   `__pycache__` (directory)

Is there anything specific you'd like me to do with these files? For example, I can read the content of `agent.py` or any other file.
[user]: 
```

### Connecting via SSE

When the MCP server is running remotely as a standalone HTTP service, you use `SseConnectionParams`. SSE (Server-Sent Events) was the original network transport for MCP. It uses two separate HTTP endpoints, one for the client to send requests (POST) and another where the client establishes a persistent SSE connection (GET) to receive streaming responses.

```python
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import SseConnectionParams

root_agent = LlmAgent(
    model="gemini-2.0-flash",
    name="wiki_agent",
    instruction="Help users retrieve and summarize Wikipedia articles.",
    tools=[
        McpToolset(
            connection_params=SseConnectionParams(
                url="http://localhost:8001/sse",
                headers={"Authorization": "Bearer my-api-token"},
                timeout=30,
            ),
        )
    ],
)
```

The `SseConnectionParams` accept `url`, optional `headers` for authentication, a `timeout` for the initial connection, and an `sse_read_timeout` for the streaming read.

### Connecting via Streamable HTTP

In March 2025, the MCP specification introduced Streamable HTTP as the successor to SSE. Instead of two separate endpoints, Streamable HTTP uses a single HTTP endpoint for both sending requests and receiving responses. This simplifies deployment and works better with standard HTTP infrastructure, such as load balancers and reverse proxies.

```python
import os
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool import MCPToolset, StreamableHTTPConnectionParams

root_agent = LlmAgent(
    model="gemini-2.0-flash",
    name="github_agent",
    instruction="Help users work with GitHub repositories, issues, and pull requests.",
    tools=[
        MCPToolset(
            connection_params=StreamableHTTPConnectionParams(
                url="https://api.githubcopilot.com/mcp/",
                headers={
                    "Authorization": "Bearer " + os.environ["GITHUB_TOKEN"],
                },
            ),
        )
    ],
)
```

For new MCP server integrations, prefer Streamable HTTP over SSE when the server supports it.

```shell
> adk run .\mcp_agent\

Running agent github_agent, type exit to exit.
[user]: get rchaganti/dscresources info   

[github_agent]: The repository name is DSCResources, full name is rchaganti/DSCResources, description is Custom DSC resource modules by PowerShell Magazine, the language is PowerShell, it has 62 stars, 26 forks, and 13 open issues. It was created on 2014-10-13T07:06:17Z and updated on 2024-10-24T03:19:14Z. It is a public repository and the default branch is master.

[user]: 
```

### Filtering tools

An MCP server might expose dozens of tools, but your agent may only need a handful. Exposing unnecessary tools to the LLM increases token consumption and can confuse the model's tool selection. The `tool_filter` parameter on `McpToolset` lets you whitelist only the tools you need.

```python
McpToolset(
    connection_params=StdioConnectionParams(
        server_params=StdioServerParameters(
            command="npx",
            args=["-y", "@modelcontextprotocol/server-filesystem", "/home/user/data"],
        ),
    ),
    tool_filter=["read_file", "list_directory"],
)
```

With this filter, even if the filesystem server exposes tools for writing, moving, or deleting files, only `read_file` and `list_directory` will be available to the agent. This is a good practice for both security and performance.

### Using McpToolset outside adk web

When you are running your own application loop instead of using `adk web`, the setup requires a bit more care around async initialization and connection cleanup. The `McpToolset` must be created asynchronously, and you need to manage the connection lifecycle properly.

```python
import asyncio
from google.adk.agents import LlmAgent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters
from google.genai.types import Content, Part

async def main():
    toolset = McpToolset(
        connection_params=StdioConnectionParams(
            server_params=StdioServerParameters(
                command="npx",
                args=["-y", "@modelcontextprotocol/server-filesystem", "C:\\github\\google-adk-101"],
            ),
        ),
        tool_filter=["read_file", "list_directory"],
    )

    agent = LlmAgent(
        model="gemini-2.0-flash",
        name="file_reader",
        instruction="You help users explore files.",
        tools=[toolset],
    )

    session_service = InMemorySessionService()
    runner = Runner(
        agent=agent,
        app_name="mcp_demo",
        session_service=session_service,
    )

    session = await session_service.create_session(
        app_name="mcp_demo", user_id="user1"
    )

    user_msg = Content(
        parts=[
            Part(
                text="What files are in mcp_agent folder?"
            )
        ]
        ,role="user"
    )

    async for event in runner.run_async(
        user_id="user1", session_id=session.id, new_message=user_msg
    ):
        if event.is_final_response() and event.content and event.content.parts:
            print(f"Agent: {event.content.parts[0].text}")

asyncio.run(main())
```

When using `McpToolset` directly in `adk web`, the framework handles connection setup and teardown automatically. In standalone applications like the one above, the `Runner` manages the lifecycle of the toolset.

```shell
> python.exe .\mcp_agent\agent.py

Agent: Okay, the files in the mcp_agent folder are: .adk (directory), agent.py, __init__.py, and __pycache__ (directory).
```

### Connecting to multiple MCP servers

An agent can consume tools from several MCP servers simultaneously. Each `McpToolset` manages its own independent connection. You simply list multiple toolsets in the agent's `tools` parameter.

```python
import os
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool import McpToolset, MCPToolset, StreamableHTTPConnectionParams
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters

root_agent = LlmAgent(
    model="gemini-2.0-flash",
    name="research_assistant",
    instruction="""You are a research assistant. 
    Use the filesystem tools to read local notes, 
    and the GitHub tools to look up repository information.""",
    tools=[
        # Local filesystem server
        McpToolset(
            connection_params=StdioConnectionParams(
                server_params=StdioServerParameters(
                    command="npx",
                    args=["-y", "@modelcontextprotocol/server-filesystem", "C:\\Github\\google-adk-101"],
                ),
            ),
            tool_filter=["read_file", "list_directory"],
        ),
        # Remote GitHub server
        MCPToolset(
            connection_params=StreamableHTTPConnectionParams(
                url="https://api.githubcopilot.com/mcp/",
                headers={"Authorization": "Bearer " + os.environ["GITHUB_TOKEN"]},
            ),
        ),
    ],
)
```

The LLM sees all the tools from both servers in a single flat list and can combine them freely within a single conversation.

## Exposing ADK tools as an MCP server

The second integration pattern is the reverse direction. You have tool functions built with ADK, and you want to make them available to any MCP client, not just ADK agents. This is useful when other teams or frameworks in your organization need access to the same tools.

ADK provides a conversion utility, `adk_to_mcp_tool_type`, that translates ADK tool definitions into MCP-compatible schemas. You then wrap these inside a standard MCP server built with the `mcp` Python library.

### Building the MCP server

Here is a complete example. We will create a simple ADK tool that checks the health of a set of service endpoints, then expose it through an MCP server.

```python
# health_check_mcp_server.py
import asyncio
import json
from mcp import types as mcp_types
from mcp.server.lowlevel import Server, NotificationOptions
from mcp.server.models import InitializationOptions
import mcp.server.stdio

from google.adk.tools.function_tool import FunctionTool
from google.adk.tools.mcp_tool.conversion_utils import adk_to_mcp_tool_type


def check_service_health(service_name: str) -> dict:
    """Checks the health status of a named service."""
    # In a real application, this would ping the actual service
    health_data = {
        "payments": {"status": "healthy", "latency_ms": 45, "uptime": "99.97%"},
        "inventory": {"status": "degraded", "latency_ms": 320, "uptime": "98.5%"},
        "auth": {"status": "healthy", "latency_ms": 12, "uptime": "99.99%"},
    }
    result = health_data.get(
        service_name.lower(),
        {"status": "unknown", "error": f"No service found with name '{service_name}'"}
    )
    result["service"] = service_name
    return result


# Wrap the Python function as an ADK FunctionTool
health_tool = FunctionTool(check_service_health)

# Create the MCP server
app = Server("health-check-server")


@app.list_tools()
async def list_tools() -> list[mcp_types.Tool]:
    """Advertise our ADK tool in MCP format."""
    return [adk_to_mcp_tool_type(health_tool)]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[mcp_types.TextContent]:
    """Route incoming MCP tool calls to the ADK tool."""
    if name == health_tool.name:
        result = await health_tool.run_async(args=arguments, tool_context=None)
        return [mcp_types.TextContent(type="text", text=json.dumps(result, indent=2))]
    return [mcp_types.TextContent(
        type="text",
        text=json.dumps({"error": f"Unknown tool: {name}"})
    )]


async def run_server():
    async with mcp.server.stdio.stdio_server() as (reader, writer):
        await app.run(
            reader, writer,
            InitializationOptions(
                server_name=app.name,
                server_version="0.1.0",
                capabilities=app.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(run_server())
```

The `adk_to_mcp_tool_type(health_tool)` call reads the function signature, docstring, and type hints from the ADK `FunctionTool` and converts them into the MCP `Tool` schema that clients expect. The `call_tool` handler receives calls from any MCP client, executes the underlying ADK tool, and returns the result in MCP format.

Note that `tool_context` is `None` when running outside of a full ADK `Runner` invocation. If your tool relies on features from `ToolContext,` such as session state or artifacts, you will need additional handling to provide that context.

### Testing with an ADK agent

Now we can test this server by connecting an ADK agent to it as a client. The agent treats our custom MCP server exactly like any other MCP server.

```python
# agent.py
import os
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters

# Get path relative to this agent.py file
_AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
MCP_SERVER_PATH = os.path.join(_AGENT_DIR, "health_check_mcp_server.py")

root_agent = LlmAgent(
    model="gemini-2.0-flash",
    name="ops_assistant",
    instruction="You are an operations assistant. Check the health of services when asked.",
    tools=[
        McpToolset(
            connection_params=StdioConnectionParams(
                server_params=StdioServerParameters(
                    command="python",
                    args=[MCP_SERVER_PATH],
                ),
                timeout=60,
            ),
        )
    ],
)
```

When this agent runs and a user asks "How is the payments service doing?", the LLM will invoke the `check_service_health` tool through the MCP protocol, and the server will execute the ADK tool function and return the health data.

```shell
> adk run .\mcp_agent\
Running agent ops_assistant, type exit to exit.
[user]: How is the payments service doing?

[ops_assistant]: The payments service is healthy with a latency of 45ms and uptime of 99.97%.
```

### Using FastMCP for simpler server creation

For quick server development, you can use `FastMCP`, which ADK leverages internally. With FastMCP, you decorate your tool functions directly and skip the boilerplate of manually implementing `list_tools` and `call_tool` handlers.

```python
# fast_mcp_server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("weather-service")

@mcp.tool()
def get_current_temperature(city: str) -> str:
    """Gets the current temperature for a given city."""
    # Simulated data
    temps = {"london": "14°C", "tokyo": "22°C", "new york": "18°C", "mumbai": "32°C"}
    return temps.get(city.lower(), f"No data available for {city}")

@mcp.tool()
def get_weather_forecast(city: str, days: int = 3) -> str:
    """Gets a weather forecast for a city for the specified number of days."""
    return f"Forecast for {city} over {days} days: Mostly sunny with occasional clouds."

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

This FastMCP server can be consumed by any ADK agent using `StdioConnectionParams` pointing to `python3 fast_mcp_server.py`. For remote deployment, you can switch the transport to Streamable HTTP and run the server behind an ASGI server such as `Uvicorn`.

```python
# remote_fast_mcp_server.py
import uvicorn
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("weather-service")

@mcp.tool()
def get_current_temperature(city: str) -> str:
    """Gets the current temperature for a given city."""
    # Simulated data
    temps = {"london": "14°C", "tokyo": "22°C", "new york": "18°C", "mumbai": "32°C"}
    return temps.get(city.lower(), f"No data available for {city}")

@mcp.tool()
def get_weather_forecast(city: str, days: int = 3) -> str:
    """Gets a weather forecast for a city for the specified number of days."""
    return f"Forecast for {city} over {days} days: Mostly sunny with occasional clouds."

app = mcp.streamable_http_app()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3000)
```

An ADK agent then connects using `StreamableHTTPConnectionParams`.

```python
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool import MCPToolset, StreamableHTTPConnectionParams

root_agent = LlmAgent(
    model="gemini-2.0-flash",
    name="weather_agent",
    instruction="Provide weather information when asked.",
    tools=[
        MCPToolset(
            connection_params=StreamableHTTPConnectionParams(
                url="http://localhost:3000/mcp",
            ),
        )
    ],
)
```

```shell
> adk run .\mcp_agent\  
Running agent weather_agent, type exit to exit.

[user]: how is weather in Bengaluru?

[weather_agent]: I am sorry, I cannot fulfill this request. I do not have the weather information for Bengaluru.

[user]: how is weather in london?   

[weather_agent]: The current temperature in London is 14°C.
```

## Key considerations

There are several important points to keep in mind when working with MCP tools in ADK.

### Statefulness

MCP establishes stateful, persistent connections between client and server. This is different from typical stateless REST APIs and has implications for scaling and deployment. When deploying remote MCP servers, you need to think about session affinity, load balancing, and connection pooling. The `McpToolset` manages this connection lifecycle for you within the agent process.

### Async nature

Both ADK and the MCP Python library are built on Python's `asyncio`. Tool implementations and server handlers should generally be async functions. The `McpToolset` handles the async communication transparently, but if you are building custom MCP servers, your tool handlers should follow async patterns.

### Deployment considerations

When deploying ADK agents with MCP tools to production environments like Cloud Run or Vertex AI Agent Engine, the agent and `McpToolset` must be defined synchronously in your `agent.py` file. While `adk web` allows for asynchronous agent creation, deployment environments require synchronous instantiation.

For Stdio-based MCP servers, the server binary or script must be included in the deployment container since the agent spawns it as a subprocess. For remote servers using SSE or Streamable HTTP, you deploy the MCP server independently and configure your agent with the server's URL.

A production deployment checklist for agents using MCP tools includes:

- Ensuring MCP server binaries are bundled in the container image for Stdio transports
- Configuring health checks for remote MCP server connections
- Setting appropriate timeouts on `SseConnectionParams` or `StreamableHTTPConnectionParams`
- Implementing authentication headers for remote servers, and monitoring connection stability.

### Pre-built MCP tools

ADK offers a growing catalog of pre-built MCP tool integrations for popular services. These include integrations with Atlassian (Jira and Confluence), Google Cloud services via the API Registry, and generative media services such as Imagen and Veo. You can find the full list in the ADK documentation under Tools and Integrations. Using a prebuilt integration is as simple as adding the appropriate `McpToolset` with the correct connection parameters, as we demonstrated earlier with the filesystem and Google Maps examples.

## Putting it all together

Here is a complete example that combines consuming an MCP server with tool filtering and session state tracking. The agent uses a local filesystem MCP server to read project notes, while also maintaining conversation context through ADK's session state.

```python
import asyncio
import os
from google.adk.agents import LlmAgent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.adk.tools import ToolContext
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters
from google.genai.types import Content, Part


def summarize_findings(summary: str, tool_context: ToolContext) -> dict:
    """Records a summary of findings from the file research."""
    summaries = tool_context.state.get("research_summaries", [])
    summaries.append(summary)
    tool_context.state["research_summaries"] = summaries
    tool_context.state["total_summaries"] = len(summaries)
    return {"status": "recorded", "total_summaries": len(summaries)}


NOTES_DIR = os.path.expanduser("~/project-notes")

research_agent = LlmAgent(
    model="gemini-2.0-flash",
    name="ResearchAgent",
    instruction="""You are a research assistant. 
Use file tools to read notes from the project directory. 
After reading relevant files, use the summarize_findings tool 
to record your analysis.
Total summaries recorded so far: {total_summaries?}""",
    tools=[
        McpToolset(
            connection_params=StdioConnectionParams(
                server_params=StdioServerParameters(
                    command="npx",
                    args=[
                        "-y",
                        "@modelcontextprotocol/server-filesystem",
                        os.path.abspath(NOTES_DIR),
                    ],
                ),
            ),
            tool_filter=["read_file", "list_directory", "search_files"],
        ),
        summarize_findings,
    ],
    output_key="last_response",
)


async def main():
    session_service = InMemorySessionService()
    runner = Runner(
        agent=research_agent,
        app_name="research_app",
        session_service=session_service,
    )

    session = await session_service.create_session(
        app_name="research_app",
        user_id="researcher_1",
        state={"total_summaries": 0},
    )

    # Turn 1: Explore available files
    msg1 = Content(
        parts=[Part(text="What project notes do we have available?")],
        role="user",
    )
    async for event in runner.run_async(
        user_id="researcher_1", session_id=session.id, new_message=msg1
    ):
        if event.is_final_response() and event.content:
            print(f"Agent: {event.content.parts[0].text}")

    # Turn 2: Read and summarize a specific file
    msg2 = Content(
        parts=[Part(text="Read the architecture.md file and summarize the key decisions.")],
        role="user",
    )
    async for event in runner.run_async(
        user_id="researcher_1", session_id=session.id, new_message=msg2
    ):
        if event.is_final_response() and event.content:
            print(f"Agent: {event.content.parts[0].text}")

    # Check state
    s = await session_service.get_session(
        app_name="research_app", user_id="researcher_1", session_id=session.id
    )
    print(f"State: total_summaries={s.state.get('total_summaries')}")
    print(f"State: research_summaries={s.state.get('research_summaries')}")


asyncio.run(main())
```

This example demonstrates a common pattern in real applications:

- Combining external tools from an MCP server with custom ADK tools that maintain state. 
- The filesystem tools handle file operations
- The `summarize_findings` function records analysis in the session state using `ToolContext`
- The agent's instruction template dynamically reflects the current summary count.

Understanding how to consume and expose MCP tools with ADK opens up a broad ecosystem of reusable capabilities for your agents. The `McpToolset` class makes it straightforward to connect to any MCP-compliant server, regardless of the transport mechanism, while ADK's conversion utilities let you share your tools with the wider MCP ecosystem. I recommend starting with a community MCP server, such as the Filesystem or GitHub examples, to get comfortable with the pattern, then build your own servers for custom capabilities.

