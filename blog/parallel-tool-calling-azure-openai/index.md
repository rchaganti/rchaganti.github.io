# Parallel tool calling in Azure OpenAI


We have learned to perform single- and multi-tool calling with the Azure OpenAI API for chat completions. This part of the [series](https://ravichaganti.com/series/azure-openai/) on Azure OpenAI will describe the parallel tool calling feature and how to implement it. Parallel tool calling allows you to perform multiple calls together. This enables parallel execution, result retrieval, and fewer calls to the LLM. Parallelizing tool calls improves overall performance.

In a previous example on retrieving weather at a given location, we examined how to iterate over the LLM response for tool calls and append it to the conversation history before making the next LLM API call.

```python
for tool_call in response_message.tool_calls:
    if tool_call.function.name == "get_weather":
        function_args = json.loads(tool_call.function.arguments)                    
        weather_response = get_weather(
            city_name=function_args.get("city_name")
        )

        conversation_history.append({                        
            "role": "tool",
            "tool_call_id": tool_call.id,
            "name": "get_weather",
            "content": weather_response,
        })
        final_response = client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT_NAME,
            messages=conversation_history,
            tools = tools,
        )

        return final_response.choices[0].message.content
```

In this method, we request the final response from LLM, causing it to use the response from the tool immediately. If we change the prompt from "What's the weather like in Bengaluru?" to "What's the weather like in Bengaluru, London, and Austin?", the above logic will run in a sequence and result in three LLM API calls. We can make a trivial change to this function and reduce the number of LLM API calls.

```python
for tool_call in response_message.tool_calls:
    if tool_call.function.name == "get_weather":
        function_args = json.loads(tool_call.function.arguments)                    
        weather_response = get_weather(
            city_name=function_args.get("city_name")
        )

        conversation_history.append({                        
            "role": "tool",
            "tool_call_id": tool_call.id,
            "name": "get_weather",
            "content": weather_response,
        })

final_response = client.chat.completions.create(
    model=AZURE_OPENAI_DEPLOYMENT_NAME,
    messages=conversation_history,
    tools = tools,
)

return final_response.choices[0].message.content
```

As you see above, we moved the final response block out of the for loop. This sends one consolidated API call to the LLM with all three responses retrieved from the `get_weather` tool.

```shell
$ python 08_parallel_function_calling.py
The current weather conditions are as follows:

- **Bengaluru**: 26.6°C
- **London**: 4.2°C
- **Austin**: 16.9°C
```

This is a short post for today. We will continue to learn about Azure OpenAI in this series of articles.

