# Choosing the right Microsoft Agent Framework client


If you have followed this series so far, you have already seen us use a handful of different clients to create agents in Microsoft Agent Framework (MAF). The [first hands-on article](/blog/building-ai-agents-with-microsoft-agent-framework/) used `AzureAIAgentClient`. The [persistent agents article](/blog/building-persistent-ai-agents-with-microsoft-agent-framework-and-microsoft-foundry/) used `AzureAIClient` and called it the recommended approach for Foundry persistence. The [workflow articles](/blog/sequential-workflows-in-microsoft-agent-framework/) switched to `AzureOpenAIChatClient`. That is a lot of clients for what looks, on the surface, like the same thing — "give me an agent that talks to a model."

The reason for the variety is simple. MAF deliberately separates *which model surface you talk to* from *how the agent and its conversation are managed*. Each client class targets a different combination of those two questions. Picking the right one up front saves a surprising amount of refactoring later, especially when you start adding hosted tools, adding persistence, or moving an agent to production.

In this article, we will pull all of these clients into one place, explain what each one is for, and build the same simple weather agent three different ways so you can see what changes and what stays the same.

## The mental model: client first, agent second

In MAF, an agent is a thin object. Almost everything that determines runtime behavior, which API surface you call, which tools you can attach, where conversation state lives, is decided by the client you give the agent.

When you write code like this:

```python
agent = chat_client.create_agent(
    name="WeatherAgent",
    instructions="You are a weatherman. Provide concise weather information.",
)
```

the `chat_client` on the left of `.create_agent` is doing more work than it looks. It carries:

- the model endpoint and the deployed model name
- the credential used to authenticate every call
- the API surface (Chat Completions, Responses, Foundry Agent Service)
- the set of hosted tools available to the agent
- the strategy for storing or persisting conversations

If you swap the client, all of those change at once. Swap the agent definition, and only the persona changes. That is why the rest of this article is organized around clients rather than agents.

Before you pick a client, three questions decide most of the answers for you.

**Where does your model live?** If you are deploying models through Microsoft Foundry, your client choice is between `AzureAIClient` (use the Foundry-deployed model directly) or `AzureAIAgentClient` (let Foundry Agent Service own the agent lifecycle). If you are pointing directly at Azure OpenAI, you want either `AzureAIClient` or `AzureOpenAIResponsesClient`. If you are calling OpenAI directly, you want `OpenAIChatClient` or `OpenAIResponsesClient`. If you are running a model locally, Ollama, LM Studio, [Foundry Local](/blog/local-model-serving-using-foundry-local/), you bring your own `IChatClient` and use the generic agent path.

**Do you need hosted tools?** Hosted tools like web search, file search, and code interpreter are tied to specific API surfaces. The Responses API path (Azure or OpenAI) gives you the richest set today. Chat Completions clients support fewer hosted tools, but they are stable and broadly available. The Foundry Agent Service exposes its own hosted tools through `AzureAIAgentClient`.

**Who owns conversation state?** If you want the platform to track threads, store messages, and survive process restarts, the Foundry Agent Service path (`AzureAIAgentClient`) is the natural fit. If your application owns the conversation in its own database and just wants a stateless model call, any of the chat or response clients will work. We will revisit this trade-off later in the series, when we cover `AgentThread` for multi-turn conversations.

These three questions almost always narrow you down to one or two choices. The sections below walk through each client in turn.

## AzureOpenAIChatClient

This is the client we have used in the [workflow articles](/blog/sequential-workflows-in-microsoft-agent-framework/). It targets the Azure OpenAI Chat Completions API, which is the most stable and widely available surface in the Azure OpenAI service. If your team has an Azure OpenAI resource, this is the safest starting point.

```python
import asyncio
from agent_framework.azure import AzureOpenAIChatClient
from azure.identity import DefaultAzureCredential

async def main():
    chat_client = AzureOpenAIChatClient(
        credential=DefaultAzureCredential(),
    )

    agent = chat_client.create_agent(
        name="WeatherAgent",
        instructions="You are a weatherman. Provide concise weather information.",
    )

    result = await agent.run("What should I wear in Bengaluru today?")
    print(result.text)

asyncio.run(main())
```

