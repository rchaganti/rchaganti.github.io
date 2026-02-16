# Using chat completion API in Azure OpenAI


So far in [this series](https://ravichaganti.com/series/azure-openai/), we have looked at the Azure OpenAI completion API, which generates a response for a given prompt. This is a legacy API, and using the chat completion API is recommended. We can build conversational chatbots and similar applications with the chat completion API. This article will examine how to use the Azure OpenAI chat completion API. In the earlier articles, we used the `client.completions.create()` function to generate a response. We need to use the `client.chat.completions.create()` in the `openai` library to build a conversation with the LLM.

```python
from dotenv import load_dotenv
import os
from openai import AzureOpenAI
from rich.console import Console
from rich.markdown import Markdown

load_dotenv()
console = Console()

AZURE_OPENAI_API_KEY=os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT=os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT_NAME=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")

client = AzureOpenAI(
  azure_endpoint = AZURE_OPENAI_ENDPOINT, 
  api_key = AZURE_OPENAI_API_KEY,  
  api_version = "2024-02-01"
)

response = client.chat.completions.create(
    model = AZURE_OPENAI_DEPLOYMENT_NAME,
    messages=[
        {"role": "system", "content": "You are a helpful tutor and an expert in Artificial Intelligence. You should provide a tabular output when the user asks to compare two things."},
        {"role": "user", "content": "What is the difference between OpenAI and Azure OpenAI?"},
    ],
    max_tokens=1000
)

md = Markdown(response.choices[0].message.content)
console.print(md)
```

> This example uses the `rich.console` and `rich.markdown` packages to convert the markdown response from the LLM to formatted output for the console. Make sure you add these packages to requirements.txt and install the dependencies.

The `client.chat.completions.create()` function is similar to the earlier one we used. However, this function has many more parameters than the simple completion API. We are most interested in the `messages` parameter, a list of messages. Each message in the list is a dictionary that contains keys such as `role` and `content`. The value of the `role` key can be `developer`, `system`, `user`, `assistant`, `tool`, and `function`. The `developer` and `system` roles are interchangeable and are used to specify the system prompt -- a message that tells the LLM how it should respond. The `assistant` role is used to indicate the message from the LLM. The `user` role is used to tag the user-supplied prompt. We shall look at `tool` and `function` roles in a later article.

Coming back to this example, we have two messages. A system message that indicates to the LLM how it needs to interpret and respond to the user prompt. The second message is the user prompt. The system prompt is important as it can provide a specific task or instruction to the model. In this example, we ask the LLM to return the response in a tabular format whenever a user asks for a comparison between two things. We will learn more about it when discussing prompt engineering.

Once a response is generated, we can supply the `response.choices[0].message.content` to the `Markdown()` function to transform the text to a format that can be printed to the console. Finally, using the `console.print(md)` function, we print the output to the console.

You can continue this conversation by adding the response from the LLM as the assistant message and then supply a new user prompt. We do not have any user interface to interact with the model as a conversation. However, we can implement a simple loop to "chat" with the model at the command line. 

```python
from dotenv import load_dotenv
import os
from openai import AzureOpenAI

load_dotenv()

AZURE_OPENAI_API_KEY=os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT=os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT_NAME=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")

client = AzureOpenAI(
  azure_endpoint = AZURE_OPENAI_ENDPOINT, 
  api_key = AZURE_OPENAI_API_KEY,  
  api_version = "2024-02-01"
)

conversation_history = [
    {"role": "system", "content": "You are a helpful tutor and an expert in Artificial Intelligence. You should provide a tabular output when the user asks to compare two things."},
]

while True:
    user_prompt = input("\nYou: ")
    if user_prompt.lower() == "exit":
        break
    conversation_history.append({"role": "user", "content": user_prompt})
    response = client.chat.completions.create(
        model = AZURE_OPENAI_DEPLOYMENT_NAME,
        messages=conversation_history
    )

    assistant_message = response.choices[0].message.content
    conversation_history.append({"role": "assistant", "content": assistant_message})

    print("\nAssistant: " + assistant_message)
```

This updated example is not very different from what we have already tried. It simply prompts the user from a message until it is `exit`. Both the `user_prompt` and the response from the LLM, `assistant_message`, are added to the conversation history. The conversation history is provided to the LLM as `messages`; therefore, the LLM always has the complete chat context.

In general, the LLMs have a knowledge cut-off date. This means the LLM has been trained only until a certain date and will not know the most recent or real-time information, which typically results in hallucinations. 

```shell
(.venv) PS C:\> python.exe .\04_chat_loop.py

You: what is the weather in London now?

Assistant: I'm unable to provide real-time weather updates because I don't have access to live data. However, you can check the current weather in London by visiting a trusted weather website, such as [Weather.com](https://www.weather.com) or using a weather app on your smartphone. Feel free to ask if you need guidance on understanding weather forecasts or climate-related concepts!

You: 
```

One way to address this issue is to supply the LLM with the latest knowledge in the form of Retrieval Augmented Generation (RAG) or using tools/functions. We shall look at tool/function calling in the next article.
