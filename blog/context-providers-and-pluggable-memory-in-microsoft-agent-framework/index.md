# Context providers and pluggable memory in Microsoft Agent Framework


In the [streaming and multi-turn article](/blog/streaming-and-multi-turn-conversations-in-microsoft-agent-framework/), we used `AgentSession` to give an agent continuity across calls within a single Python process. That works for a CLI script or a one-shot evaluation, but it does not work for an agent that has to remember a returning user tomorrow morning, or for one that needs to recall a fact buried in a conversation from three weeks ago. Both cases require different abstractions: storage that lives outside the process and a way to wire it into the agent without rewriting the agent.

Microsoft Agent Framework (MAF) handles this through *context providers*. A context provider is a small object that the agent calls before every run (`before_run`) and after every run (`after_run`). During those hooks, it can load relevant context into the conversation, save things it learned, or do both. The same abstraction is used for raw conversation history, semantic memory, search-grounded recall, and any custom store you want to write yourself.

In this article, we will look at the two flavors of providers that ship in MAF, walk through the built-in and integration providers, and write a custom one to make the moving parts concrete.

A quick environment note before the first example: Using `OpenAIChatClient` with an Azure OpenAI deployment requires either the `azure_endpoint=...` argument or the `AZURE_OPENAI_ENDPOINT` environment variable; without either, the constructor raises an exception. Set it in your `.env` alongside the model variables.

## History and context

MAF ships two related base classes, and the distinction matters. `HistoryProvider` is for conversation history: every input and output in the agent's conversation is stored verbatim. `ContextProvider` is for everything else, including semantic memory, retrieval-augmented context, persona facts, working notes, and any other source of input you want the agent to see at run time.

`HistoryProvider` subclasses implement two simple methods: `get_messages()` (called by the framework before the run, to load any prior conversation) and `save_messages()` (called after the run, to persist the new turns). The framework's default `before_run`/`after_run` handles the rest. If your goal is "store every message in Postgres" or "write the conversation to a file," a `HistoryProvider` is the right fit.

`ContextProvider` subclasses implement `before_run()` and `after_run()` directly. They have access to a richer `SessionContext` object that lets them add to the system instructions, append context messages, register middleware, or expose tools to the model. If your goal is "search a vector store for relevant prior memories and prepend them to the prompt," a `ContextProvider` is the right fit.

Most non-trivial agents use both a history provider to durably persist the conversation and one or more context providers to inject the right knowledge into each turn. Both types live in the same `context_providers=[...]` parameter during agent construction.

## FileHistoryProvider

The simplest non-trivial provider is `FileHistoryProvider`, which writes the conversation to a JSON file on disk. It is not what you would use in production, but it is exactly the right thing for a CLI tool or a development loop where you want the conversation to survive a process restart.

```python
import asyncio
import os

from agent_framework import AgentSession, FileHistoryProvider
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
    chat_client = OpenAIChatClient(model=model, credential=DefaultAzureCredential())

    history = FileHistoryProvider(storage_path="./conversations/alice.json")

    agent = chat_client.as_agent(
        name="Assistant",
        instructions="You are a friendly assistant who remembers past conversations.",
        context_providers=[history],
    )

    session = AgentSession(session_id="alice")

    result = await agent.run("My favorite color is teal.", session=session)
    print(result.text)


asyncio.run(main())
```

A few things worth pulling out. The provider is constructed with a path on disk; nothing else. It is passed to `as_agent` via `context_providers=[...]`, which is the same parameter every other provider uses. Inside the run, the framework asks the provider to load any messages associated with the session ID, hands them to the agent as part of the conversation, runs the model, and then calls the provider's `after_run` to save the new turns back.

Run the script once, and the agent learns the favorite color. Run it again the next day with the same `session_id="alice"`, and the agent will remember. The conversation file on disk is the source of truth; the in-memory `AgentSession` becomes a per-process cache.

A few useful flags on `FileHistoryProvider` (and on every `HistoryProvider` subclass) are worth knowing about. `load_messages=False` turns it into a write-only audit log. `store_outputs=False` records inputs but not the agent's replies, useful when you want the inputs for evaluation but the outputs are noise. `skip_excluded=True` honors message exclusion rules that other providers may set. The defaults are good for the obvious case of "remember everything."

