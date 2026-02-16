# Structured output in Azure OpenAI


In this [series](https://ravichaganti.com/series/azure-openai/), we have examined the basics of Azure Open AI, using the chat completions API, streaming responses, and finally, single and multi-tool calling. In today's article, we will examine how to return structured output from the LLM response. We will first examine structured output without function calling and then update the earlier multi-function calling example to output JSON instead of text.

Structured outputs tell an LLM to follow the schema represented by the `response_format` parameter of a request to the LLM. We can use [Pydantic](https://docs.pydantic.dev/latest/) to build the schema.

Take a look at this example.

```python
from dotenv import load_dotenv
from pydantic import BaseModel
from openai import AzureOpenAI
import os

load_dotenv()

AZURE_OPENAI_API_KEY=os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT=os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT_NAME=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")

client = AzureOpenAI(
  azure_endpoint = AZURE_OPENAI_ENDPOINT, 
  api_key = AZURE_OPENAI_API_KEY,  
  api_version = "2024-08-01-preview"
)

class TravelPlan(BaseModel):
    city_name: str
    date: str

response = client.beta.chat.completions.parse(
    model=AZURE_OPENAI_DEPLOYMENT_NAME,
    messages=[
        {"role": "system", "content": "Extract the city and travel information."},
        {"role": "user", "content": "I will be travelling to London next week."},
    ],
    response_format=TravelPlan,
)

stuctured_output = response.choices[0].message.parsed

print(stuctured_output)
print(response.choices[0].message.content)
```

First, we must import the `BaseModel` from `pydantic` and define the structured output schema as a `pydantic` base model.

```python
class TravelPlan(BaseModel):
    city_name: str
    date: str
```

We must change the `client.chat.completions.create` to `client.beta.chat.completins.parse` and add `response_format` as a parameter. If you access `response.choices[0].message.parsed`, you will extract the information returned by the model.

```shell
$ python .\07_structured_output-basics.py
city_name='London' date='Next week'
```

Accessing `response.choices[0].message.content` retrieves the JSON output for the extracted information.

If we need to modify the earlier example of a travel planner program that suggests clothes to wear based on the weather at a location, we repeat what we did in the above example.

First, add a `pydantic` `BaseModel` class.

```python
class Suggestion(BaseModel):
    location: str
    date: str
    temperature: float
    cloth_suggestions: str
```

And, change the `get_model_response` function to replace `client.chat.completions.create` with `client.beta.chat.completions.parse` and add `response_format` as an argument with `Suggestion` as the value. When you run this program, the model generates structured output as specified in the response format.

```shell
$ python .\07_structured_output-function_call.py
Tool call: parse_day with arguments: {"day_string":"next week"}
Tool call: get_weather with arguments: {"city_name":"Austin","date":"2024-08-25"}
{"location":"Austin","date":"2024-08-25","temperature":35.5,"cloth_suggestions":"The temperature in Austin next week is expected to be around 35.5°C. This is hot weather, so I recommend carrying light layers such as t-shirts and short-sleeve shirts."}
```

Structured output can be very useful for multi-step workflows. In the next part of the series, we will see parallel tool calling in Azure OpenAI.

