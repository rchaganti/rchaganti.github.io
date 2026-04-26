# Structured outputs in Microsoft Agent Framework


Most of the agents we have built so far have replied in prose. The user asks about the weather, and the agent responds in a single sentence. That works for a chat application, but it does not work for an application that has to *do* something with the answer. If your code needs to know whether the temperature is above 30°C or whether the recommendation is BUY, HOLD, or SELL, parsing prose with a regex or a second LLM call is fragile. The model phrases things differently each time, and one badly worded sentence can break the pipeline.

Microsoft Agent Framework (MAF) has a cleaner answer for this. You declare the shape of the response as a Pydantic model, pass it as a `response_format`, and the agent returns a parsed instance of that model. The model is constrained at generation time to emit valid JSON that matches the schema, so by the time your code reads the result, it is already typed and validated.

If you have followed the [function tools article](/blog/function-tools-in-microsoft-agent-framework/), Pydantic will already feel familiar. We used it there to give tool functions a typed return shape that the model could read reliably. Structured outputs use the same library for a different job. Instead of typing what comes *into* the conversation from a tool, they type what comes *out* of the agent at the end. The two patterns sit at opposite ends of the same conversation and compose without any extra wiring.

This article looks at how to use structured outputs, what changes when tools are also involved, and where the rough edges are.

## A simple structured response

The smallest useful example: ask the agent for a weather report and get back a typed object instead of prose.

```python
import asyncio
import os
from pydantic import BaseModel
from agent_framework.openai import OpenAIChatClient
from azure.identity import DefaultAzureCredential

from dotenv import load_dotenv

load_dotenv()

class WeatherReport(BaseModel):
    location: str
    temperature_c: float
    conditions: str
    advice: str

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
        name="WeatherAgent",
        instructions="You are a weather assistant. Provide concise, accurate weather information.",
        response_format=WeatherReport,
    )

    result = await agent.run("What is the weather like in Bengaluru today?")
    report: WeatherReport = result.value
    print(f"{report.location}: {report.temperature_c}°C, {report.conditions}")
    print(f"Advice: {report.advice}")

asyncio.run(main())
```

The change from a prose-returning agent is small but meaningful. We declare a `WeatherReport` Pydantic model, pass the *class* (not an instance) as `response_format`, and read the parsed object from `result.value`. The agent's underlying prose answer is no longer the primary surface; what comes back is a fully validated `WeatherReport` instance with typed fields you can pass directly into the rest of your application.

The original `result.text` is still there if you need it for logging, but it now contains the JSON the model emitted rather than a sentence.

## How the model is constrained

When you declare `response_format=WeatherReport`, MAF generates a JSON schema from the Pydantic model and passes it to the underlying model as part of the request. Modern models have explicit support for schema-constrained generation: rather than sampling tokens freely and hoping the result parses, they sample only tokens consistent with the schema at every step. The output is therefore guaranteed to be valid JSON of the right shape.

That guarantee is on shape, not content. The model still chooses the *values*. If you ask "what is the weather in Bengaluru?" and the model has no real-time data, it may produce a plausible-looking but invented temperature. Schema constraints do not make the model a reliable data source; they make the response structure reliable, which is a different problem.

Three practical consequences follow from this. First, field names and descriptions are part of the prompt the model sees, the same way function-tool parameter descriptions are. A field called `temperature_c` with a description `"Temperature in degrees Celsius"` will be filled more reliably than a field called `t` with no description. Second, the model is bound by the *type system*, not by your intentions. If `temperature_c` is an `int`, the model will round; if you want decimal places, declare it as a `float`. Third, validation happens in MAF before the result reaches you. If the model produces something that does not validate against the model (rare, but possible with older models), the run fails cleanly rather than silently giving you bad data.

## Richer models

Structured outputs are not limited to a flat dictionary of primitives. Anything Pydantic can express, you can use, including nested models, lists, optional fields, and enum-like constraints via `Literal`.

```python
from typing import Literal
from pydantic import BaseModel, Field

class Hazard(BaseModel):
    severity: Literal["low", "medium", "high"]
    description: str

class WeatherReport(BaseModel):
    location: str = Field(description="City and country, e.g. 'Bengaluru, IN'.")
    temperature_c: float = Field(description="Current temperature in Celsius.")
    conditions: str = Field(description="Short summary, e.g. 'partly cloudy'.")
    hazards: list[Hazard] = Field(
        default_factory=list,
        description="Active weather hazards, if any.",
    )
    advice: str = Field(description="One-sentence recommendation for the user.")
```

