# Building AI Agents with Microsoft Agent Framework


The **Microsoft Agent Framework (MAF)** is an open-source development kit that combines the best ideas from Semantic Kernel and AutoGen projects. It provides a flexible foundation for building AI agents that can:

- Process user inputs using Large Language Models (LLMs)
- Call tools and MCP servers to perform actions.
- Generate intelligent, context-aware responses.
- Manage conversation state across interactions.

In this article, we'll explore different examples that showcase different capabilities of AI agents.

Before diving into the examples, make sure you have:

1. **Python 3.10+** installed
2. **Azure CLI** installed and authenticated (`az login`)
3. **Microsoft Foundry project** set up with a deployed model.
4. Required packages installed:

```bash
pip install agent-framework[azure-ai] azure-identity python-dotenv
```

5. Environment variables configured:
```bash
export AZURE_AI_PROJECT_ENDPOINT="https://<your-project>.services.ai.azure.com/api/projects/<project-id>"
export AZURE_AI_FOUNDRY_MODEL_DEPLOYMENT_NAME="gpt-4o-mini"
```

---

## Basic Agent

Let's start with the simplest possible agent - one that requires minimal setup and demonstrates the core concepts.

```python
import asyncio
from agent_framework.azure import AzureAIAgentClient
from azure.identity.aio import AzureCliCredential

async def main():
    async with (
        AzureCliCredential() as credential,
        AzureAIAgentClient(
            project_endpoint="https://ai-engineer-in.services.ai.azure.com/api/projects/ai-engineer-in",
            model_deployment_name="gpt-4o",
            credential=credential,
            agent_name="WeatherAgent",
        ).create_agent(
            instructions="You are a weather man. Provide accurate and concise weather information based on user queries.",
        ) as agent,
    ):
        query = "What's the weather like in Bengaluru?"
        result = await agent.run(query)
        print(f"Agent: {result}\n")

asyncio.run(main())
```

All Azure AI agent operations are async. Using the async/await pattern for better performance and scalability. The `async with` pattern ensures proper resource cleanup, preventing connection leaks. Both the credential and agent are managed as async context managers, ensuring proper cleanup. `AzureCliCredential` authenticates using your Azure CLI session - no need to manage API keys in your code or environment variables.

`AzureAIAgentClient` is used to create an AI agent client. It accepts:

- `project_endpoint`: Your Azure AI Foundry project URL. This can also be supplied using an environment variable `AZURE_AI_PROJECT_ENDPOINT`

- `model_deployment_name`: The deployed model to use. This can also be supplied using an environment variable `AZURE_AI_MODEL_DEPLOYMENT_NAME`
- `credential`: Your authentication credential.
- `agent_name`: A human-readable name of the agent created using this client.

The `instructions` parameter defines the agent's persona and behavior. This is the system prompt that guides the agent's response. The `agent.run()` method sends a message and returns the complete response.

## Streaming Responses

For a better user experience, especially with longer responses, you often want to stream the output as it's generated rather than waiting for the complete response.

```python
import asyncio
from agent_framework.azure import AzureAIAgentClient
from azure.identity.aio import AzureCliCredential

async def main():
    async with (
        AzureCliCredential() as credential,
        AzureAIAgentClient(
            credential=credential,
            agent_name="WeatherAgent",
        ).create_agent(
            instructions="You are a weather man. Provide accurate and concise weather information based on user queries.",
        ) as agent,
    ):  
        print("Agent: ", end="", flush=True)
        async for chunk in agent.run_stream("Tell me a short story"):
            if chunk.text:
                print(chunk.text, end="", flush=True)
        print()

asyncio.run(main())
```

Instead of waiting for the complete response, `run_stream()` returns an async iterator that yields chunks as they arrive. Each chunk may contain text (or may be empty for control messages), so we check `if chunk.text` before printing. Using `flush=True` ensures each chunk appears immediately in the console, creating a typing effect. Also, notice that the `project_endpoint` and `model_deployment_name` are not provided in this example. The `AzureAIAgentClient` uses the values from the environment variables. Streaming responses are well-suited for interactive applications such as chatbots, command-line tools, long-form content (e.g., code generation), and user interfaces that require immediate feedback.

## Tool Calling

This is where agents become truly powerful. By giving agents access to tools (functions), they can interact with the real world - fetch data from APIs, perform calculations, or execute any Python code you define.