This client picks up the endpoint and model deployment from environment variables (`AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_CHAT_DEPLOYMENT_NAME`), the same as in the workflow articles. Hosted tools available here include function tools and a limited set of others; richer tools belong on the Responses path described next.

## AzureOpenAIResponsesClient

The Responses API is Azure OpenAI's newer surface. It exposes more hosted tools out of the box (web search, file search, code interpreter) and carries server-side conversation state via `previous_response_id`. The trade-off is that support for the Responses API is uneven across regions and model families. Check that the model you want is available in the region you need before committing.

```python
from agent_framework.azure import AzureOpenAIResponsesClient
from azure.identity import DefaultAzureCredential

chat_client = AzureOpenAIResponsesClient(
    credential=DefaultAzureCredential(),
)
```

If your agent needs a hosted file search or code interpreter, and you are on Azure OpenAI, this is the client to reach for. If you only need function tools, stay on Chat Completions.

## OpenAIChatClient and OpenAIResponsesClient

When you are calling OpenAI's API directly rather than going through Azure, MAF gives you the same Chat / Responses split.

```python
from agent_framework.openai import OpenAIChatClient

chat_client = OpenAIChatClient(api_key="<your-openai-api-key>")
```

The decision logic is identical to the Azure side. Use the responsesclient when you want richer hosted tools; use Chat Completions when you want stability and broader model coverage. Most enterprise teams will be on the Azure side; this path is more common for prototyping and for projects that have not gone through Azure procurement.

## AzureAIClient

This is the client we used in the [persistent agents article](/blog/building-persistent-ai-agents-with-microsoft-agent-framework-and-microsoft-foundry/). `AzureAIClient` connects to a Microsoft Foundry project and uses one of the models you have deployed there. It is the recommended path when you want Foundry to manage your model deployments — including governance, content filters, and shared quotas — but you do not want the full Foundry Agent Service runtime managing your agents.

```python
import asyncio
from agent_framework.azure import AzureAIClient
from azure.identity.aio import AzureCliCredential

async def main():
    async with AzureCliCredential() as credential:
        async with (
            AzureAIClient(
                credential=credential,
            ).create_agent(
                name="WeatherAgent",
                instructions="You are a weatherman. Provide concise weather information.",
            ) as agent,
        ):
            result = await agent.run("What should I wear in Austin, Texas?")
            print(result.text)

asyncio.run(main())
```

The endpoint and model are set by `AZURE_AI_PROJECT_ENDPOINT` and `AZURE_AI_FOUNDRY_MODEL_DEPLOYMENT_NAME`. Use this when you want Foundry's deployment story without taking on the Foundry Agent Service.

## AzureAIAgentClient

`AzureAIAgentClient` is what we used in our [first hands-on article](/blog/building-ai-agents-with-microsoft-agent-framework/). It is also what binds you to the Foundry Agent Service runtime: the agent itself becomes a Foundry resource, conversations are stored as Foundry threads, and the platform handles persistence, identity, and observability.

```python
import asyncio
from agent_framework.azure import AzureAIAgentClient
from azure.identity.aio import AzureCliCredential

async def main():
    async with (
        AzureCliCredential() as credential,
        AzureAIAgentClient(
            model_deployment_name="gpt-4o",
            credential=credential,
            agent_name="WeatherAgent",
        ).create_agent(
            instructions="You are a weatherman. Provide concise weather information.",
        ) as agent,
    ):
        result = await agent.run("What's the weather like in Bengaluru?")
        print(result.text)

asyncio.run(main())
```

This is the right choice when you want the platform to own the agent: long-running threads that survive process restarts, centralized identity and audit, and access to the broader Foundry tool catalog. The trade-off is coupling — your agent now depends on the Foundry Agent Service being available, and moving to a different runtime later is more work.

## FoundryChatClient

