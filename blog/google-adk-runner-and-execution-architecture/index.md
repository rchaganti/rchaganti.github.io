# Google ADK - Runner and execution architecture


You have defined your agents, wired up tools, set up callbacks, and configured sessions with scoped state. But when a user sends a message, what actually happens? Who calls the agent? Who persists in the state changes? Who decides when the conversation turn is over? The answer to all of these is the `Runner`. The Runner is the central orchestrator of the ADK runtime. It receives a user's query, starts the agent, processes every event the agent emits, commits state changes via the `SessionService`, and forwards events to the caller. Without the Runner, your agents, tools, and callbacks are just definitions sitting idle. The `Runner` is the engine that brings them to life.

## The event loop

An event loop is at the heart of the ADK runtime and facilitates the communication between the `Runner` component and the agent execution. When a user prompt arrives, the `Runner` hands it over to the agent for processing. The agent runs until it has something to yield, at which point it emits an event. The `Runner` receives the event, processes any associated actions, calls the session service to append the event to the current state, and forwards the event. After the `Runner` completes event processing, the agent resumes from where it was paused and continues this loop until it has no more events to yield. The `Runner` component is the central orchestrator of this event loop.

Several components work together within the ADK runtime. Understanding their roles clarifies how the event loop functions.

### The Runner

The `Runner` serves as the central coordinator for a single-user invocation. Its responsibilities in the loop are:

1. **Initiation:** Receives the user's query (`new_message`) and appends it to the session history via the `SessionService`.
2. **Kick-off:** Starts event generation by calling the main agent's execution method (`agent.run_async(...)`).
3. **Receive and process:** Waits for the agent logic to yield an `Event`. Upon receiving one, it uses configured services (`SessionService`, `ArtifactService`, `MemoryService`) to commit changes indicated in `event.actions` (such as `state_delta` and `artifact_delta`).
4. **Yield upstream:** Forwards the processed event onwards to the calling application or UI for rendering.
5. **Iterate:** Signals the agent logic that processing is complete, allowing it to resume and generate the next event.

### The execution logic

Your code within agents, tools, and callbacks is responsible for the actual computation and decision-making. Its interaction with the loop follows a specific pattern:

1. **Execute:** Runs its logic based on the current `InvocationContext`, including the session state as it was when execution resumed.
2. **Yield:** When the logic needs to communicate, it constructs an `Event` containing the relevant content and actions, then yields it back to the `Runner`.
3. **Pause:** The agent's execution pauses immediately after the yield. It waits for the `Runner` to complete processing and committing.
4. **Resume:** Only after the `Runner` has processed the yielded event does the agent logic resume from the statement immediately following the yield.
5. **See updated state:** Upon resumption, the agent logic can now reliably access the session state reflecting the changes that were committed by the `Runner`.

This cooperative yield/pause/resume cycle between the `Runner` and your execution logic, mediated by `Event` objects, forms the core of the ADK runtime. When the `Runner` starts processing a user query, it creates an `InvocationContext`. This is the runtime's "traveling notebook" that accompanies the interaction from start to finish, collecting information, tracking progress, and providing context to every component along the way. You do not typically create or manage this object directly. The ADK framework creates it when an invocation starts via `runner.run_async` and passes the relevant contextual information to your agent code, callbacks, and tools. When you implement custom agents, you receive them as the `ctx` parameter in `_run_async_impl`.

```python
from google.adk.agents import BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from typing import AsyncGenerator

class MyAgent(BaseAgent):
    async def _run_async_impl(
        self, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        # Direct access to runtime information
        agent_name = ctx.agent.name
        session_id = ctx.session.id
        current_state = ctx.session.state
        
        # Use ctx.end_invocation = True to terminate early
        ...
```

It is important to understand the hierarchy of concepts within an invocation. An *invocation* starts with a user message and ends with a final response. It can contain one or multiple *agent calls*, for example, when using agent transfer or `AgentTool`. Each agent call is handled by `agent.run_async()`. An LLM agent call can contain one or multiple *steps*. Each step calls the LLM once and yields its response. If the LLM requests tool calls, those are executed within the same step.

State variables prefixed with `temp:` are strictly scoped to a single invocation and discarded afterwards. When a parent agent calls a sub-agent, it passes its `InvocationContext` to the sub-agent. This means the entire chain of agent calls shares the same invocation ID and the same `temp:` state.

## Creating and using a Runner

To create a `Runner`, you need an agent and a `SessionService`. Optionally, you can provide an `ArtifactService` and a `MemoryService`.

```python
from google.adk.agents import LlmAgent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner

# Define the agent
agent = LlmAgent(
    name="MyAgent",
    model="gemini-2.0-flash",
    instruction="You are a helpful assistant."
)

# Create the session service
session_service = InMemorySessionService()

# Create the runner
runner = Runner(
    agent=agent,
    app_name="my_app",
    session_service=session_service
)
```

