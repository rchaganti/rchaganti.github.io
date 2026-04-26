# Middleware in Microsoft Agent Framework


By the time we have function tools, streaming, and a Foundry-backed agent in place, most of the *interesting* logic still lives in the agent itself: the system prompt, the tools, and the conversation. That is fine for a sample, but production agents quickly grow a second category of concerns that do not really belong in the prompt or the tools, things like logging every run, redacting PII before it leaves the process, blocking obvious abuse, timing function calls, retrying transient model errors, or rewriting the final response. Putting any of that into the agent definition makes the agent harder to read and harder to reuse.

Microsoft Agent Framework (MAF) handles this through middleware: small async functions or classes that wrap an agent's execution across three layers. If you have written ASP.NET Core or Express middleware, the shape will feel familiar: a context object, a `call_next` callback, and the ability to do work before, after, or instead of the wrapped operation.

## Three layers, three contexts

MAF exposes middleware at three points in the call stack. From outermost to innermost, they are:

1. **Agent middleware** wraps a whole `agent.run(...)` call. It sees the input messages, the agent options, and the final result. It fires once per run.
2. **Function middleware** wraps each tool invocation that happens during a run. If the agent calls three tools across two model turns, the function middleware fires three times.
3. **Chat middleware** wraps each request to the underlying chat client. In a multi-turn tool-calling sequence, the model is called once for the initial response and once for each batch of tool results, so the chat middleware fires multiple times per run.

Each layer has its own context object. The shape is the same, a mutable bag of state plus a `call_next` callback, but the fields differ:

| Middleware    | Context type                | Useful fields                                             |
| ------------- | --------------------------- | --------------------------------------------------------- |
| Agent run     | `AgentContext`              | `agent`, `messages`, `options`, `stream`, `result`        |
| Function call | `FunctionInvocationContext` | `function`, `arguments`, `result`, `kwargs`               |
| Chat request  | `ChatContext`               | `chat_client`, `messages`, `options`, `stream`, `result`  |

All three contexts also carry a `metadata` dictionary you can use to pass values between middleware layers, for example, a request ID set in agent middleware and read in function middleware.

## A first agent middleware

The simplest useful middleware is a logging wrapper. It prints before and after the agent runs and otherwise leaves everything alone:

```python
import asyncio
import os
from collections.abc import Awaitable, Callable

from agent_framework import ChatAgent, AgentRunContext
from agent_framework.azure import AzureAIAgentClient
from azure.identity.aio import AzureCliCredential

from dotenv import load_dotenv

load_dotenv()

PROJECT_ENDPOINT = os.environ["AZURE_AI_FOUNDRY_PROJECT_ENDPOINT"]
MODEL_DEPLOYMENT_NAME = os.environ["AZURE_AI_FOUNDRY_MODEL_DEPLOYMENT_NAME"]

async def logging_agent_middleware(
    context: AgentRunContext,
    call_next: Callable[[AgentRunContext], Awaitable[None]],
) -> None:
    user_text = context.messages[-1].text if context.messages else ""
    print(f"[run] user said: {user_text!r}")
    await call_next(context)
    text = context.result.text if context.result is not None else ""
    print(f"[run] assistant replied with {len(text)} chars")

async def main() -> None:
    async with (
        AzureCliCredential() as credential,
        AzureAIAgentClient(
            project_endpoint=PROJECT_ENDPOINT,
            model_deployment_name=MODEL_DEPLOYMENT_NAME,
            credential=credential,
        ) as client,
    ):
        agent = ChatAgent(
            chat_client=client,
            name="GreetingAgent",
            instructions="You are a friendly greeting assistant.",
            middleware=[logging_agent_middleware],
        )
        result = await agent.run("Hello!")
        print(result.text)


asyncio.run(main())
```

A few things worth pointing out. The middleware signature is fixed: an async function that takes the context and a `call_next` callable that takes no arguments. You mutate the context, and you `await call_next()` to continue down the chain. If you do not call `call_next`, the rest of the chain (including the agent itself) does not run, which is exactly how you implement blocking behavior later.