`FoundryChatClient` is a more recent addition that targets Foundry-deployed models through a Chat Completions-compatible interface. The shape of the call is similar to `AzureOpenAIChatClient`, but it points at a Foundry project rather than an Azure OpenAI resource. If you are starting a new Python project today and your models are in Foundry, the documentation now recommends this path over the Azure OpenAI-specific clients. Verify the import path against your installed SDK version before depending on it.

## ChatClientAgent

Everything above assumes a Microsoft- or OpenAI-hosted endpoint. For local models or third-party endpoints, MAF provides a generic path: implement (or import) a class that satisfies the `IChatClient` contract and pass it to a `ChatClientAgent`. This is the path for [Foundry Local](/blog/local-model-serving-using-foundry-local/), Ollama, LM Studio, vLLM, or any OpenAI-compatible local server. It is also the path for Anthropic models when you do not want to go through a hosted gateway.

The exact import surface here has been moving as MAF stabilizes across SDK versions, so I am keeping the example deliberately schematic. The structure to keep in mind is: any chat client that satisfies the protocol can be wrapped into an agent the same way the Azure and OpenAI clients are.

## A side-by-side cheat sheet

Here is the same information collapsed into one table you can paste into a design doc.

| Client | Model lives in | API surface | Hosted tools | Conversation state | Typical use |
|---|---|---|---|---|---|
| `AzureOpenAIChatClient` | Azure OpenAI | Chat Completions | Function + limited hosted | App-managed | Stable Azure default; the workhorse |
| `AzureOpenAIResponsesClient` | Azure OpenAI | Responses | Function + richer hosted | Server-side via `previous_response_id` | Need web/file/code-interpreter on Azure |
| `OpenAIChatClient` | OpenAI direct | Chat Completions | Function + limited hosted | App-managed | Prototyping outside Azure |
| `OpenAIResponsesClient` | OpenAI direct | Responses | Function + richer hosted | Server-side | Hosted tools on OpenAI direct |
| `AzureAIClient` | Microsoft Foundry deployment | Chat Completions-compatible | Function tools | App-managed | Foundry-deployed models without the Agent Service |
| `AzureAIAgentClient` | Foundry Agent Service | Foundry Agent runtime | Foundry tool catalog (incl. Code Interpreter) | Platform-managed (Foundry threads) | Persistent, platform-owned agents |
| `FoundryChatClient` | Microsoft Foundry deployment | Chat Completions-compatible | Function tools | App-managed | Newer recommended path for Foundry models |
| `ChatClientAgent` over a custom client | Anywhere | Whatever the client implements | Whatever the client exposes | App-managed | Local models, third-party providers |

The two columns that decide the most are *Conversation state* and *Hosted tools*. Once you have committed to where the state lives, the rest of your client choice is essentially fixed.

## The same agent, three ways

To make the differences concrete, here is the [weather agent from our second article](/blog/building-ai-agents-with-microsoft-agent-framework/) implemented across three clients. The agent's behavior — its instructions, its `get_weather` tool, and the prompt — is identical across all versions. Only the client changes.

```python
import os
import asyncio
from typing import Annotated
from pydantic import Field
from dotenv import load_dotenv

load_dotenv()

def get_weather(
    location: Annotated[str, Field(description="The location to get the weather for.")],
) -> str:
    import requests
    api_key = os.getenv("OPEN_WEATHERMAP_API_KEY")
    base_url = "http://api.openweathermap.org/data/2.5/weather"
    response = requests.get(f"{base_url}?q={location}&appid={api_key}&units=metric")
    data = response.json()
    if data.get("cod") != "404":
        return f"Temperature: {data['main']['temp']}°C"
    return "City not found"
```

Version A — `AzureOpenAIChatClient`. The most portable. No platform coupling, conversation lives in the application.

```python
from agent_framework.azure import AzureOpenAIChatClient
from azure.identity import DefaultAzureCredential

async def main_a():
    chat_client = AzureOpenAIChatClient(credential=DefaultAzureCredential())
    agent = chat_client.create_agent(
        name="WeatherAgent",
        instructions="You are a weatherman. Use tools to fetch current weather.",
        tools=[get_weather],
    )
    result = await agent.run("What should I wear in Austin, Texas?")
    print(result.text)
```