```python
from pandas._libs.hashtable import mode
import asyncio
from typing import Annotated
from pydantic import Field
from dotenv import load_dotenv
import os

from agent_framework.azure import AzureAIAgentClient
from azure.identity.aio import AzureCliCredential

load_dotenv()

def get_weather(
    location: Annotated[str, Field(description="The location to get the weather for.")],
) -> str:
    import requests
    import json

    api_key = os.getenv("OPEN_WEATHERMAP_API_KEY")

    base_url = "http://api.openweathermap.org/data/2.5/weather"
    complete_url = f"{base_url}?q={location}&appid={api_key}&units=metric"

    response = requests.get(complete_url)
    data = response.json()

    if data["cod"] != "404":
        main_data = data["main"]
        current_temperature = main_data["temp"]

        return f"Temperature: {current_temperature}°C"
    else:
        return "City not found"

async def main():
    async with (
        AzureCliCredential() as credential,
        AzureAIAgentClient(
            model_deployment_name="gpt-4o",
            credential=credential,
            agent_name="WeatherAgent",
        ).create_agent(
            instructions="You are a weather man. Provide accurate and concise weather information based on user queries. Use provided tools to fetch current weather data.",
            tools=[get_weather],
        ) as agent,
    ):
        result = await agent.run("I am travelling to Austin Texas tomorrow, what should I wear?")
        print(result.text)

asyncio.run(main())
```

The `get_weather` function is a typed tool function that uses Python type annotations, including Annotated and Pydantic's Field, to describe its parameters. This metadata is automatically converted to the function schema that the LLM understands. You can pass your function(s) to the `tools` parameter when creating the agent. You can pass a single function or a list of functions. The agent automatically decides when to call your tool based on the user's query. Ask about the weather? It calls `get_weather`. Ask about something else? It uses its built-in knowledge.

This example connects to the OpenWeatherMap API to fetch current weather data, demonstrating how agents can interact with external services. The `store=True` parameter enables conversation persistence on the server side.

When you ask, "What should I wear in Austin, Texas?", the agent:
1. Recognizes it needs weather information
2. Calls `get_weather("Austin Texas")`
3. Receives the temperature data
4. Combines that with its knowledge about clothing to give a contextual recommendation

This pattern is fundamental to building agents that can take real-world actions.

## Code Interpreter

What if your agent needs to perform complex calculations or data analysis? The Code Interpreter tool allows agents to write and execute Python code in a sandboxed environment.

```python
import asyncio
from agent_framework import HostedCodeInterpreterTool
from agent_framework.azure import AzureAIAgentClient
from azure.identity.aio import AzureCliCredential

from dotenv import load_dotenv  
load_dotenv()

async def main():
    async with (
        AzureCliCredential() as credential,
        AzureAIAgentClient(
            model_deployment_name="gpt-4o",
            credential=credential,
            agent_name="WeatherAgent",
        ).create_agent(
            instructions="You are a Python coding expert. Use the provided tools to execute Python code to answer user queries accurately.",
            tools=HostedCodeInterpreterTool(),
        ) as agent,
    ):
        result = await agent.run("Calculate the 100th prime number.")
        print(result.text)

asyncio.run(main())
```

`HostedCodeInterpreterTool` is a built-in tool that provides a sandboxed Python execution environment hosted in Azure. The agent can write and run code without affecting your local system. The code runs in an isolated environment, allowing the agent to experiment without risk. With this, you can ask the agent to calculate the 100th prime number, and it will:

- Write Python code to find prime numbers

- Execute the code in the sandbox
- Return the result (541, by the way!)

Hosted code tools are important when your agent needs to handle scenarios such as complex mathematical formulas, statistical analysis, parsing, transforming, analyzing data, and generating data visualizations.

The Microsoft Agent Framework makes it remarkably easy to build sophisticated AI agents. Starting from a basic agent that takes less than 15 lines of code, you can progressively add capabilities like streaming, tool calling, code interpretation, and persistence. The key insight is that agents aren't just chat interfaces - they're intelligent systems that can reason about problems and take real actions. By giving them tools, you extend their capabilities beyond language into the real world. The future of AI is agentic, and with the Microsoft Agent Framework, you have everything you need to build that future today.

---

## Resources

- [Microsoft Agent Framework Documentation](https://learn.microsoft.com/en-us/agent-framework/)
- [Microsoft Foundry](https://azure.microsoft.com/en-us/products/ai-foundry/)
- [OpenWeatherMap API](https://openweathermap.org/api) (for the tool calling example)

