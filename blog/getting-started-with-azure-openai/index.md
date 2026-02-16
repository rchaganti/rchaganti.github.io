# Getting started with Azure OpenAI


Generative AI and [OpenAI](https://openai.com/) should not be alien anymore. Several startups are already riding this new wave and creating stunning applications that solve several important use cases. I use GenAI regularly to learn and become more efficient in coding. GitHub Copilot has been a good friend. I experimented with creating Large Language Model (LLM) applications using different providers ([OpenAI](https://platform.openai.com/docs/overview) and [Google Gemini](https://ai.google.dev/)) and in different programming languages. OpenAI provides client libraries that can be used with any provider that offers an OpenAI-compatible API. For example, we can use the [OpenAI Python library](https://pypi.org/project/openai/) to work with OpenAI and Azure OpenAI services. 

Recently, I started researching the OpenAI Python library and Azure OpenAI service. This series of articles will focus on interacting with the Azure OpenAI service and different language models using the Python library. 

> This series assumes that you have an active Azure subscription and have provisioned Azure OpenAI service. You need to deploy the models of your choice and have the API key and endpoint information handy. For information on getting started with Azure OpenAI service, look at [What is Azure OpenAI Service? - Azure AI services | Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-services/openai/overview). 

Let us start with the basics.

Like any other Python project, create a virtual environment using your favorite tool before you start. I prefer [venv](https://docs.python.org/3/library/venv.html) for simple projects and quick programs that I author.

```shell
$ python -m venv .venv

# activate venv on Linux
$ source .venv/bin/activate

# activate venv on Windows
$ .\.venv\Scripts\Activate.ps1

# Once activated, you will see the prompt change
(.venv) PS C:\>
```

It is a good practice to list all program dependencies in a requirements.txt, so let's create one.

```
openai
python-dotenv
```

`openai` is the Python library to interact with the OpenAI-compatible API. The `python-dotenv` helps manage environment variables. We can run the `pip install -r requirements.txt` command within the virtual environment to install these dependencies. At the basic level, there are two types of LLM interactions -- *completion* and *chat completion*. The completion is a one-time message/prompt to the LLM, whereas using chat completion, you can converse with the LLM. Let's start with the legacy completion API. The newer models do not support legacy completion. Therefore, the following example uses `gpt-35-turbo-instruct`.

> As mentioned earlier, you will need the API key and endpoint. I prefer storing these values as key-value pairs in a .env file and accessing those values as environment variables using the python-dotenv library.

```python
from dotenv import load_dotenv
import os
from openai import AzureOpenAI

load_dotenv()

AZURE_OPENAI_API_KEY_FOR_INSTRUCT=os.getenv("AZURE_OPENAI_API_KEY_FOR_INSTRUCT")
AZURE_OPENAI_ENDPOINT_FOR_INSTRUCT=os.getenv("AZURE_OPENAI_ENDPOINT_FOR_INSTRUCT")
AZURE_OPENAI_DEPLOYMENT_NAME_FOR_INSTRUCT=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME_FOR_INSTRUCT")
    
client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY_FOR_INSTRUCT"),  
    api_version="2024-02-01",
    azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT_FOR_INSTRUCT")
)
    
start_phrase = 'What would be the tagline if Microsoft Azure was an ice cream shop?'
response = client.completions.create(
    model=AZURE_OPENAI_DEPLOYMENT_NAME_FOR_INSTRUCT, 
    prompt=start_phrase,
    max_tokens=30
)
print(start_phrase+response.choices[0].text)
```

`load_dotenv()` function loads all key-value pairs in the `.env` file as environment variables, which are then retrieved using the `os.getenv()` function. We can create an Azure OpenAI client using the `AzureOpenAI()` function in the `openai` library. This function has several parameters. For the example in this article, we need to set `api_key`, `api_version`, and `azure_endpoint` parameters.

The `client.completions.create()` function sends the prompt string to the API and retrieves the generated response. This function has several parameters that we can use to tweak the LLM's behavior and response. For now, we must supply the `model`, `prompt`, and `max_tokens`. The `max_tokens` parameter tells the LLM how many tokens it should generate. The `response` from the LLM will be a complex JSON object. We can retrieve the text from the generated response using `response.choices[0].text`. Why `choices[0]`? We shall see that in a bit.

```shell
(.venv) PS C:\> python.exe .\01_completion.py
What would be the tagline if Microsoft Azure was an ice cream shop?

"Chill out with Microsoft Azure - serving the coolest cloud flavors!"
```

This is nice! But if you notice ChatGPT or other such applications, more than one response to the prompt is returned, and you can choose from the options. The same behavior can be achieved using the Azure OpenAI library by supplying a parameter `n` with an integer as a value. This parameter represents the number of completions to generate for each prompt. Here is the modified program.

```python
from dotenv import load_dotenv
import os
from openai import AzureOpenAI

load_dotenv()

AZURE_OPENAI_API_KEY_FOR_INSTRUCT=os.getenv("AZURE_OPENAI_API_KEY_FOR_INSTRUCT")
AZURE_OPENAI_ENDPOINT_FOR_INSTRUCT=os.getenv("AZURE_OPENAI_ENDPOINT_FOR_INSTRUCT")
AZURE_OPENAI_DEPLOYMENT_NAME_FOR_INSTRUCT=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME_FOR_INSTRUCT")
    
client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY_FOR_INSTRUCT"),  
    api_version="2024-02-01",
    azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT_FOR_INSTRUCT")
)
    
start_phrase = 'What would be the tagline if Microsoft Azure was an ice cream shop?'
response = client.completions.create(
    model=AZURE_OPENAI_DEPLOYMENT_NAME_FOR_INSTRUCT, 
    prompt=start_phrase,
    max_tokens=30,
    n=2
)

print(start_phrase)
for choice in response.choices:
    print(choice.text, end="")
```

When we execute this, we shall see two responses. We can iterate over the response object and retrieve the generated text.

```shell
(.venv) PS C:\> python.exe .\01_completion.py
What would be the tagline if Microsoft Azure was an ice cream shop?

"Satisfy your cravings for the cloud and creamy treat at Microsoft Azure: The Scoop of Innovation!"

"Indulge in the coolness of Microsoft Azure, where tech meets treats!"
```

This is it for today. This is a good start. We will look at streaming completion responses in the next article in this series.