Version B — `AzureAIAgentClient`. Same agent, but now Foundry Agent Service owns the agent and its conversation threads. Notice the `async with` blocks because the client needs explicit lifecycle management.

```python
from agent_framework.azure import AzureAIAgentClient
from azure.identity.aio import AzureCliCredential

async def main_b():
    async with (
        AzureCliCredential() as credential,
        AzureAIAgentClient(
            model_deployment_name="gpt-4o",
            credential=credential,
            agent_name="WeatherAgent",
        ).create_agent(
            instructions="You are a weatherman. Use tools to fetch current weather.",
            tools=[get_weather],
        ) as agent,
    ):
        result = await agent.run("What should I wear in Austin, Texas?")
        print(result.text)
```

Version C — `AzureAIClient`. Foundry-deployed model, but the agent runtime is local — the same shape as Version A, just talking to a model in a Foundry project.

```python
from agent_framework.azure import AzureAIClient
from azure.identity.aio import AzureCliCredential

async def main_c():
    async with AzureCliCredential() as credential:
        async with (
            AzureAIClient(credential=credential).create_agent(
                name="WeatherAgent",
                instructions="You are a weatherman. Use tools to fetch current weather.",
                tools=get_weather,
            ) as agent,
        ):
            result = await agent.run("What should I wear in Austin, Texas?")
            print(result.text)
```

Three things are worth noticing across the three versions:

| What changed | Versions A, B, C |
|---|---|
| Agent definition (`name`, `instructions`, `tools`) | Identical |
| Import path | Different |
| Credential type | Sync `DefaultAzureCredential` in A; async `AzureCliCredential` in B and C |
| Lifecycle | Plain in A; `async with` blocks in B and C |
| Where the agent lives | Local in A and C; in Foundry Agent Service in B |
| Where conversation history lives | Application memory in A and C; Foundry threads in B |

The agent code does not change. The runtime characteristics — what survives a restart, where logs land, what tools you have access to — change a lot. That is the whole point of the client abstraction.

## Pitfalls

A few things that have caught people out.

The Responses API does not have feature parity with Chat Completions in every region or for every model family. If you swap from `AzureOpenAIChatClient` to `AzureOpenAIResponsesClient` and a model you were using stops responding, region or model availability is the first thing to check.

`AzureAIClient` and `AzureAIAgentClient` look similar, and you can recreate most of one from the other, but they have different conversation-state semantics. If you start with `AzureAIClient` and later migrate to `AzureAIAgentClient`, your existing application-managed conversation history does not move automatically — you have to bring it across into Foundry threads yourself.

Hosted tools are tied to clients. A `HostedCodeInterpreterTool` that works behind `AzureAIAgentClient` may need a different setup behind `AzureOpenAIResponsesClient`, and may not be available at all behind `AzureOpenAIChatClient`. When you change clients, audit your tool list.

Credentials matter more than they look. `azure.identity` (sync) and `azure.identity.aio` (async) export different classes with the same names. The clients in `agent_framework.azure` use the async ones for async work; mixing them silently leads to confusing errors deep inside an `async with`.

Finally, the import surface is still settling as MAF approaches stability. `AzureChatClient` from the early MAF preview is now `AzureOpenAIChatClient`. The newer `FoundryChatClient` is the recommended path for Foundry-deployed models, replacing some of what `AzureAIClient` used to do. When in doubt, pin your `agent-framework` version and check the imports against the version you are running.

## Wrap-up and what is next

The agents we have written throughout this series have been deceptively portable — the persona, the tools, and the workflow code carry over between clients with little trouble. What does not carry across is the runtime: where state lives, which hosted tools you can reach, and how the platform manages your agent. Picking the right client is, more than anything, picking the runtime profile you want for the agent.

In the next article, we will take this a step deeper and look at function tools. We have used them casually in earlier examples; now we will look at how MAF turns a Python function into a tool the model can call, what the schema generation actually does with your type hints, and how to handle errors and structured returns cleanly.

{{< notice "info" >}}
  Last updated: 26th April 2026
{{< /notice >}}