For anything beyond development, swap `FileHistoryProvider` for `CosmosHistoryProvider` (in `agent_framework.azure`) or `RedisHistoryProvider` (in `agent_framework.redis`). The interface is the same; only the constructor changes.

## Mem0: semantic memory

`FileHistoryProvider` and its cousins store messages verbatim. They are fine when the agent's job is "continue a conversation," but they do nothing to *summarize*, *index*, or *recall* facts across many conversations. For that, you want a memory layer that builds a semantic index over what was said and surfaces only the relevant bits at run time.

[Mem0](https://github.com/mem0ai/mem0) is one such layer; MAF ships an integration in `agent_framework.mem0`.

```python
from agent_framework.mem0 import Mem0ContextProvider

memory = Mem0ContextProvider(
    api_key=os.environ["MEM0_API_KEY"],
    user_id="alice",
)

agent = chat_client.as_agent(
    name="Assistant",
    instructions="You are a friendly assistant who remembers past conversations.",
    context_providers=[memory],
)

session = AgentSession(session_id="alice")
result = await agent.run("Recommend a movie. Use what you remember about my taste.", session=session)
print(result.text)
```

The shape is identical to the `FileHistoryProvider` case. The behavior is different. Before each run, Mem0 searches its store for memories relevant to the current input and prepends them to the conversation as context messages. After each run, it extracts new memorable facts from the conversation and stores them. The agent's prompt does not need to grow with the size of the user's history; only the *relevant* parts get pulled in at each turn.

The `user_id` parameter is what scopes memory to a specific person. Pass different IDs for different users, and each gets their own memory store. The optional `agent_id` and `application_id` further partition the store, which is useful when one Mem0 backend serves several agents or apps.

Because Mem0 makes a network call before and after every run, it adds latency. For interactive agents, the round trip is usually cheap; for high-throughput pipelines, measure and consider whether memory should be optional or applied in batches.

## Redis with vector search

If you want a memory layer that you operate yourself rather than a managed service, `RedisContextProvider` (from `agent_framework.redis`) gives you a similar shape using Redis with a vector index.

```python
from agent_framework.redis import RedisContextProvider

memory = RedisContextProvider(
    redis_url="redis://localhost:6379",
    index_name="alice_memories",
    user_id="alice",
)
```

The provider creates (or reuses) a Redis search index, indexes embeddings of past memories, and, at runtime, pulls back the top matches for the current input. Settings like `vector_algorithm`, `vector_distance_metric`, and the embedding model are passed as optional parameters; the defaults are sensible.

While Mem0 owns the embedding strategy and storage, Redis provides both. That is a feature for teams that already operate Redis and want memory to live alongside the rest of their state, and it is a tax for teams that do not. Mem0, Redis, and `AzureAISearchContextProvider` (also in `agent_framework.azure`) are interchangeable from the agent's perspective; the choice is operational.

## Writing your own context provider

The interesting case is when none of the shipped providers fit. Maybe your "memory" is the user's open tickets in your CRM. Maybe it is a set of internal documents indexed by a search engine you already operate. Maybe it is a tiny in-process dictionary of persona facts that your customer-support agent looks up by user ID. Subclassing `ContextProvider` lets you express any of these in the same shape.

Here is a minimal example: a provider that injects the current user's display name and time zone before each run.

```python
from typing import Any
from agent_framework import ContextProvider, SessionContext, AgentSession, SupportsAgentRun

class UserProfileProvider(ContextProvider):
    def __init__(self, user_directory: dict[str, dict[str, str]]) -> None:
        super().__init__()
        self.source_id = "user_profile"
        self.user_directory = user_directory

    async def before_run(
        self,
        *,
        agent: SupportsAgentRun,
        session: AgentSession,
        context: SessionContext,
        state: dict[str, Any],
    ) -> None:
        profile = self.user_directory.get(session.session_id)
        if not profile:
            return
        context.extend_instructions(
            f"You are talking to {profile['name']}, who lives in the {profile['timezone']} timezone."
        )

    async def after_run(
        self,
        *,
        agent: SupportsAgentRun,
        session: AgentSession,
        context: SessionContext,
        state: dict[str, Any],
    ) -> None:
        # Nothing to persist; this provider is read-only.
        return
```

A few things worth noticing. `source_id` is the provider's identity during the run; the framework uses it to attribute messages that this provider added, so other providers can filter them out. Inside `before_run`, the provider has access to a `SessionContext` whose `extend_instructions` adds to the system prompt for the current run, `extend_messages` appends conversation messages, `extend_tools` exposes additional tools to the model, and `extend_middleware` registers middleware just for this run. The `state` dictionary is a per-run scratchpad shared with `after_run` and useful for measuring or logging across the two hooks.

Plug it in the same way as any other provider:

```python
profiles = {
    "alice": {"name": "Alice Chen", "timezone": "PT"},
    "bob":   {"name": "Bob Singh",   "timezone": "IST"},
}

agent = chat_client.as_agent(
    name="Assistant",
    instructions="You are a helpful assistant.",
    context_providers=[UserProfileProvider(profiles)],
)

result = await agent.run(
    "What time would be a good time to schedule a meeting?",
    session=AgentSession(session_id="bob"),
)
```

The same pattern scales up. A provider that calls a vector store, a SQL database, a fancy retrieval pipeline, or a remote service all looks like this; the only difference is what `before_run` reads and what `after_run` writes.

## Composing multiple providers

A real agent often uses several providers at once: a history provider for the raw conversation, a memory provider for cross-session recall, and one or more application-specific providers for things like user profiles or org-wide facts.

```python
agent = chat_client.as_agent(
    name="Assistant",
    instructions="You are a helpful assistant.",
    context_providers=[
        FileHistoryProvider(storage_path="./conversations/alice.json"),
        Mem0ContextProvider(api_key=os.environ["MEM0_API_KEY"], user_id="alice"),
        UserProfileProvider(profiles),
    ],
)
```

The framework runs them in order. `before_run` fires on each provider in the order they were registered; `after_run` fires in reverse, so a provider that wraps the run can clean up after the providers it wraps. The `source_id` on each provider lets you tell whose context is whose: when you are debugging a confused-looking prompt, the messages are attributed by source, so you can see which provider injected what.

Two practical rules. First, keep the list short. Every provider runs on every turn, and every turn is interactive latency. Three or four providers are comfortable; ten is a smell. Second, give each provider a meaningful `source_id` (Mem0 and Redis default to `"mem0"`/`"redis"`, but in a multi-Mem0 setup or in your own subclasses, set it explicitly). The ID is the only thing that distinguishes two providers in trace output.

A few things to plan for once memory becomes a moving part.

Privacy and PII drift across providers without warning. A `FileHistoryProvider` writes everything verbatim; a Mem0 provider extracts and stores semantic facts about the user; a search-grounded provider may pull in fragments of someone else's documents. Each layer has its own retention story, and they do not coordinate. If your application has compliance requirements, document them per provider and audit them as a set.

Context windows fill up faster than they used to. With three providers each adding a few messages or a paragraph of instructions, the prompt for an "empty" conversation may already be hundreds of tokens. Test the prompt size after wiring providers in, and use the `CompactionProvider` (also shipped with MAF) for long-running conversations that need summarization rather than truncation.

Attribution matters in failure modes. When the agent says something wrong, the question "where did this come from" is harder to answer with several providers than with a single provider. The `source_id` system gives you the trace; use it. For high-stakes domains, prefer a small set of explicitly-named providers over an opaque pile of retrieval.

Finally, providers are stateful objects. Constructing them is sometimes expensive (an embedding model load, a Redis index creation, an API key check). Construct once at startup and pass the same instance to every agent that needs it; do not create new ones on demand unless they are designed to do so.

## Summary

`HistoryProvider` is for raw conversation persistence; `ContextProvider` is for everything else you want the agent to see. The shipped providers (`FileHistoryProvider`, `CosmosHistoryProvider`, `Mem0ContextProvider`, `RedisContextProvider`, `RedisHistoryProvider`, `AzureAISearchContextProvider`, `FoundryMemoryProvider`) cover most production patterns, and a custom subclass with `before_run`/`after_run` covers everything else. Compose providers via `context_providers=[...]`, keep the list small, and use `source_id` for attribution.

