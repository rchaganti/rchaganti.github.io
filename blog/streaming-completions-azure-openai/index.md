# Streaming model responses when using Azure OpenAI


Responses are streamed to the user interface as they are generated using ChatGPT and similar tools. This eliminates the need for the user to wait until the complete response is generated. In today's article, we shall look at streaming LLM-generated responses when using Azure OpenAI API in Python.  In the earlier part of [this series](https://ravichaganti.com/series/azure-openai/), we learned about the `client.completions.create()` function used to send a prompt to the LLM and retrieve one or more responses. This function supports a parameter called `stream` when set to `True`, asks LLM to stream the response as it gets generated. The way to handle this response is a bit different from a standard completion response.

Let us take a look at the example.

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
    
start_phrase = 'What is the transformer architecture? Explain self-attention mechanism. Provide the response in 5 bullet points.'
response = client.completions.create(
    model=AZURE_OPENAI_DEPLOYMENT_NAME_FOR_INSTRUCT, 
    prompt=start_phrase,
    max_tokens=1000,
    stream=True
)

print(start_phrase)

for chunk in response:
    if chunk.choices:
        if chunk.choices[0].finish_reason != 'stop':
            text = chunk.choices[0].text
            print(text, end='')
```

In this example, the response arrives at the client as chunks. Each chunk needs to be read to retrieve the partially generated response. Each chunk contains a `finish_reason` to determine when to stop iterating (`finish_reason == 'stop'`) over the chunks. The `print()` function appends a new line when printing the chunk. As these are partially generated responses, adding a new line makes the output unreadable. We, therefore, set the `end` parameter of the `''`.

When we run this program, you can see words and lines streamed to the console.

```shell
(.venv) PS C:\> python.exe .\02_completion_stream.py
What is the transformer architecture? Explain self-attention mechanism. Provide the response in 5 bullet points.

1. The transformer architecture is a type of neural network used for natural language processing tasks such as machine translation and text generation.
2. It was introduced by Google in 2017 and has since become one of the most popular architectures for NLP tasks due to its ability to handle long sequences and avoid the use of recurrent neural networks.
3. Rather than using recurrent connections, the transformer architecture uses self-attention mechanisms to process input sequences and make predictions.
4. The self-attention mechanism allows the model to focus on specific parts of the input sequence, learning the relationship between different words in a sentence and capturing dependencies between words that are far apart.
5. This is achieved by calculating a weighted sum of the input sequence where the weights are determined by the relevance of each word in the sequence to the current word being processed. This allows the model to learn contextual information and make better predictions for each word in the sequence.
```

In this part, you learned how to stream the responses and deal with the response chunks to build meaningful output. In the next part, we shall look at how to use the chat completion API to build a conversation with the LLM.
