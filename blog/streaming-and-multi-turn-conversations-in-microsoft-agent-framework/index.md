# Streaming and multi-turn conversations in Microsoft Agent Framework


Most of the agents we have built in this series so far have looked like this: create a client, create an agent, call `agent.run("a single question")`, print the result. That works for a quick demo, but production agents almost never run that way. They hold *conversations*, where each turn builds on what came before, and they often *stream* the response as it is generated so the user sees output immediately rather than waiting for the full reply.

In Microsoft Agent Framework (MAF), the answer to both is the same primitive: `AgentSession`. A session is the object that holds the running conversation, accumulates messages as they arrive, and lets you pass continuity from one turn to the next. Streaming and multi-turn are two aspects of the same idea, keeping the agent stateful across time.

In this article, we will look at how a single turn works without any session at all, introduce `AgentSession` as the way to keep state across turns, and then look at streaming responses and what changes when the agent is also calling tools mid-stream.

## A single turn

When you call `agent.run("Hello!")` on its own, MAF runs the call in isolation. The agent receives the message, decides what to do (call a tool, generate text, both), and returns a response. As soon as that call is complete, the conversation context goes away. The next call starts fresh.

This is fine for one-shot tasks, but it shows up immediately when the user expects continuity. Consider this:

```python
from agent_framework.openai import OpenAIChatClient
from azure.identity import DefaultAzureCredential
import asyncio
import os

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
    agent = chat_client.as_agent(
        name="Assistant",
        instructions="You are a friendly assistant.",
    )

    first = await agent.run("My name is Ravi.")
    print(first.text)

    second = await agent.run("What is my name?")
    print(second.text)

asyncio.run(main())
```

The second call has no idea what was said in the first. The agent responds with something polite and apologetic, but it does not know the user's name because the second run does not see the first run's message history. Every call is a fresh conversation.

That is the right default. State should be opt-in, not implicit; otherwise, concurrent runs of the same agent would overwrite each other's history. To make a conversation actually behave like a conversation, you bring in a session.

## AgentSession

`AgentSession` is the object that carries conversation state across turns. You create one, pass it to `agent.run(...)` on every call, and the session accumulates messages as the conversation progresses. The agent reads the session when deciding what to say, and writes new messages back into it.

```python
from agent_framework import AgentSession
from agent_framework.openai import OpenAIChatClient
from azure.identity import DefaultAzureCredential
import asyncio
import os

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
    agent = chat_client.as_agent(
        name="Assistant",
        instructions="You are a friendly assistant.",
    )

    session = AgentSession()

    first = await agent.run("My name is Ravi.", session=session)
    print(first.text)

    second = await agent.run("What is my name?", session=session)
    print(second.text)

asyncio.run(main())
```

The second call now sees the first one in the session's history, and the agent answers correctly. The session is just a parameter you pass through with no changes to the rest.

A few practical points. A session is not tied to a specific agent. You can route the same session through different agents in the same process, which is useful when you want a triage agent to hand off to a specialist while preserving the conversation. The session carries only the conversation; it does not carry tool definitions, so the receiving agent works with whatever tools it was constructed with.

You can inspect a session to see its accumulated messages, and you can construct one with messages already populated, which is useful when you are restoring a conversation from your application's database between requests. The exact API for inspection and serialization is the place where MAF is still settling, so check the version of `agent-framework` you have installed before depending on a specific shape.

The session you create with `AgentSession()` is an in-memory session. It lives as long as the Python object lives and disappears when the process exits. That is the right default for short-lived conversations, but it is not the right default for an agent that has to remember a user across days. We will come back to where sessions can be persisted further down.

## Streaming responses

By default, `agent.run(...)` waits for the full reply before returning. For long answers, that means the user waits in silence until the model has finished generating. Passing `stream=True` is the alternative: instead of returning the result, the call returns a stream object that yields updates as the model produces them, so you can print them out (or push them down a websocket) immediately.

We saw a small example of this in our [first hands-on article](/blog/building-ai-agents-with-microsoft-agent-framework/). Here it is again with a session:

```python
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
    agent = chat_client.as_agent(
        name="Assistant",
        instructions="You are a friendly assistant.",
    )

    session = AgentSession()

    stream = agent.run("Tell me a short story about a fox.", session=session, stream=True)
    print("Assistant: ", end="", flush=True)
    async for update in stream:
        if update.text:
            print(update.text, end="", flush=True)
    print()

    await stream.get_final_response()

asyncio.run(main())
```

A few things worth understanding about this loop. Each iteration of the loop returns an *update*, not a full message. Some updates contain text; some are empty or carry metadata for events that are not text (more on that in a moment). Checking `if update.text` is what filters the loop down to the part you actually want to print. `flush=True` matters because the default Python buffering would hold the output until a newline, defeating the point of streaming.

After the loop ends, `await stream.get_final_response()` finalizes the run. This is what returns the complete response object and ensures the session is updated. Skipping it can leave the session in an inconsistent state, especially when the stream involved tool calls, so make it part of every streaming code path.

The session is updated as the stream progresses. By the time the final-response call resolves, the session holds the user's question and the full assistant reply, and the next call against the same session will see them.

## What you see in a stream

A streaming response is more than a sequence of text fragments. The stream carries events for everything the agent does in a turn: text being generated, tool calls being made, tool results coming back, and a final completion event when the turn ends.

For a turn that does not call any tools, you mostly see text deltas, with one or two control events at the start and end. For a turn that calls a tool, the order looks roughly like this:

