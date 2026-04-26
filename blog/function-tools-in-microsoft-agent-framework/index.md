# Function tools in Microsoft Agent Framework


In our [first hands-on article](/blog/building-ai-agents-with-microsoft-agent-framework/), we gave the weather agent a small Python function called `get_weather` and passed it as a tool. The agent picked it up automatically, called it when the user asked about the weather, and used the result to shape its reply. We did not stop to look at what was actually happening between the function and the model. In this article, we will.

Function tools are the most common way to extend an agent's capabilities in the Microsoft Agent Framework (MAF). They are also the place where small details, type hints, defaults, return types, and exceptions, end up making a real difference to how reliably the agent behaves. The goal here is to build a clear mental model of how MAF turns a Python function into something the model can call, and what your choices mean once it does.

## From a Python function to a tool

When you pass a function to `create_agent(tools=[...])`, MAF inspects the function and produces a tool definition that the underlying model can understand. That definition has three parts: a name, a description, and a JSON schema that describes the parameters.

For a function like this:

```python
from typing import Annotated
from pydantic import Field

def get_weather(
    location: Annotated[str, Field(description="The location to get the weather for.")],
) -> str:
    """Return the current temperature for a city."""
    ...
```

MAF derives:

- `name` from the function name (`get_weather`).
- `description` from the docstring (`"Return the current temperature for a city."`).
- A JSON schema for the parameters, with one required string property `location` whose description comes from the `Field(description=...)` annotation.

The resulting tool definition is what the model sees. When the model decides to call the tool, MAF intercepts the call, validates the arguments against the schema, runs your Python function, and returns the result back into the conversation as a tool message. The agent's next step then has the tool's output in context and can use it to answer the user.

Three practical consequences follow from this mechanism. First, the *names* and *descriptions* you choose are part of the prompt the model sees. A vague docstring or a cryptic parameter name will hurt selection accuracy. Second, the *types* matter because they constrain what the model can pass in. Third, the *return value* gets converted to text before the model sees it, which is why return-type choices have an outsized effect on reliability.

## Annotations and schemas

The standard pattern for declaring a parameter is `Annotated[T, Field(description="...")]`. The base type, `T`, becomes the JSON Schema type. The `Field(description=...)` adds a human-readable description that the model uses to decide whether the parameter applies to the current request.

A handful of common patterns:

```python
from typing import Annotated, Literal
from pydantic import Field

def get_forecast(
    location: Annotated[str, Field(description="City and country, e.g. 'Bengaluru, IN'.")],
    days: Annotated[int, Field(description="Number of days to forecast, between 1 and 7.")] = 3,
    units: Annotated[Literal["metric", "imperial"], Field(description="Units for temperature.")] = "metric",
) -> str:
    """Return a short text forecast for the next N days."""
    ...
```

A few things to notice. `days` has a default value, so MAF marks the parameter as optional in the schema. `units` uses `Literal[...]` to constrain the value to two strings, and the schema reflects that as an enum. The model will only pass `"metric"` or `"imperial"`, not arbitrary strings. Both `days` and `units` have descriptions that the model reads when deciding whether to set them.

You can also use Pydantic's validation features through `Field`, including bounds:

```python
def get_forecast(
    location: Annotated[str, Field(description="City and country.")],
    days: Annotated[int, Field(description="Number of days to forecast.", ge=1, le=7)] = 3,
) -> str:
    ...
```

If the model tries to pass `days=14`, MAF's validation rejects the call and returns a tool error message that the model can use to retry with a valid value. We will see error behavior in detail later.

The function's docstring becomes the tool description. Treat it like a prompt: short, action-oriented, and unambiguous. "Return the current temperature for a city" is good. "Helper" is not.

## Return types

Function tools can return strings, dictionaries, Pydantic models, or lists of any of these. MAF serializes the return value before it returns to the model, and the serialization affects how the model reads it.

The simplest return type is a string:

```python
def get_weather(location: Annotated[str, Field(description="City.")]) -> str:
    """Return the current temperature."""
    return "Bengaluru: 28°C, partly cloudy."
```

This is the lowest-friction option and the right choice when the tool's job is to produce a small piece of human-readable text.

When the tool returns structured data, a Pydantic model is the most reliable shape:

```python
from pydantic import BaseModel

class WeatherReport(BaseModel):
    location: str
    temperature_c: float
    conditions: str
    humidity_percent: int

def get_detailed_weather(
    location: Annotated[str, Field(description="City.")],
) -> WeatherReport:
    """Return a detailed weather report for the city."""
    return WeatherReport(
        location=location,
        temperature_c=28.4,
        conditions="Partly cloudy",
        humidity_percent=72,
    )
```

The Pydantic model gets serialized to JSON before going back into the conversation, and the model has no trouble reading the field names. The advantage over a raw `dict` is that the model also gets a stable shape: every call returns the same set of fields, which makes the agent's downstream behavior more predictable.

A `dict` works too, and is convenient for cases where you do not control the data shape:

```python
def get_weather_raw(
    location: Annotated[str, Field(description="City.")],
) -> dict:
    """Return raw weather data from the upstream API."""
    return {"location": location, "tempC": 28.4, "raw": {"...": "..."}}
```

The trade-off is that a dict has no schema, so the model has to infer the field names from the response itself. For one-off tools that is fine. For tools that the model calls repeatedly, a Pydantic model is worth the few extra lines.

A list of any of these works as well, which is useful for tools that return multiple results:

```python
def search_locations(
    query: Annotated[str, Field(description="Search text.")],
) -> list[WeatherReport]:
    """Return weather reports for cities matching the query."""
    ...
```

If your tool returns a large blob of data, summarize it within the function before returning it. The model has a finite context window, and pushing a megabyte of JSON into a tool message is rarely the right move. The function is your chance to filter and shape the data the model will reason over.

## Async tools

MAF agents are asynchronous, and function tools can be too. If your tool calls a remote API or a database, an async tool lets the agent stay responsive while the call is in flight.

```python
import httpx
import os

async def get_weather(
    location: Annotated[str, Field(description="City.")],
) -> str:
    """Return the current temperature for a city."""
    api_key = os.getenv("OPEN_WEATHERMAP_API_KEY")
    url = f"http://api.openweathermap.org/data/2.5/weather?q={location}&appid={api_key}&units=metric"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        data = response.json()
    if data.get("cod") != "404":
        return f"{location}: {data['main']['temp']}°C, {data['weather'][0]['description']}."
    return "City not found."
```

You pass an async tool to `create_agent` exactly the same way as a sync tool. MAF awaits it when the model calls it. Mixing sync and async tools in the same agent is supported.

The one practical rule: do not call blocking I/O inside an async tool. If you have to wrap a synchronous library, run it in a worker thread with `asyncio.to_thread` rather than calling it directly. A blocking call within an async tool stalls the agent's event loop, leading to slow responses and confusing timeout behavior.

## Multiple tools

Most non-trivial agents have more than one tool. You pass them as a list:

```python
agent = chat_client.create_agent(
    name="WeatherAgent",
    instructions="You are a weather assistant. Use the provided tools to answer questions.",
    tools=[get_weather, get_forecast, get_detailed_weather, search_locations],
)
```

The model decides which tool, if any, to call based on the user's question and the tools' names and descriptions. Two things help selection accuracy.

The first is sharply differentiated descriptions. If two tools have similar names and overlapping descriptions, the model will guess, and it will sometimes guess wrong. "Get the current temperature" and "Get a multi-day forecast" are easy to tell apart. "Get weather" and "Get weather info" are not.

The second is *instructions* on the agent that tell the model when to reach for tools at all. A line like "When the user asks about future days, use `get_forecast`. For a single point in time, use `get_weather`." in the agent's instructions reduces ambiguity. Tools without that scaffolding still work, but they work less consistently.