Once you have a runner, you interact with it using one of its run methods.

### run_async

This is the primary method for executing agent invocations. It returns an async generator of events. The ADK runtime is fundamentally built on asynchronous patterns using Python's `asyncio` to handle concurrent operations like waiting for LLM responses or tool executions efficiently without blocking.

```python
from google.genai.types import Content, Part

session = await session_service.create_session(
    app_name="my_app",
    user_id="user_1"
)

user_msg = Content(parts=[Part(text="Hello!")], role="user")

async for event in runner.run_async(
    user_id="user_1",
    session_id=session.id,
    new_message=user_msg
):
    if event.is_final_response() and event.content and event.content.parts:
        print(event.content.parts[0].text)
```

### run (synchronous)

A synchronous `Runner.run` method exists for convenience in simple scripts or testing environments. Internally, it calls `Runner.run_async` and manages the async event loop execution for you.

```python
user_msg = Content(parts=[Part(text="Hello!")], role="user")

for event in runner.run(
    user_id="user_1",
    session_id=session.id,
    new_message=user_msg
):
    if event.is_final_response() and event.content and event.content.parts:
        print(event.content.parts[0].text)
```

For production applications, especially web servers, we should design applications to be asynchronous using `run_async` for best performance.

### run_live

For bidirectional streaming scenarios, such as voice conversations, the `Runner` provides `run_live`. This method uses a `LiveRequestQueue` for sending messages and returns an async generator of events. Unlike `run_async`, which handles a single request-response cycle, `run_live` maintains a persistent streaming connection to the LLM.

```python
from google.adk.agents.run_config import RunConfig
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

runner = Runner(
    agent=agent,
    app_name="my_app",
    session_service=InMemorySessionService()
)

session = await session_service.create_session(
    app_name="my_app",
    user_id="user_1"
)

live_request_queue = LiveRequestQueue()
run_config = RunConfig(response_modalities=["TEXT"])

async for event in runner.run_live(
    session=session,
    live_request_queue=live_request_queue,
    run_config=run_config
):
    if event.content and event.content.parts:
        print(event.content.parts[0].text)
```

One `InvocationContext` corresponds to one `run_live()` loop. It is created when you call `run_live()` and persists for the entire streaming session.

### RunConfig

The `RunConfig` class defines runtime behavior and options for agents. It controls streaming settings, function calling, artifact saving, and LLM call limits. You pass a `RunConfig` to customize how the runner executes your agent.

```python
from google.adk.agents.run_config import RunConfig, StreamingMode

run_config = RunConfig(
    streaming_mode=StreamingMode.NONE,
    max_llm_calls=500,
    save_input_blobs_as_artifacts=False,
    support_cfc=False
)
```

Some of the key properties of the `RunConfig` class are:

| Property                        | Type                  | Default               | Purpose                                                         |
| ------------------------------- | --------------------- | --------------------- | --------------------------------------------------------------- |
| `streaming_mode`                | `StreamingMode`       | `StreamingMode.NONE`  | Controls output delivery: `NONE`, `SSE`, or `BIDI`              |
| `max_llm_calls`                 | `int`                 | `500`                 | Safety limit on total LLM calls per invocation                  |
| `save_input_blobs_as_artifacts` | `bool`                | `False`               | Whether to save input binary data as artifacts                  |
| `support_cfc`                   | `bool`                | `False`               | Enables Compositional Function Calling                          |
| `speech_config`                 | `SpeechConfig`        | `None`                | Voice configuration for live/audio agents                       |
| `response_modalities`           | `list[str]`           | `None`                | Controls output format: `["TEXT"]` or `["AUDIO"]`               |

#### StreamingMode

The `streaming_mode` setting determines how the agent's responses are delivered.

- `StreamingMode.NONE` is the default. The LLM generates its entire response before delivering it. The Runner receives a single non-partial event for the response.
- `StreamingMode.SSE` (Server-Sent Events) uses HTTP streaming. The LLM generates its response in chunks. The Runner yields multiple events with `partial=True` for progressive display, followed by a final non-partial event.
- `StreamingMode.BIDI` enables full bidirectional streaming via WebSocket, used with `run_live()` for real-time voice and multimodal interactions.

#### max_llm_calls

The `max_llm_calls` parameter acts as a safety limit to prevent runaway agent loops. If an agent enters an infinite tool-calling cycle, this limit ensures the invocation terminates after a set number of LLM calls. The default of 500 is generous for most use cases.

#### Compositional Function Calling

