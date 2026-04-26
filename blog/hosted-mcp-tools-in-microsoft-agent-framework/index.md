# Hosted MCP tools in Microsoft Agent Framework


In the [previous article](/blog/local-mcp-tools-in-microsoft-agent-framework/), we wired a Microsoft Agent Framework (MAF) agent to a local MCP server. The agent's process owned the connection: a subprocess for stdio servers, an HTTP client for remote ones, and, in either case, the application code was responsible for the lifecycle, authentication, and networking. That is fine when you control the deployment, but it shifts many operational concerns into the application layer.

When the agent runs inside Microsoft Foundry, there is a second option. Foundry Agent Service can hold the MCP connection on the agent's behalf. Your application code attaches a tool reference to the agent; Foundry does the actual connecting, calling, and credential handling on the server side. This is what MAF calls a *hosted* MCP tool, and it changes the deployment story in ways that are worth understanding before you choose a side.

In this article, we will look at the hosted MCP pattern, what shifts when Foundry takes over the connection, and how the day-to-day code compares with what we wrote in the local case.

## Hosted vs local: who holds the connection

The user-facing model is identical. The agent sees a list of tools with names, descriptions, and parameter schemas, and it calls them the same way it calls a function tool. Everything you learned about local MCP, the importance of clear descriptions, the latency considerations, and the trust assumptions applies just as much when the server is hosted.

The deployment model is what changes. Concretely:

- *Who runs the MCP client?* In the local case, the MAF process is the MCP client. In the hosted case, Foundry is.
- *Where do credentials live?* In the local case, your application holds them, typically in environment variables. In the hosted case, Foundry holds them in a managed secret store you configure once.
- *Where does the network hop happen?* In the local case, the round trip goes from your application to the MCP server and back. In the hosted case, the round-trip runs from Foundry to the MCP server and back, and the result is delivered to your application as part of the agent run.
- *Who controls availability?* In the local case, your application controls which servers are reachable. In the hosted case, Foundry administrators control which servers are registered, often with a per-tenant approval gate.

These differences add up to a meaningful trade-off. Hosted MCP is the right answer when you want centralized governance, when credentials must not leave the platform, or when you want a single MCP server registered once and used by many agents. Local MCP is the right answer when you want full control of the deployment, when the server runs as a subprocess of the agent application itself, or when you cannot put your tool dependencies behind a third-party platform.

## A first hosted MCP tool

The hosted path requires a Foundry-backed agent, which means using `AzureAIAgentClient`, the same client we covered in the [client comparison article](/blog/choosing-the-right-microsoft-agent-framework-client/) and the [persistent agents article](/blog/building-persistent-ai-agents-with-microsoft-agent-framework-and-microsoft-foundry/). The hosted MCP tool itself is a `HostedMCPTool`.

```python
import asyncio
import os

from agent_framework import HostedMCPTool
from agent_framework.azure import AzureAIAgentClient
from azure.identity.aio import AzureCliCredential

from dotenv import load_dotenv

load_dotenv()

async def main():
    async with (
        AzureCliCredential() as credential,
        AzureAIAgentClient(
            project_endpoint=os.environ["AZURE_AI_PROJECT_ENDPOINT"],
            model_deployment_name=os.environ["AZURE_AI_FOUNDRY_MODEL_DEPLOYMENT_NAME"],
            credential=credential,
        ) as client,
    ):
        github_tool = HostedMCPTool(
            name="github",
            url="https://your-github-mcp-endpoint.example.com/mcp",
        )

        async with client.create_agent(
            name="GitHubAgent",
            instructions="Use the available tools to answer questions about repositories.",
            tools=[github_tool],
        ) as agent:
            result = await agent.run("How many open issues does microsoft/agent-framework have?")
            print(result.text)


asyncio.run(main())
```

The shape mirrors the local case. The agent receives `tools = [github_tool]`, and from that point on, the run is identical: the model sees the catalog, picks a tool, the tool runs, and the result comes back. What is different is who runs the MCP client at the point of the call. In this script, your process never opens an HTTP connection to `your-github-mcp-endpoint.example.com`. Foundry does.

A consequence: if the MCP endpoint is private or requires authentication, the credentials are configured once in Foundry rather than in every agent application that uses the server. Code that uses the agent does not need to know how the MCP server authenticates.

## Where the credentials live

The most consequential shift between local and hosted MCP is the location of the secret. With an `MCPStreamableHTTPTool` in the local case, the API token is stored in your environment variables and passed as a header on every call. With a `HostedMCPTool`, the platform holds the credentials, and your code never sees them.

For situations where the application *must* pass a per-call header, the hosted tool typically supports a passthrough mechanism, often called caller-supplied or "user" headers, that gets forwarded with the MCP call but is not stored in Foundry. This is useful for tenant identifiers, request correlation IDs, or short-lived per-user tokens that the calling application already has on hand.