If you prefer a class, inherit from `AgentMiddleware` and implement `process` with the same signature:

```python
from agent_framework import AgentMiddleware

class LoggingAgentMiddleware(AgentMiddleware):
    async def process(self, context, call_next):
        print("[run] starting")
        await call_next()
        print("[run] done")
```

Class-based middleware is the right choice when the middleware requires configuration or maintains its own state, such as a counter, a connection to an audit store, or a cache.

## Function middleware: timing, kwargs, and retries

Function middleware is the layer that sees individual tool invocations. The context exposes the function being called, the validated arguments, and a mutable `kwargs` bag whose contents are forwarded to the tool at invocation time. That last part is what makes function middleware useful for *injection*: the model never sees these values, but the tool does.

```python
from agent_framework import FunctionInvocationContext

async def inject_tenant(
    context: FunctionInvocationContext,
    call_next: Callable[[], Awaitable[None]],
) -> None:
    context.kwargs.setdefault("tenant", "contoso")
    context.kwargs.setdefault("request_source", "agent")
    await call_next()
```

The tool then receives those values via its own `FunctionInvocationContext` parameter:

```python
def get_orders(ctx: FunctionInvocationContext, customer_id: str) -> str:
    tenant = ctx.kwargs.get("tenant", "default")
    return f"[{tenant}] orders for {customer_id}: ..."
```

This pattern keeps tenant IDs, user IDs, and request correlation IDs out of the prompt. The model has no business deciding the tenant ID, and you do not want it to make one up. Set it in middleware, read it in the tool.

The same layer is the natural place for timing and structured logging:

```python
import time
from agent_framework import FunctionMiddleware

class TimingFunctionMiddleware(FunctionMiddleware):
    async def process(self, context, call_next):
        started = time.perf_counter()
        try:
            await call_next()
        finally:
            elapsed = (time.perf_counter() - started) * 1000
            print(f"[tool] {context.function.name} took {elapsed:.1f}ms")
```

Because function middleware fires once per tool call, an agent that makes three tool calls in one run will print three lines. If you want a single summary per run, aggregate in the agent middleware and use `metadata` to share state.

You can also retry a failing tool by catching the exception around `call_next`:

```python
async def retry_function_middleware(context, call_next):
    for attempt in range(3):
        try:
            await call_next()
            return
        except TransientError:
            if attempt == 2:
                raise
            await asyncio.sleep(0.2 * (2 ** attempt))
```

Note the placement: this retries the *tool*, not the model. If the model itself is rate-limited, that is a chat-middleware problem.

## Chat middleware: every model call

Chat middleware sits closest to the wire. It wraps each individual request to the chat client, meaning it runs not only for the initial user turn but also for the follow-up calls the model makes after each round of tool results.

This is where you put model-level concerns:

- Token counting and budget enforcement.
- Adding or rewriting system messages just before they go out.
- Retrying on `429` or transient `5xx` responses.
- Logging the exact request/response payloads for audit.

```python
from agent_framework import ChatContext

async def token_logging_chat_middleware(
    context: ChatContext,
    call_next: Callable[[], Awaitable[None]],
) -> None:
    print(f"[chat] sending {len(context.messages)} messages")
    await call_next()
    if context.result is not None:
        print("[chat] response received")
```

The important mental model: in a run that involves two tool calls, you will typically see chat middleware fire three times (initial call, after-tool-1, after-tool-2), function middleware fire twice (the two tools), and agent middleware fire exactly once. If your numbers do not match that pattern, you are usually looking at a streaming or early-termination case.

## Blocking and overriding results

The most powerful thing middleware can do is *not* call `call_next`, or replace `context.result` after the fact. Both are first-class scenarios.

A blocking pattern, for example a guard against obviously sensitive prompts:

```python
from agent_framework import AgentResponse, Message, MiddlewareTermination

async def block_secrets(context: AgentContext, call_next):
    last = context.messages[-1].text.lower() if context.messages else ""
    if "password" in last or "api key" in last:
        context.result = AgentResponse(
            messages=[Message(role="assistant", contents=["Request blocked."])]
        )
        raise MiddlewareTermination(result=context.result)
    await call_next()
```