The model can also call multiple tools in a single turn, and MAF will execute them in sequence (or, for some clients, in parallel) and return all results before the model produces its next message. This is how you get behavior like "look up the weather in Austin and Bengaluru and compare them" working in a single round.

## Errors and what the model sees

When a function tool raises an exception, MAF catches it and converts it into an error message that goes back to the model in place of a successful tool result. The model sees something to the effect of "the tool you called raised this error" and decides what to do next: retry with different arguments, apologize to the user, or ignore the result and proceed.

This is a helpful default behavior, but it works best when your error messages are useful to the model. Compare:

```python
def get_weather(location: Annotated[str, Field(description="City.")]) -> str:
    response = requests.get(url)
    response.raise_for_status()
    ...
```

Here, a 404 from the upstream API surfaces as an `HTTPError` with a generic message. The model sees the error but cannot tell whether to retry, change the location, or give up.

A small amount of explicit error handling produces a much better outcome:

```python
class CityNotFoundError(Exception):
    pass

def get_weather(location: Annotated[str, Field(description="City.")]) -> str:
    response = requests.get(url)
    if response.status_code == 404:
        raise CityNotFoundError(f"No weather data for '{location}'. Check the spelling or try a nearby city.")
    response.raise_for_status()
    ...
```

Now the model sees a specific error with a clear remediation hint, and it can either ask the user to clarify or try a different value.

A second approach is to never raise at all and to return the error as a normal string:

```python
def get_weather(location: Annotated[str, Field(description="City.")]) -> str:
    response = requests.get(url)
    if response.status_code == 404:
        return f"No weather data found for '{location}'. The city name may be wrong."
    ...
```

Both styles are valid. Raising tends to be cleaner when there are several distinct failure modes, because the model gets a structured signal that something went wrong. Returning a string tends to be cleaner when the "error" is actually expected behavior, like a not-found case in a search tool.

Schema validation errors are handled the same way. If the model passes `days=14` to a tool that requires `days <= 7`, MAF rejects the call and the model gets a validation error back, which it can use to retry with a valid value.

## Pitfalls

A handful of issues come up often enough to be worth flagging.

`Optional[T]` is not the same as a parameter with a default value. `Optional[str]` means the parameter can be `None`, which the model must explicitly decide to pass. A parameter with `= None` as its default is *omitted* unless the model has a reason to pass it. In most tool designs, you want the second, not the first.

`Union[A, B]` works in schemas but reduces selection accuracy. Models reason better about parameters with one type than parameters that could be one of several. When you can split a multi-type parameter into two tools or two parameters, the result tends to be more reliable.

Long parameter lists hurt selection. A tool with 12 parameters is hard for the model to call correctly, even if every parameter is well-documented. Six is comfortable. Beyond eight, consider whether the tool is doing too much.

Side effects in function tools run every time the model calls them. If your tool sends an email, charges a card, or writes to a database, the model can call it multiple times in a single conversation. For destructive or expensive actions, a human-in-the-loop approval pattern is the safer design. We will look at that in a later article in this series.

Finally, if the tool's return value is large, the model will read it whether you wanted it to or not. Returning a 200 KB JSON dump from an API works mechanically, but it eats into the context window and rarely improves the answer. Summarize, project only the fields you actually need, and make the function a filter as well as a fetch.

## Summary

Function tools are deceptively simple on the surface and surprisingly nuanced beneath the surface. The function signature, type hints, docstring, and return shape all become part of the prompt the model sees. Treat each of those as a piece of communication with the model, not as plumbing, and your agent will pick the right tool more often, pass the right arguments more often, and recover from errors more cleanly.

In the next article, we will look at how an agent handles a conversation rather than a single turn. We have been calling `agent.run(...)` once and printing the result, but real applications have multi-turn conversations, and they often want to stream the response as it is generated. We will dig into `AgentThread`, streaming responses, and how the two interact when the agent is also calling tools.

{{< notice "info" >}}
  Last updated: 26th April 2026
{{< /notice >}}

