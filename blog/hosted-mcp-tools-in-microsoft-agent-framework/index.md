# Hosted MCP tools in Microsoft Agent Framework


In the [previous article](/blog/local-mcp-tools-in-microsoft-agent-framework/), we wired a Microsoft Agent Framework (MAF) agent to a local MCP server. The agent's process owned the connection: a subprocess for stdio servers, an HTTP client for remote ones, and either way the application code was responsible for the lifecycle, the authentication, and the network. That works when you control the deployment, but it pushes a lot of operational concerns into the application layer.

When the agent runs against Microsoft Foundry, there is a second option. Foundry can hold the MCP connection on the agent's behalf, with the credentials and lifecycle managed inside the platform. Your code declares an MCP tool and attaches it to the agent; Foundry does the actual calling. This is what MAF calls a *hosted* MCP tool, and the API surface for it lives on `FoundryChatClient`.

In this article, we will look at the hosted MCP pattern, what shifts when Foundry takes over the connection, and how the day-to-day code compares with the local case.

## Hosted vs local: who holds the connection

The user-facing model is identical. The agent still sees a list of tools with names, descriptions, and parameter schemas, and it calls them the same way it calls a function tool. Everything you learned about local MCP, the importance of clear descriptions, the latency considerations, the trust assumptions, applies just as much when the server is hosted.

The deployment model is what changes. Concretely:

- *Who runs the MCP client.* In the local case, the MAF process is the MCP client. In the hosted case, Foundry is.
- *Where credentials live.* In the local case, your application holds them, typically in environment variables. In the hosted case, Foundry holds them, configured per project.
- *Where the network hop happens.* In the local case, the round trip goes from your application to the MCP server and back. In the hosted case, the round trip goes from Foundry to the MCP server and back, and the result reaches your application as part of the agent run.
- *Who controls availability.* In the local case, your application controls which servers are reachable. In the hosted case, the Foundry project controls it.

These add up to a meaningful trade-off. Hosted MCP fits when you want centralized governance, when the credentials must not leave the platform, or when you want one MCP server registered once and used by many agents. Local MCP fits when you want full control of the deployment, when the server runs as a subprocess of the agent application itself, or when you cannot put your tool dependencies behind Foundry.

## A first hosted MCP tool

The hosted path uses a Foundry-backed chat client (`FoundryChatClient`) and its `get_mcp_tool` helper. Construct the client, ask it for an MCP tool configuration, attach the result to the agent, and run.

```python
import asyncio
import os

from agent_framework.foundry import FoundryChatClient
from azure.identity.aio import AzureCliCredential

from dotenv import load_dotenv

load_dotenv()


async def main():
    async with (
        AzureCliCredential() as credential,
        FoundryChatClient(
            project_endpoint=os.environ["AZURE_AI_PROJECT_ENDPOINT"],
            model=os.environ["AZURE_AI_FOUNDRY_MODEL_DEPLOYMENT_NAME"],
            credential=credential,
        ) as chat_client,
    ):
        github_tool = chat_client.get_mcp_tool(
            name="github",
            url="https://your-github-mcp-endpoint.example.com/mcp",
            description="Search GitHub repositories and issues.",
        )

        agent = chat_client.as_agent(
            name="GitHubAgent",
            instructions="Use the available tools to answer questions about repositories.",
            tools=[github_tool],
        )

        result = await agent.run("How many open issues does microsoft/agent-framework have?")
        print(result.text)


asyncio.run(main())
```

A few things worth pulling out. `FoundryChatClient` is the same chat client you would use for any Foundry-deployed model; the only difference here is that we ask it to produce an MCP tool configuration before constructing the agent. `chat_client.get_mcp_tool(...)` returns a tool object that goes into `tools=[...]` exactly the same way a function tool or a local MCP tool would.

What is happening underneath: the `get_mcp_tool` call attaches the MCP server reference to the chat client's request. When the agent runs and the model decides to call a tool from that server, Foundry's responses API mediates the call. Your process never opens an HTTP connection to the MCP server; Foundry does.

If the MCP endpoint requires authentication, pass it via `headers=`:

```python
github_tool = chat_client.get_mcp_tool(
    name="github",
    url="https://your-github-mcp-endpoint.example.com/mcp",
    headers={"Authorization": f"Bearer {os.environ['GITHUB_MCP_TOKEN']}"},
)
```

For long-lived service credentials that should not live in your application, the `project_connection_id` form is preferable: register the server in Foundry once with its credentials, and reference the connection by id from your code.

```python
github_tool = chat_client.get_mcp_tool(
    name="github",
    project_connection_id="conn_abc123",
)
```

With this form, your application code never sees the credential, and rotating it does not require a redeploy. This is the form to reach for in production.