1. The model starts generating a tool call (you see the tool name and arguments coming through).
2. The tool runs, and a tool result event is emitted.
3. The model continues, now with the tool result in context, and produces the actual user-facing reply.

If you only want to print the final text, the `if update.text` filter is enough. If you are building a richer UI — showing "calling get_weather..." while the tool runs, then the answer once it returns — you want to inspect the update types more deliberately:

```python
stream = agent.run("What is the weather in Bengaluru?", session=session, stream=True)
async for update in stream:
    if getattr(update, "tool_calls", None):
        for call in update.tool_calls:
            print(f"\n[calling {call.name}({call.arguments})]")
    elif update.text:
        print(update.text, end="", flush=True)
await stream.get_final_response()
```

The exact attribute names on an update depend on the client and the SDK version. The pattern is stable: there are events for tool calls, events for tool results, and events for text. You filter for the events you care about.

If the only thing you need is the final reply, prefer `agent.run(...)` without `stream=True` over a streaming loop that throws everything but the text away. Streaming is worth the extra code only when the user sees the partial output.

## Streaming and tools, together

When a turn involves tools, the relationship between streaming and tool calls is sometimes counterintuitive. The model does not stream the tool's *result*. The tool runs in full, returns a value, and the value goes back into the conversation as a tool message. What streams is the model's reasoning around the tool call: the call itself, then the user-facing text that follows the tool result.

This matters for UI design. If your tool takes ten seconds to run, your user sees the streaming reply pause for ten seconds while the tool executes, and then resume when the model continues. If the pause is long enough to be confusing, surface the tool call to the user explicitly. The streaming pattern above, with the `[calling get_weather(...)]` line, is the simplest version. Production interfaces typically render a small spinner or a "tool running" pill that disappears when the result arrives.

For tools that take a long time, the right answer is often not to make the tool faster but to acknowledge the wait. Showing the user that something is happening is usually more important than reducing the wait by a second or two.

## Where conversation state lives

So far, every session we have used has been an in-memory `AgentSession`. The session lives in the Python process, and the moment the process exits, the conversation is gone. For a CLI tool or a one-shot script, that is fine. For a chatbot that runs across requests, days, or users, it is not.

MAF gives you a few options for moving conversation state out of memory.

The simplest is to serialize the session to your own storage between turns. You take the messages out of the session at the end of a request, save them in a database keyed by the user, and rehydrate them into a fresh `AgentSession` at the start of the next request. This is the most portable approach because nothing about it depends on a specific platform, and it lets your application own the conversation, which is often what you want for compliance reasons. The trade-off is that you are responsible for the storage layer.

The second option is to use a client whose conversations are managed by the platform itself. `AzureAIAgentClient` (the [Foundry Agent Service](/blog/building-ai-agents-with-microsoft-agent-framework/) path we looked at in earlier articles) persists conversations as Foundry threads. The session you get back from a Foundry-backed agent can survive process restarts because the actual storage is in Foundry, not in your application's memory. The trade-off is the inverse: less work for you, more coupling to Foundry.

Which one fits depends on the question we asked back in the [client comparison article](/blog/choosing-the-right-microsoft-agent-framework-client/): who owns the conversation. If the answer is "the platform," reach for `AzureAIAgentClient` and let Foundry handle persistence. If the answer is "my application," use an in-memory `AgentSession` and serialize it yourself.

## Pitfalls

A few things to watch for when you start using sessions and streaming together.

Forgetting to pass the session through is the most common mistake. If you create a session but call `agent.run(...)` without `session=session`, the call is stateless again and the session does not get updated. Wire the session through every call site or wrap your agent in a small helper that does it for you.

Sessions can grow large. Every turn appends messages, including tool calls and tool results, and the agent has to read all of them on every subsequent turn. Long-lived conversations consume tokens on every call, and eventually they hit the model's context window. For agents that run for days, plan for either summarization (compress old turns into a digest) or rolling windows (keep the last N turns and drop the rest). We will look at this more carefully when we cover context providers later in the series.

Forgetting to await `stream.get_final_response()` is the streaming-specific equivalent. The loop will exit cleanly even if you skip the call, but the session may not be fully updated and the stream object holds resources until it is finalized. Treat `get_final_response()` as a required step, not an optional one.

When you stream, partial updates are not always at character boundaries. A multibyte character can be split across two updates, and printing the text naïvely can produce a momentary glitch. For console output this is rarely visible. For a websocket stream into a browser, the receiving side needs to be tolerant of partial UTF-8 sequences.

Errors during streaming are also worth thinking through. If a tool raises mid-stream, the stream still completes and the error becomes part of the conversation history (we covered this in the [function tools article](/blog/function-tools-in-microsoft-agent-framework/)). The stream consumer sees the updates before the error, an event indicating the tool error, and then the model's recovery text. Your loop should not assume the stream always ends with a clean text reply.

Finally, sessions are not free. Each one carries memory, and creating thousands of long-lived sessions in a single process will eat into your application's heap. For high-fan-out scenarios, persist sessions outside the process and rehydrate them on demand rather than keeping them all in memory.

## Summary

`AgentSession` is the small primitive that turns a stateless `agent.run(...)` call into a real conversation, and `stream=True` is the small change that turns a long silent wait into a responsive interactive reply. Both are simple to adopt, and both have edges that show up only when the conversation gets long, the tools get slow, or the agent runs across requests rather than in a single script. The earlier you decide how state will live and how output will reach the user, the less re-work you will do later.

In the next article, we will look at how to make the agent return *structured* data rather than free text. We have leaned on prose answers throughout the series; for many production use cases, what you actually want is a Pydantic model on the way out, not a paragraph the calling code has to parse.