```python
github_tool = HostedMCPTool(
    name="github",
    url="https://your-github-mcp-endpoint.example.com/mcp",
    headers={"X-Tenant-Id": "contoso"},
)
```

The shape is the same as the local HTTP case, but the role is different. A long-lived service credential (`Authorization: Bearer ...`) belongs in Foundry's secret store. Per-call request metadata can stay in code. Mixing them up, putting the bearer token in `headers`, defeats the point of hosting; putting tenant data in Foundry secrets makes per-tenant routing harder.

## Tool selection and approvals

Foundry treats hosted MCP servers as a catalog. Administrators register servers, agents reference them, and the platform enforces what each agent is allowed to use. This catalog is where Foundry's governance story lives, and it changes the calculus on tool filtering.

Allow-listing the specific tools your agent should see still matters and works the same way as in the local case:

```python
github_tool = HostedMCPTool(
    name="github",
    url="https://your-github-mcp-endpoint.example.com/mcp",
    allowed_tools=["search_issues", "create_issue", "list_repositories"],
)
```

In addition, individual tools can be marked as requiring approval before invocation. If a hosted tool is configured for approval, the agent run pauses when the model decides to call it; an approver, typically a human via Foundry's admin surface or via your application's own approval flow, has to sign off before the call goes through. The exact wiring of approvals is the topic of a future article in this series; for now, the key point is that hosted MCP plays naturally with that flow because Foundry already mediates the call.

## When to choose hosted vs local

Two questions quickly separate the two paths.

*Does the agent run inside Foundry?* Hosted MCP is available only when the agent itself is hosted by the Foundry Agent Service via `AzureAIAgentClient`. If your agent runs as a chat-client agent (`OpenAIChatClient` and friends) or anywhere outside Foundry, the local MCP path is the only option.

*Who should hold the credentials?* If the answer is "the platform, not the application," hosted is the natural fit. If the answer is "my application has its own secret-management story, and I want to keep MCP credentials there," local is cleaner.

A third, smaller consideration: latency. Hosted MCP tends to be lower-variance because Foundry runs the MCP client in a controlled environment close to the model; local MCP varies with your application's network path. For most workloads, this difference is invisible. For high-fan-out agents that call MCP tools many times per turn, it can matter, and the only way to know is to measure both paths against your specific server.

For most teams running on Foundry, hosted MCP is the default path, with local MCP reserved for tools the platform team has not yet onboarded or for cases where the server needs to run inside the application's process.

## Pitfalls

A few things that catch people out when moving from local to hosted MCP.

Errors look different. With a local stdio server, a misconfigured command produces a familiar Python `FileNotFoundError`. With a hosted server, the same problem results in a Foundry-side error that surfaces during the run as an opaque tool failure. When debugging hosted MCP, the first place to look is Foundry's own logs and traces, not your application's stack trace.

Regional and tenant scope matters. A hosted MCP server is registered to a Foundry project; an agent can only use servers registered in that project. If you have agents across multiple projects or regions, expect to register the server in each. This is usually fine for governance reasons, but it surprises teams that expect a single global MCP catalog.

Authentication failures during tool invocation become an admin-side problem rather than a deploy-side problem. With local MCP, you fix the env var and redeploy. With hosted MCP, you fix the credential in Foundry's secret store, and the next run picks it up. The faster path is sometimes also the harder one to discover, especially when more than one team is involved.

Finally, hosted MCP can mask code-only debuggability. When a tool call fails, the local case lets you `pdb` straight into the call; the hosted case puts a network and a service between your code and the failure. For tricky bugs in a tool, it is sometimes worth temporarily switching the same MCP server to the local pattern and reproducing the issue locally before fixing it for the hosted case.

## Summary

Hosted MCP is the same conceptual surface as local MCP, with the connection and the credentials moved into Foundry. Code-wise, it is a small change: the same `tools = [...]` parameter, with `HostedMCPTool` in place of `MCPStdioTool` or `MCPStreamableHTTPTool`. Operationally, it is a bigger change: swapping per-application configuration for per-platform configuration, with the trade-offs that come with it. Use it when your agent already runs in Foundry, and you want centralized governance over the tools it can access.

In the next article, we will turn the picture around. So far, we have used MAF as an MCP *client*: connecting to other people's MCP servers. MAF can also expose your own agent as an MCP server, which is how you publish a capability for other agents and frameworks to consume. We will look at how that works, what the agent looks like over the protocol, and where the boundaries between server and host responsibilities sit.

{{< notice "info" >}}
**Updated 26th April 2026 for breaking API changes.** Microsoft Agent Framework's Python package was reorganized after this article was first published. The method for constructing an agent in the chat client changed from `chat_client.create_agent(...)` to `chat_client.as_agent(...)`. The `Multiple tools` example has been updated to match. Other articles in this series also include changes to imports and constructors; see the [client comparison article](/blog/choosing-the-right-microsoft-agent-framework-client/) for the current set of clients and how to use them.
{{< /notice >}}

