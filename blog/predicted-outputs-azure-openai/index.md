# Predicted outputs in Azure OpenAI


Sometimes, you may want the LLM to perform only minimal changes to what is provided as a prompt. For example, you have a couple of paragraphs of text that you want the LLM to modify to ensure no spelling mistakes. You do not want the LLM to change the overall content, but make sure the misspellings are corrected. This usually helps in reducing the LLM response latency. This is useful in scenarios where you already know a large portion of the expected response and is well-suited for code completion and error detection scenarios. In this part of the [series of articles on Azure OpenAI](https://ravichaganti.com/series/azure-openai/), we will use predicted outputs with Azure OpenAI to build AI applications.

For this demonstration, we will use the following paragraph copied from the Azure OpenAI documentation and intentionally modified to induce a few spelling errors.

> An embedding is a special **fromat** of data representation that machine learning **modles** and algorithms can easily use. 
>
> The embedding is an information dense representation of the **sementic** meaning of a piece of text. 
>
> Each embedding is a **vcetor** of floating-point numbers, such that the distance between two embeddings in the 
>
> vector space is correlated with semantic similarity **betwien** two inputs in the original format.

I have highlighted the errors induced into the paragraph in bold.

To use the predicted outputs feature, we shall provide this as the user prompt to the LLM. Along with this prompt, we will provide certain instructions as well. 

> In the given content, find and fix all spelling mistakes.
>
> Respond with only the corrected paragraph and highlight the corrected words.

In the instructions, we ask LLM to correct all misspellings and then return only the corrected paragraph with corrected words highlighted.

We need to tell the LLM that we predict the response to be the same as the prompt, but supplying the prompt text to the `prediction` field of the `client.chat.completions.create()` method. Let us look at the complete code.

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
  api_version = "2025-01-01-preview"
)

content = """
An embedding is a special fromat of data representation that machine learning modles and algorithms can easily use. 
The embedding is an information dense representation of the sementic meaning of a piece of text. 
Each embedding is a vcetor of floating-point numbers, such that the distance between two embeddings in the 
vector space is correlated with semantic similarity betwien two inputs in the original format.
"""

instructions = """"
In the given content, find and fix all spelling mistakes.
Respond with only the corrected paragraph and highlight the corrected words.
"""

response = client.chat.completions.create(
    model = AZURE_OPENAI_DEPLOYMENT_NAME,
    messages=[
        {
            "role": "user",
            "content": instructions
        },
        {
            "role": "user",
            "content": content
        }
    ],
    prediction={
        "type": "content",
        "content": content,
    }
)

md = Markdown(response.choices[0].message.content)
console.print(md)
```

When you run this program, you will see LLM respond with all corrected words in the paragraph.

```shell
$ python.exe .\09_predicted_output.py
An embedding is a special format of data representation that machine learning models and algorithms can easily use.
The embedding is an information-dense representation of the semantic meaning of a piece of text.
Each embedding is a vector of floating-point numbers, such that the distance between two embeddings in the
vector space is correlated with semantic similarity between two inputs in the original format.
```

{{< figure src="/images/predicted-output.png" >}} {{< load-photoswipe >}}

This feature can be really useful in applications where you want to highlight spelling errors, code linting errors, and so on.