`MiddlewareTermination` short-circuits the rest of the chain *and* the agent. The caller still gets a normal `AgentResponse`, the one you set on `context.result`, so calling code does not need to know that anything was blocked.

A result-rewriting pattern, applied after the agent has produced its answer, is just as common. PII redaction is the classic example:

```python
import re

EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")

async def redact_emails(context: AgentContext, call_next):
    await call_next()
    if context.result is None:
        return
    for message in context.result.messages:
        for i, content in enumerate(message.contents):
            if isinstance(content, str):
                message.contents[i] = EMAIL.sub("[email]", content)
```

For streaming responses the shape is different, `context.result` is an async generator of `AgentResponseUpdate` chunks rather than a finished `AgentResponse`. You can detect which case you are in with `context.stream` and wrap the generator if needed:

```python
async def redact_streaming(context, call_next):
    await call_next()
    if not context.stream or context.result is None:
        return
    inner = context.result

    async def wrapped():
        async for chunk in inner:
            for i, c in enumerate(chunk.contents):
                if isinstance(c, str):
                    chunk.contents[i] = EMAIL.sub("[email]", c)
            yield chunk

    context.result = wrapped()
```

The point of this whole pattern is that the agent definition stays clean. The agent does not know about redaction, and redaction does not know about the agent. You can add or remove the middleware without touching either.

## Registration and ordering

You can register middleware at two scopes. **Agent-level** middleware is set when you construct the `Agent` and applies to every run. **Run-level** middleware is passed to a single `agent.run(...)` call and only applies to that call.

```python
async with Agent(
    client=FoundryChatClient(credential=credential),
    name="WeatherAgent",
    instructions="You are a helpful weather assistant.",
    tools=[get_weather],
    middleware=[
        SecurityAgentMiddleware(),     # agent-level
        TimingFunctionMiddleware(),    # agent-level
    ],
) as agent:
    # Uses agent-level middleware only.
    await agent.run("Weather in Seattle?")

    # Adds a run-level middleware on top.
    await agent.run(
        "Weather in Portland?",
        middleware=[token_logging_chat_middleware],
    )
```

Ordering follows the wrapping rule. For agent-level `[A1, A2]` and run-level `[R1, R2]`, the execution order is `A1 → A2 → R1 → R2 → Agent → R2 → R1 → A2 → A1`. Function and chat middleware follow the same wrapping principle at their respective layers. In practice, the order matters mostly for two cases: blocking middleware should come first so it runs before logging or timing; result-rewriting middleware should come last so it sees the finished result before anyone else.

A small but important detail: a single middleware function can be used at any of the three layers as long as its context type matches. If you do not annotate the context parameter, MAF cannot infer the layer. The decorator form makes this explicit:

```python
from agent_framework import agent_middleware, function_middleware, chat_middleware

@agent_middleware
async def m1(context, call_next):
    await call_next()

@function_middleware
async def m2(context, call_next):
    await call_next()

@chat_middleware
async def m3(context, call_next):
    await call_next()
```

Use the decorators when you do not want type annotations, or when you want to be explicit about intent, regardless of annotations.

## Summary

Middleware is the cleanest way to add cross-cutting behavior to a MAF agent: agent middleware for whole-run concerns, function middleware for tool-level concerns, and chat middleware for model-level concerns. The same three primitives, `context`, `call_next`, and an optional `MiddlewareTermination`, give you logging, redaction, blocking, retries, and result rewriting without changing the agent or the tools.

{{< notice "info" >}}
**Updated 26th April 2026 for breaking API changes.** Microsoft Agent Framework's Python package was reorganized after this article was first published. The method for constructing an agent in the chat client changed from `chat_client.create_agent(...)` to `chat_client.as_agent(...)`. The `Multiple tools` example has been updated to match. Other articles in this series also include changes to imports and constructors; see the [client comparison article](/blog/choosing-the-right-microsoft-agent-framework-client/) for the current set of clients and how to use them.
{{< /notice >}}

