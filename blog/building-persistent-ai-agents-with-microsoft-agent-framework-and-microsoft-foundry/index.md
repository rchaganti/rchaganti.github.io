# Building persistent AI Agents with Microsoft Agent Framework and Microsoft Foundry


In my earlier post on [Getting Started with Foundry Agents](https://ravichaganti.com/blog/getting-started-with-foundry-agents/), I covered the basics of creating agents using the Azure AI Foundry Agents service and the `azure-ai-projects` SDK. In another article in this series, we looked at creating Azure AI agents with Microsoft Agent Framework (MAF). Agents created with MAF are local only where MAF acts as the runtime. In this follow-up, we will examine how to create Foundry agents using MAF.

When working directly with the native SDK, the typical pattern involves:

1. Creating an `AIProjectClient`
2. Defining an agent with `PromptAgentDefinition`
3. Managing conversations manually
4. Handling responses through the OpenAI client wrapper

Here's what that looks like with the native SDK:

```python
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import PromptAgentDefinition

project_client = AIProjectClient(
    endpoint=foundry_endpoint,
    credential=DefaultAzureCredential(),
)

agent = project_client.agents.create_version(
    agent_name=agent_name,
    definition=PromptAgentDefinition(
        model=foundry_model,
        instructions=instruction,
    ),
)

# Manually manage conversations
conversation = openai_client.conversations.create()
response = openai_client.responses.create(
    conversation=conversation.id,
    extra_body={"agent": {"name": agent_name, "type": "agent_reference"}},
    input="your question here",
)
```

While this approach gives you fine-grained control, it requires explicit conversation management and more boilerplate code. This is where the Microsoft Agent Framework comes into play. We have [already seen the basics of MAF](/blog/introduction-to-microsoft-agent-framework/) in an earlier article in this series. So, let's look at the persistent agent pattern.

```python
import os
import asyncio
from dotenv import load_dotenv
from typing import Annotated

from agent_framework.foundry import FoundryChatClient
from azure.identity.aio import AzureCliCredential
from pydantic import Field

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

async def main() -> None:
    async with AzureCliCredential() as credential:
        async with FoundryChatClient(credential=credential) as chat_client:
            agent = chat_client.as_agent(
                name="WeatherAgent",
                instructions="You are a weatherman. Provide accurate and concise weather information based on user queries. Use provided tools to fetch current weather data.",
                tools=get_weather,
            )
            result = await agent.run("What should I wear in Austin, Texas?")
            print(f"Agent: {result}")

asyncio.run(main())
```

In both scenarios, an agent gets created in the Foundry.

{{< figure src="/images/maf-persist-agent-1.png" >}}  {{< load-photoswipe >}}

As in the previous scenario, the agent is persisted in Foundry. We are using `FoundryChatClient`, which connects to a Foundry project and uses the model deployed there. The agent itself is constructed locally with `chat_client.as_agent(...)`; Foundry holds the model and the conversation, and your application orchestrates the agent run.

In the subsequent parts of this series, we will examine other types of agents we can create with MAF.

{{< notice "info" >}}
**Updated 27th April 2026 for breaking API changes.** Microsoft Agent Framework's Python package was reorganized in version 1.2.0. `AzureAIClient` (formerly in `agent_framework.azure`) is now `FoundryChatClient` in `agent_framework.foundry`. Chat clients use `chat_client.as_agent(...)` rather than `chat_client.create_agent(...)` to construct an agent. Code samples in this article have been updated to match the current SDK. See the [client comparison article](/blog/choosing-the-right-microsoft-agent-framework-client/) for the current client surface.
{{< /notice >}}