Setting `support_cfc=True` enables [Compositional Function Calling](https://ai.google.dev/gemini-api/docs/function-calling?example=meeting#compositional_function_calling). This allows the model to orchestrate multiple tools in sophisticated patterns, calling tools in parallel, chaining outputs as inputs to other tools, or conditionally executing tools based on intermediate results.

Understanding a few key aspects of [how the ADK runtime handles state and streaming](https://google.github.io/adk-docs/runtime/event-loop/#important-runtime-behaviors) is crucial for building predictable agents.

## Putting it all together

Here is a complete example that demonstrates the Runner orchestrating a multi-turn conversation with a tool-calling agent. This builds on the sessions and state concepts from the earlier article in this series.

```python
import asyncio
from google.adk.agents import LlmAgent
from google.adk.sessions import InMemorySessionService
from google.adk.runners import Runner
from google.adk.tools import ToolContext
from google.genai.types import Content, Part

# --- Tools that modify state ---
def lookup_weather(
    city: str,
    tool_context: ToolContext
) -> dict:
    """Looks up the current weather for a city."""
    weather_data = {
        "Paris": {"temp": 18, "condition": "Partly cloudy"},
        "London": {"temp": 14, "condition": "Rainy"},
        "Tokyo": {"temp": 22, "condition": "Sunny"},
    }
    result = weather_data.get(city, {"temp": 0, "condition": "Unknown"})
    
    # Track the last city queried in session state
    tool_context.state["last_city"] = city
    tool_context.state["user:query_count"] = (
        tool_context.state.get("user:query_count", 0) + 1
    )
    return result


# --- Agent ---
weather_agent = LlmAgent(
    name="WeatherAgent",
    model="gemini-2.0-flash",
    instruction="""You are a weather assistant for {user:name}.
They have made {user:query_count?} queries so far.
Last city checked: {last_city?}
Provide weather information when asked.""",
    tools=[lookup_weather],
    output_key="last_response"
)


# --- Runner and interaction ---
async def main():
    session_service = InMemorySessionService()
    runner = Runner(
        agent=weather_agent,
        app_name="weather_app",
        session_service=session_service
    )
    
    session = await session_service.create_session(
        app_name="weather_app",
        user_id="user1",
        state={"user:name": "Ravi", "user:query_count": 0}
    )
    
    # Turn 1
    msg1 = Content(parts=[Part(text="What's the weather in Paris?")], role="user")
    async for event in runner.run_async(
        user_id="user1", session_id=session.id, new_message=msg1
    ):
        if event.is_final_response() and event.content:
            print(f"Agent: {event.content.parts[0].text}")
    
    # Inspect state after Turn 1
    s = await session_service.get_session(
        app_name="weather_app", user_id="user1", session_id=session.id
    )
    print(f"State: last_city={s.state.get('last_city')}")
    print(f"State: user:query_count={s.state.get('user:query_count')}")
    print(f"Events so far: {len(s.events)}")
    
    # Turn 2
    msg2 = Content(parts=[Part(text="How about Tokyo?")], role="user")
    async for event in runner.run_async(
        user_id="user1", session_id=session.id, new_message=msg2
    ):
        if event.is_final_response() and event.content:
            print(f"Agent: {event.content.parts[0].text}")
    
    # Inspect state after Turn 2
    s = await session_service.get_session(
        app_name="weather_app", user_id="user1", session_id=session.id
    )
    print(f"State: last_city={s.state.get('last_city')}")
    print(f"State: user:query_count={s.state.get('user:query_count')}")

asyncio.run(main())
```

When you run this, you can observe the `Runner` orchestrating the full event loop across multiple turns, with the session service persisting state between them.

```shell
> python.exe .\runner-weather.py

Agent: The weather in Paris is partly cloudy with a temperature of 18 degrees.

State: last_city=Paris
State: user:query_count=1
Events so far: 4
Agent: The weather in Tokyo is sunny with a temperature of 22 degrees.

State: last_city=Tokyo
State: user:query_count=2
```

Notice how the `Runner` drives the entire lifecycle. It receives each user message, passes it to the agent, processes every event the agent generates, including tool call events where state is modified via `ToolContext`, commits the `state_delta` through the `SessionService`, and yields the final response events back to our code. The `user:query_count` counter increases across turns because the user-scoped state is persisted by the session service between invocations. The agent's instruction template `{user:query_count?}` is resolved by the framework on each turn using the latest committed state.

Understanding the `Runner` and its execution architecture is essential for building reliable agent applications with Google ADK. The `Runner` is the piece that connects everything we have covered so far in this series, from sessions and state to callbacks and tools. Every state change flows through events, every event flows through the `Runner`, and the `Runner` ensures consistency through the yield/pause/process/resume cycle. I recommend experimenting with different `RunConfig` settings and tracing the events your agents emit to build a deeper understanding of this architecture.