A few things worth noticing. `Literal["low", "medium", "high"]` becomes a JSON Schema enum and constrains the model to one of those three strings; you will not see "moderate" or "MEDIUM" sneak in. `list[Hazard]` lets the model emit zero, one, or several hazards, each itself validated against the `Hazard` schema. `default_factory=list` means the field is optional from the model's perspective; if there are no hazards, the model can omit the field and Pydantic fills in an empty list. `Field(description=...)` is the same hint we used for function-tool parameters; it goes into the prompt and improves how reliably each field is filled.

For models that already have a meaningful structure in your application, structured outputs are often a one-line change: take the Pydantic model you are using elsewhere, pass it as `response_format`, and the agent answers in your existing types.

## Structured outputs and tools

The interesting case is when the agent needs to call tools to gather information *before* producing the structured answer. Both can coexist on the same agent.

```python
from typing import Annotated
from pydantic import Field as PydField

def get_temperature(
    location: Annotated[str, PydField(description="City to look up.")],
) -> float:
    """Look up the current temperature in Celsius."""
    # ... call your weather API ...
    return 28.4

agent = chat_client.as_agent(
    name="WeatherAgent",
    instructions="Use the get_temperature tool, then return a WeatherReport.",
    tools=[get_temperature],
    response_format=WeatherReport,
)

result = await agent.run("Weather in Bengaluru?")
report: WeatherReport = result.value
```

The flow inside the run is straightforward. The model decides to call `get_temperature`, the tool runs and returns 28.4, the result goes back into the conversation, and *then* the model produces the final response constrained by the schema. The tool's return value can be anything (a float, a dict, a Pydantic model); only the agent's final reply is shape-constrained.

The instructions still matter, especially when you have both. A line like "use `get_temperature` first, then fill in the WeatherReport fields" makes the model far more likely to actually call the tool, rather than guessing values directly. Without that nudge, the schema constraint is so strong that the model can be tempted to skip the tool entirely and fabricate its way to a valid answer.

## Streaming structured outputs

Streaming and structured outputs work together, but with a wrinkle: the structured value is not finalized until the whole reply is generated. You can still stream the underlying JSON as it is produced, but the parsed Pydantic instance only becomes available at the end.

```python
stream = agent.run("Weather in Bengaluru?", stream=True)
async for update in stream:
    if update.text:
        print(update.text, end="", flush=True)
final = await stream.get_final_response()
report: WeatherReport = final.value
```

The async loop yields chunks of the JSON as it is written, which is useful for showing progress in a UI ("the model is generating the response..."). The fully parsed `WeatherReport` is only available after `get_final_response()` resolves. If your application only cares about the parsed object, do not bother streaming; if it wants both progress feedback and the typed result, the pattern above gives you both.

A natural extension is to render the partial JSON in the UI as it streams, so the user sees fields populating in real time. That requires a partial-JSON parser on the receiving side and is more work than it sounds, but it produces the most polished interactive experience.

## Things to note

A few things to watch for when adopting structured outputs.

Schema constraints can mask hallucinated values. The model is forced to fill the fields, so it will produce *something*. If the input data is missing or ambiguous, the something may be plausible-looking nonsense. For domains where this matters (financial, medical, legal), pair structured outputs with a confidence field, or with a tool-based grounding step that the agent must call before producing the final answer.

Not every model supports schema-constrained generation, and support varies across the Chat Completions and Responses APIs. Older models may produce JSON that *resembles* the schema without strictly conforming to it, in which case you fall back on Pydantic's validation to catch errors. If your runs occasionally fail with validation errors and you have a long tail of model versions in production, this is usually why.

Optional fields are tricky. A field declared as `Optional[str] = None` lets the model emit `None`, but the model has to decide to do so; many models default to filling everything in, including invented values. If a field is genuinely optional, provide a default and add a description indicating when the model should omit it.

Nested unions reduce reliability. A field whose type is `Union[Hazard, Warning, Notice]` works in the schema but forces the model to make a categorization decision mid-generation, which it does less consistently than when picking from a flat enum or producing a single shape. Where you can, prefer a flat shape with a discriminator field over a nested union.

Finally, large response models eat context. Every field name, type, and description becomes part of the prompt. A response model with 80 fields produces a prompt that the model must read on every turn, which incurs token costs and degrades attention. If you are tempted to add a fortieth field, ask whether the agent really needs to produce all of that in one shot, or whether a smaller schema plus a follow-up call would work better.

## Summary

Structured outputs replace fragile prose parsing with schema-constrained generation. You declare a Pydantic model, pass it as `response_format`, and the agent returns a typed instance via `result.value`. The mechanism comprises tools and streaming, but it does not make a model a reliable data source; it makes the shape of the answer reliable, not its *content*. Use it whenever downstream code depends on a specific shape, keep response models tight, and pair it with grounding tools when factual accuracy matters.

