# Local model serving - Using Foundry Local


In this series of articles on local model serving, we learned about using [Ollama](https://ai-engineer.in/post/local-model-serving-using-ollama/), [Docker Model Runner](https://ai-engineer.in/post/local-model-serving-using-docker-model-runner/), and [LMStudio](https://ai-engineer.in/post/local-model-serving-using-lmstudio/). At Build 2025, [Microsoft announced Foundry Local](https://devblogs.microsoft.com/foundry/foundry-local-a-new-era-of-edge-ai/). This is specifically designed for running AI models on resource-constrained devices, making it ideal for local AI inference on edge devices. Foundry Local features model management and deployment via a [command-line interface](https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-local/reference/reference-cli), and offers an OpenAI API-compatible [RESTful API](https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-local/reference/reference-rest). It also supports Python, C#, Rust, and JavaScript [SDKs for local AI model management](https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-local/reference/reference-sdk).

## Foundry Local Architecture

Before we delve into the details of using Foundry Local for AI inference, let's understand its architecture and components.

![Foundry Local Architecture](https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-local/media/architecture/foundry-local-arch.png)

The *model management* component in this architecture is responsible for managing the model lifecycle, compiling models, and maintaining the model cache. The model lifecycle includes downloading, loading, running, unloading, and deleting models from the local cache.

The [*ONNX runtime*](https://onnxruntime.ai/) is the key component of this architecture. ONNX is a cross-platform ML model accelerator that supports models from PyTorch, JAX, and other frameworks. This runtime is responsible for executing the models and supports multiple hardware providers and device types.

The *Foundry Local service* is the OpenAI-compatible REST API interface for working with the inference engine. This REST API endpoint can be used with any programming language to interact with the inference endpoint. This service also provides the REST interface for model management.

With this brief overview of the Foundry Local architecture, let us now dive into the how!

## Basics

Foundry Local service needs to be installed on the local Windows or macOS system. On Windows, you can use *winget* to install Foundry Local.

```shell
winget install Microsoft.FoundryLocal
```

Once the service is installed, you can use the `foundry service status` command to check its status.

```shell
PS C:\> foundry service status
🟢 Model management service is running on http://127.0.0.1:11223/openai/status
EP autoregistration status: Successfully downloaded and registered the following EPs: OpenVINOExecutionProvider.
Valid EPs: CPUExecutionProvider, WebGpuExecutionProvider, OpenVINOExecutionProvider
```

Foundry Local chooses a random port every time the service restarts. To avoid that, you can use the following command to configure a fixed port number.

```shell
PS C:\> foundry service set --port 22334
Saving new settings
Restarting service...
🔴 Service is stopped.
🟢 Service is Started on http://127.0.0.1:22334/, PID 14444!
```

`foundry cache location` command returns the model cache directory path.

```shell
PS C:\> foundry cache location
💾 Cache directory path: C:\Users\ravik\.foundry\cache\models
```

If you want to move the model cache to a different path, you can use the `foundry service set --cachedir` command and supply the new directory path as the argument.

To view the existing service configuration, run the `foundry service set --show` command.

```shell
PS C:\> foundry service set --show
No settings changed
{
  "defaultLogLevel": 2,
  "serviceSettings": {
    "host": "127.0.0.1",
    "port": 22334,
    "cacheDirectoryPath": "C:\\Users\\ravik\\.foundry\\cache\\models",
    "schema": "http",
    "pipeName": "inference_agent",
    "defaultSecondsForModelTTL": 600,
    "initialConnectionTimeoutInSeconds": 6
  }
}
```

To list all models available to run locally, use `foundry model list` command. This command lists all models available in the Foundry catalog

The `foundry model run` command runs a model for inference. This command starts an interactive session. If the model is not present in the local model cache, it gets downloaded. If you want to download the model but not run it immediately, you can use `foundry model download` command.

```shell
PS C:\> foundry model run phi-3.5-mini
Model Phi-3.5-mini-instruct-openvino-gpu:1 was found in the local cache.

Interactive Chat. Enter /? or /help for help.
Press Ctrl+C to cancel generation. Type /exit to leave the chat.

Interactive mode, please enter your prompt
> In one line, What is Azure?
🧠 Thinking...
🤖  Azure is Microsoft'fertilized cloud computing platform offering a range of cloud services, including storage, databases, AI, and virtual machines.
```

The `foundry model load` command loads the model from the cache for inference.

```shell
PS C:\> foundry model load qwen2.5-0.5b
🕓 Loading model...
🟢 Model qwen2.5-0.5b loaded successfully
```

By default, a model loaded this way lives for only 600 seconds. To change that, you can specify the `--ttl` optional parameter. You can retrieve a list of all models using the `foundry service ps` command. 

```shell
PS C:\> foundry service ps
Models running in service:
    Alias                          Model ID
🟢  qwen2.5-0.5b                   qwen2.5-0.5b-instruct-openvino-gpu:2
```

## Inference API

The real goal of local AI inference is to develop and use AI applications. We need to use the inference API for this. Loading a model to the foundry service enables the inference interface to the model. 

Let us first list the loaded models using the REST API.

```shell
PS C:\> (curl http://127.0.0.1:22334/v1/models).content
{"data":[{"vision":false,"toolCalling":false,"maxInputTokens":114688,"maxOutputTokens":16384,"id":"Phi-3.5-mini-instruct-openvino-gpu:1","owned_by":"Microsoft","permission":[],"created":1763477048,"CreatedTime":"2025-11-18T14:44:08+00:00","IsDelta":false,"Successful":true,"HttpStatusCode":0,"object":"model"},{"vision":false,"toolCalling":false,"maxInputTokens":28672,"maxOutputTokens":4096,"id":"qwen2.5-0.5b-instruct-openvino-gpu:2","owned_by":"Microsoft","permission":[],"created":1763466301,"CreatedTime":"2025-11-18T11:45:01+00:00","IsDelta":false,"Successful":true,"HttpStatusCode":0,"object":"model"}],"IsDelta":false,"Successful":true,"HttpStatusCode":0,"object":"list"}
```

The `/v1/chat/completions` endpoint can be used to create a chat completion.

```shell
PS C:\> $body = @"
>> {
>> "model":"Phi-3.5-mini-instruct-openvino-gpu:1",
>> "messages":[
>> {
>> "role":"user",
>> "content":"In one line, what is Azure?"
>> }
>> ]
>> }
>> "@

PS C:\> ((Invoke-WebRequest -Uri http://127.0.0.1:22334/v1/chat/completions -Method Post -ContentType "application/json" -Body $body).content | ConvertFrom-Json).Choices[0].delta.content
 Azure is Microsoft'fertility cloud computing service offering infrastructure, platforms, and services as a whole.
```

We have got the inference working with the local model. This is a simple PowerShell command to invoke the chat completion API. You can, of course, use any OpenAI-compatible SDK in your favorite language to perform the same inference action.

```python
import openai
from foundry_local import FoundryLocalManager

alias = "Phi-3.5-mini"
manager = FoundryLocalManager(alias)

client = openai.OpenAI(
    base_url=manager.endpoint,
    api_key=manager.api_key
)

response = client.chat.completions.create(
    model=manager.get_model_info(alias).id,
    messages=[{"role": "user", "content": "In one line, what is Azure?"}]
)
print(response.choices[0].message.content)
```

This is a quick overview of how Foundry Local can help with local AI inference on resource-constrained devices. In the later parts of this series, we will learn more about using Foundry Local models for different use cases. 

{{< notice "info" >}}
  Last updated: 18th November 2025
{{< /notice >}}

