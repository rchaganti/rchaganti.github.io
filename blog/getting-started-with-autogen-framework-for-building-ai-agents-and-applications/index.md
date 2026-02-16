# Getting started with AutoGen framework for building AI agents and applications


I have been closely following developments in the Agentic AI space. [AutoGen](https://microsoft.github.io/autogen) from Microsoft Research is emerging as a powerful yet easy-to-use framework for building AI agents and applications. With their [re-architected release](https://www.microsoft.com/en-us/research/blog/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/) (0.4.0), they have re-imagined building advanced AI applications. This release introduces an asynchronous, event-driven architecture. 

{{< figure src="/images/ai/autogen-arch.jpg" >}} {{< load-photoswipe >}}

This release features a layered architecture with all foundational building blocks for an event-driven system as the core package. The AgentChat layer builds upon the core layer, providing a task-driven API for group chat and code execution, as well as pre-built agents. The extensions layer provides implementations for core interfaces and third-party integrations. This is where all the model clients are implemented. The AutoGen Studio is a low-code interface that enables the rapid prototyping of AI agents, and AutoGen Bench provides developers with tools to benchmark agents' performance across different tasks and environments.

The [Magnetic-One](https://www.microsoft.com/en-us/research/articles/magentic-one-a-generalist-multi-agent-system-for-solving-complex-tasks/) application is a reference implementation that utilizes the AutoGen features, enabling users to perform open-ended web and file-based tasks across various domains. 

If you want to start with AutoGen, this is the right time. In this article, I will walk through the basics of using AutoGen. We will go from using a simple model client to creating a simple agent. In the later parts of this series, we will look at creating a team of agents. As we do that, we will learn the concepts surrounding AutoGen.

## Installing AutoGen 

As with any Python package, creating a virtual environment before installing any packages is always a good practice.

```shell
$ mkdir -p autogen-101 && cd autogen-101
$ python -m venv .venv
$ source .venv\bin\activate
$ pip install -U "autogen-agentchat"
$ pip install "autogen-ext[openai,azure]"
```

We can start with the `autogen-agentchat` library for simple AI agents and applications. The `autogen-core` library will be required for advanced scenarios.

## Using model clients

I chose Azure OpenAI to explore how to use model clients in AutoGen. AutoGen supports [different models](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/components/model-clients.html) as extensions. With Azure OpenAI, you can use either key-based authentication or AAD token-based authentication. For the key-based authentication, we will use the following environment variables.

- AZURE_OPENAI_API_KEY: API key to authenticate with the Azure OpenAI service.
- AZURE_OPENAI_ENDPOINT: API endpoint associated with the Azure OpenAI service.
- AZURE_OPENAI_CHAT_DEPLOYMENT_NAME: Deployment name given while deploying the model.
- AZURE_OPENAI_API_VERSION: API version of the Azure OpenAI service

To make it easy to retrieve these variable values in the script, we can use the `load_dotenv()` function. 

```python
from dotenv import load_dotenv
import os
import asyncio

load_dotenv()
```

For the Azure OpenAI model client, we must import the `AzureOpenAIChatCompletionClient` from the `autogen_ext.models.openai` package. To create a conversation with the model, we need to send the prompt as a `UserMessage`, which is available in the `autogen_core.models` package.

```python
from autogen_ext.models.openai import AzureOpenAIChatCompletionClient
from autogen_core.models import UserMessage, AssistantMessage, SystemMessage
```

Let us combine this functionality to retrieve a response to a user prompt from the model.

```python
async def main():
    aopenai_client = AzureOpenAIChatCompletionClient(
        model=os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME"),
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
        endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    )

    result = await aopenai_client.create([
        UserMessage(
            content="What is AutoGen framework from Microsoft Research?",
            source="user",
        ),
    ])

    print(result.content)
    
if __name__ == "__main__":
    asyncio.run(main())
```

Running this program should produce output similar to the following.

```shell
$ python 01-model-client.py
AutoGen is an advanced framework developed by Microsoft Research that facilitates the creation of complex agent-based workflows centered around Large Language Models (LLMs). Released as an open-source Python library, AutoGen provides developers with tools to streamline communication and collaboration between LLM-powered agents while enabling dynamic automation and interaction with external APIs or services.

### Key Features of AutoGen:
1. **Agent Collaboration and Communication**: AutoGen allows for the orchestration of intelligent agents (e.g., user agents or assistant agents) that can dynamically interact through dialogues and tasks. These agents are designed to perform complex reasoning, problem-solving, and coordination.

2. **Extensibility and Customization**: AutoGen provides a simple yet powerful interface where developers can define custom agents with specific behaviors, abilities, and APIs. This makes it highly adaptable for diverse use cases.

3. **Streamlined Workflow Automation**: Using AutoGen, developers can build sophisticated workflows where multiple agents collaborate to achieve tasks like information retrieval, code generation, decision-making, content creation, and more.

4. **Ease of Use**: While enabling complex logic and inter-agent collaboration, AutoGen emphasizes simplicity, reducing the time and effort required for developers to design, implement, and manage multi-agent systems.

5. **Hybrid Intelligence**: The framework bridges LLMs and external tools, allowing agents to integrate well with domain-specific APIs, databases, and other services for enhanced operational capabilities.

### Example Use Cases:
- **Code Development**: Agents can collaborate to design, write, debug, and review code based on user requirements.
- **Business Process Automation**: AutoGen can automate workflows in customer support, data analysis, and report generation by leveraging human-like decision-making agents.
- **Creative Content Generation**: Agents can coordinate for tasks requiring writing stories, generating marketing material, or brainstorming ideas collaboratively.

### Components of AutoGen:
- **UserAgent**: Simulates a user interacting with the system.
- **AssistantAgent**: Represents an LLM-powered agent that actively solves problems or performs delegated tasks.
- **Custom Agents**: Developers can design unique agents tailored to specific roles or actions, integrating APIs, static data, or dynamic processes.
- **Robust Communication Framework**: Facilitates seamless back-and-forth interaction between agents, with dialogue and task-driven workflows.

### Availability:
Microsoft Research released AutoGen on GitHub as an open-source project. Developers can freely access the library, explore examples, and adapt its features to their needs.

### Significance:
AutoGen highlights the growing trend of transitioning from single-agent LLM applications to multi-agent systems capable of collaborative intelligence. Such frameworks push the boundaries of what LLMs can achieve, offering opportunities for groundbreaking innovation in AI-driven automation and human-computer interaction.

You can find the library and documentation for AutoGen [here on GitHub](https://github.com/microsoft/autogen).
```

You can change the model client and experiment with different hosted or local models. 

> Update: The 0.4.8 release of AutoGen natively supports Ollama-hosted local models. Here is a quick example of using the Ollama model client. You need to install the `autogen-ext[ollama]` package.

```python
from dotenv import load_dotenv
import os
import asyncio

from autogen_ext.models.ollama import OllamaChatCompletionClient
from autogen_core.models import UserMessage

load_dotenv()

async def main():
    ollama_client = OllamaChatCompletionClient(
        model="llama3.2:3b"
    )

    result = await ollama_client.create([
        UserMessage(
            content="What is AutoGen framework from Microsoft Research?",
            source="user",
        ),
    ])

    print(result.content)

if __name__ == "__main__":
    asyncio.run(main())
```

The response may take a few seconds to minutes depending on the system configuration where you run the models locally and the model size.

```python
$ python .\01-model-client-ollama.py
AutoGen is a tool developed by Microsoft Research that enables the automatic generation of test cases for software applications. It is designed to help improve the quality and coverage of unit tests, integration tests, and UI tests.

AutoGen uses a combination of machine learning algorithms and natural language processing (NLP) techniques to analyze source code, identify relevant features, and generate test cases that cover those features. The goal is to reduce the manual effort required to write test cases, making it easier for developers to ensure their application's functionality is thoroughly tested.

Here are some key features of AutoGen:

1. **Source code analysis**: AutoGen analyzes source code to identify relevant functions, methods, and classes.
2. **Feature extraction**: It extracts relevant features from the analyzed source code, such as input parameters, return types, and data structures.
3. **Test case generation**: Based on the extracted features, AutoGen generates test cases that cover those features.
4. **Test case optimization**: It optimizes generated test cases to minimize duplication and ensure maximum coverage.

AutoGen can be used in various testing scenarios, including:

1. Unit testing: Generating test cases for individual functions or methods.
2. Integration testing: Testing interactions between components or modules.
3. UI testing: Creating test cases for user interface elements and behaviors.

By leveraging machine learning and NLP techniques, AutoGen aims to make the testing process more efficient and effective, allowing developers to focus on other aspects of software development.

Would you like to know more about how AutoGen works or its applications in specific industries?
```

As you see, the local model hallucinated about what AutoGen is! :)

## Create an agent

The AgentChat package provides a set of pre-built agents. These include an [AssistantAgent](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/agents.html#assistant-agent), [UserProxyAgent](https://microsoft.github.io/autogen/stable/reference/python/autogen_agentchat.agents.html#autogen_agentchat.agents.UserProxyAgent), and [CodeExecutionAgent](https://microsoft.github.io/autogen/stable/reference/python/autogen_agentchat.agents.html#autogen_agentchat.agents.CodeExecutorAgent), among others. In this article, we will examine the use of the `AssistantAgent`. Let's dive into the example.

```python
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.ui import Console
from autogen_ext.models.openai import AzureOpenAIChatCompletionClient

import asyncio
from dotenv import load_dotenv
import os
import json
import requests
from datetime import datetime

from typing import Any

load_dotenv()

api_key = os.getenv("AZURE_OPENAI_API_KEY")
model = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME")
endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
api_version = os.getenv("AZURE_OPENAI_API_VERSION")
aoi_client = AzureOpenAIChatCompletionClient(
    model=model,
    api_key=api_key,
    endpoint=endpoint,
    api_version=api_version,
)

def get_weather(city: str, date: datetime = None) -> dict[str, Any]:
    """
    Get the weather at a given location on a given date or current weather.

    Args:
        city: The city name, e.g. Bengaluru.
        date: Date on which the weather at the given location should be determined. This defaults to the current weather when a date is not specified.

    Returns:
        JSON string with the city name, date, and temperature.
    """
    api_key = os.getenv("VISUAL_CROSSING_API_KEY")
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    request_url = f"https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/{city}/{date}?unitGroup=metric&key={api_key}&contentType=json"
    response = requests.get(request_url)

    if response.status_code != 200:
        return json.dumps({
            "error": "Invalid city name or date"
        })
    else:
        respJson = response.json()
        return json.dumps({
            "city": city,
            "date": date,
            "temperature": respJson["days"][0]["temp"]
        })

agent = AssistantAgent(
    name="weather_agent",
    model_client=aoi_client,
    tools=[get_weather],
    system_message="You are a helpful assistant.",
    reflect_on_tool_use=True,
    model_client_stream=True,
)

async def main() -> None:
    await Console(
        agent.on_messages_stream(
            task="What is the weather in London?"
        )
    )

asyncio.run(main())
```

The `get_weather` tool is the same function I used earlier when writing about Azure OpenAI API. It uses VisualCrossing weather API. If you do not have an API key for this service, replace the function body with a dummy return statement.

```python
	"""
    Get the weather at a given location on a given date or current weather.

    Args:
        city: The city name, e.g. Bengaluru.
        date: Date on which the weather at the given location should be determined. This defaults to the current weather when a date is not specified.

    Returns:
        JSON string with the city name, date, and temperature.
    """
	return f"The weather in {city} on {date} is 30 degrees celsius and rainy."
```

The `agent.run_stream()` method is a convenient wrapper around the `on_messages_stream()` method and 

Unlike the function or tool calling when using the OpenAI API directly, the AutoGen agent framework and the agents provide the ability to invoke the tools automatically based on the LLM response. We supply a list of tools available using the `tools` field. 

```shell
$ python 02-assistant-agent.py
---------- user ----------
What is the weather in London?
---------- weather_agent ----------
[FunctionCall(id='call_Z4evOdxIYSuCsMyXEJXXyToR', arguments='{"city":"London"}', name='get_weather')]
---------- weather_agent ----------
[FunctionExecutionResult(content='{"city": "London", "date": "2025-03-23", "temperature": 11.0}', name='get_weather', call_id='call_Z4evOdxIYSuCsMyXEJXXyToR', is_error=False)]
---------- weather_agent ----------
The current temperature in London is 11°C. Let me know if you'd like more details about the weather!
```

The `reflect_on_tool_use` indicates if the agent should make another model inference using the tool call result. If you set this to `False`, you will not see the last response.

```shell
$ python 02-assistant-agent.py
---------- user ----------
What is the weather in London?
---------- weather_agent ----------
[FunctionCall(id='call_1DXbEuxDnHKHKj6d6DhWmueo', arguments='{"city":"London"}', name='get_weather')]
---------- weather_agent ----------
[FunctionExecutionResult(content='{"city": "London", "date": "2025-03-23", "temperature": 11.0}', name='get_weather', call_id='call_1DXbEuxDnHKHKj6d6DhWmueo', is_error=False)]
---------- weather_agent ----------
{"city": "London", "date": "2025-03-23", "temperature": 11.0}
```

Setting `model_client_stream` to `True` or `False` influences if the result from the tool calling and the model should be streamed or not. We can use any of the four methods -- `agent.on_messages()`, `agent.on_messages_stream()`,  `agent.run()`, and `agent.run_stream()` -- to supply the input prompt to the model.

Also, unlike the direct API calling, you don't have to pass the conversation history as a part of the prompt. The AutoGen agents are stateful and maintain the state of the conversation in memory.

As you can see, AutoGen framework makes it significantly simple to implement agentic applications. In the later parts of this series, we shall look at some advanced concepts and features of AutoGen.




