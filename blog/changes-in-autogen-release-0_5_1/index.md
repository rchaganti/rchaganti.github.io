# Changes in Autogen release 0.5.1


Microsoft released [version 0.5.1 of the AutoGen]([Release python-v0.5.1 · microsoft/autogen](https://github.com/microsoft/autogen/releases/tag/python-v0.5.1)) stable build last week, and I quickly reviewed the release notes to verify if there were any breaking changes to what I had been writing so far using AutoGen. There is code refactoring to change the structure of base types. This release provides enhanced support for structured output. When working directly with model clients, you can set to a Pydantic model. Here is an example from the release notes.

```python
import asyncio
from typing import Literal

from autogen_core import CancellationToken
from autogen_ext.models.openai import OpenAIChatCompletionClient
from pydantic import BaseModel

# Define the structured output format.
class AgentResponse(BaseModel):
    thoughts: str
    response: Literal["happy", "sad", "neutral"]

 model_client = OpenAIChatCompletionClient(model="gpt-4o-mini")

 # Generate a response using the tool.
response = await model_client.create(
    messages=[
        SystemMessage(content="Analyze input text sentiment using the tool provided."),
        UserMessage(content="I am happy.", source="user"),
    ],
    json_ouput=AgentResponse,
)

print(response.content)
# Should be a structured output.
# {"thoughts": "The user is happy.", "response": "happy"}
```

If you are using `AssistantAgent`, you can use the `output_content_type` to a Pydantic model that describes the output format. The agent will automatically reflect on the tool call result and generate a `StructuredMessage` with the output content type.

```python
import asyncio
from typing import Literal

from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.messages import TextMessage
from autogen_agentchat.ui import Console
from autogen_core import CancellationToken
from autogen_core.tools import FunctionTool
from autogen_ext.models.openai import OpenAIChatCompletionClient
from pydantic import BaseModel

# Define the structured output format.
class AgentResponse(BaseModel):
    thoughts: str
    response: Literal["happy", "sad", "neutral"]


# Define the function to be called as a tool.
def sentiment_analysis(text: str) -> str:
    """Given a text, return the sentiment."""
    return "happy" if "happy" in text else "sad" if "sad" in text else "neutral"


# Create a FunctionTool instance with `strict=True`,
# which is required for structured output mode.
tool = FunctionTool(sentiment_analysis, description="Sentiment Analysis", strict=True)

# Create an OpenAIChatCompletionClient instance that supports structured output.
model_client = OpenAIChatCompletionClient(
    model="gpt-4o-mini",
)

# Create an AssistantAgent instance that uses the tool and model client.
agent = AssistantAgent(
    name="assistant",
    model_client=model_client,
    tools=[tool],
    system_message="Use the tool to analyze sentiment.",
    output_content_type=AgentResponse,
)

stream = agent.on_messages_stream([TextMessage(content="I am happy today!", source="user")], CancellationToken())
await Console(stream)
```

This release also added support for Azure AI Search as a tool, along with enhancements to `SelectorGroupChat` and code executors. 

While I was testing the older examples I had built for this series, I encountered a deprecation warning.

```shell
.venv\Lib\site-packages\autogen_ext\models\openai\_openai_client.py:379: UserWarning: Missing required field 'structured_output' in ModelInfo. This field will be required in a future version of AutoGen.
  validate_model_info(self._model_info)
```

I dug a little deeper and understood that the `ModelInfo` object with the following structure is necessary in the future.

```python
model_info = ModelInfo(
    vision=False,
    structured_output=False,
    function_calling=False,
    streaming=False,
    json_output=False,
    family="gpt-4o",
)

aopenai_client = AzureOpenAIChatCompletionClient(
    model=os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    model_info=model_info,
)
```

If you are using agents or need tool calling, you must set the `function_calling` to `True`. 