## Tool selection and approvals

Hosted MCP servers tend to expose more tools than any single agent should see. The `allowed_tools` parameter trims the catalog the model is offered.

```python
github_tool = chat_client.get_mcp_tool(
    name="github",
    url="https://your-github-mcp-endpoint.example.com/mcp",
    allowed_tools=["search_issues", "create_issue", "list_repositories"],
)
```

With this, the agent sees only those three tools, regardless of what else the server publishes. The pattern is the same advice we gave in the local-MCP case, with the same reasoning: smaller catalogs mean better selection, and an allow-list is the minimum bar for tools that have side effects.

The other parameter worth knowing about is `approval_mode`, which gates whether the model's tool calls are auto-invoked or paused for a human-in-the-loop decision. Three forms are accepted:

```python
# Auto-invoke every call.
github_tool = chat_client.get_mcp_tool(
    name="github",
    url="...",
    approval_mode="never_require",
)

# Pause for approval on every call.
github_tool = chat_client.get_mcp_tool(
    name="github",
    url="...",
    approval_mode="always_require",
)

# Require approval only for specific tools.
github_tool = chat_client.get_mcp_tool(
    name="github",
    url="...",
    approval_mode={"always_require": ["create_issue", "delete_issue"]},
)
```

The third form is the most useful in practice: read-only tools auto-invoke, destructive tools pause for approval. The agent run pauses with a `user_input_requests` entry on the response, and your application surfaces the request to a human (or to a different system) before resuming. The approval flow itself is the topic of a future article in this series, but the configuration that enables it is right here on the hosted MCP tool.

## When to choose hosted vs local

Two questions separate the two paths quickly.

*Where does your model live?* Hosted MCP requires a Foundry-deployed model accessed via `FoundryChatClient`. If your agent uses an Azure OpenAI deployment via `OpenAIChatClient` or runs anywhere else, the local MCP path is the option you have.

*Who should hold the credentials?* If the answer is "the platform, not the application," hosted is the natural fit. If the answer is "my application has its own secret-management story and I want to keep MCP credentials there," local is cleaner.

A third, smaller consideration: latency. Hosted MCP tends to be lower-variance because Foundry runs the MCP client in a controlled environment close to the model; local MCP varies with your application's network path. For most workloads this difference is invisible. For high-fan-out agents that call MCP tools many times per turn, it can matter, and the only way to know is to measure both paths against your specific server.

For most teams running on Foundry, hosted MCP is the default path, with local MCP reserved for tools the platform team has not yet onboarded or for cases where the server needs to run inside the application's process.

## Pitfalls

A few things that catch people out when moving from local to hosted MCP.

Errors look different. With a local stdio server, a misconfigured command produces a familiar Python `FileNotFoundError`. With a hosted server, the same problem produces a Foundry-side error that surfaces in the run as an opaque tool failure. When debugging hosted MCP, the first place to look is Foundry's own logs and traces, not your application's stack trace.

Project scope matters. A hosted MCP server is configured against a Foundry project; the agent that uses it must run against that same project. If you have agents in multiple projects, register or reference the server in each one. This is usually fine for governance reasons, but it surprises teams that expect a single global MCP catalog.

Authentication failures during tool invocation become an admin-side problem rather than a deploy-side problem. With local MCP, you fix the env var and redeploy. With hosted MCP, you fix the credential or the connection in Foundry and the next run picks it up. The faster path is sometimes also the harder one to discover, especially when more than one team is involved.

Static `headers=` is convenient for development, but for anything production-bound, use `project_connection_id` so credentials stay in Foundry. A bearer token in your application's environment defeats the point of hosting in the first place.

Finally, hosted MCP can mask code-only debuggability. When a tool call fails, the local case lets you `pdb` straight into the call; the hosted case puts a network and a service between your code and the failure. For tricky bugs in a tool, it is sometimes worth temporarily switching the same MCP server to the local pattern and reproducing the issue locally before fixing it for the hosted case.

## Summary

Hosted MCP is the same conceptual surface as local MCP, with the connection and the credentials moved into Foundry. Code-wise it is a small change: construct a `FoundryChatClient`, call `get_mcp_tool(...)` on it, attach the result to the agent. Operationally it is a bigger change, swapping per-application configuration for per-platform configuration, with the trade-offs that come with that swap. Use it when your agent already runs against a Foundry-deployed model and you want centralized governance of the tools it can reach.

In the next article, we will turn the picture around. So far we have used MAF as an MCP *client*: connecting to other people's MCP servers. MAF can also expose your own agent as an MCP server, which is how you publish a capability for other agents and frameworks to consume. We will look at how that works, what the agent looks like over the protocol, and where the boundaries between server and host responsibilities sit.

