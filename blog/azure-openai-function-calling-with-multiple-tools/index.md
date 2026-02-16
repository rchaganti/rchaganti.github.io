# Implementing multiple tool/function calling when using Azure OpenAI


In the [last article](https://ravichaganti.com/blog/azure-openai-function-calling/) of [this series](https://ravichaganti.com/series/azure-openai/), we learned about function/tool calling. Based on the prompt, the LLM indicates that we must call the `get_weather` tool. The LLM finally returns the answer to our prompt using the tool response. However, let us try to add a few more variables to our prompt. The updated prompt will be "What's the weather like in Bengaluru next week?".

```she
$ python .\05_function_calling.py
get_current_time called with location: Bengaluru
The current temperature in Bengaluru is approximately 28.2°C. However, for next week's weather prediction, you'd need a forecast service as I currently provide only current weather information.
```

LLM uses the `get_weather` tool to determine the current weather but fails to determine next week's weather. This is because we have not provided any tool for the LLM to determine what next week means. Determining the meaning of next week requires the knowledge of the current date and time. This article will demonstrate how to add multiple tool-calling capabilities to our program. With the updated script, you can receive the weather information for a specific date. 

In this example, I updated the prompt to read, "I am going to Austin next Monday. Based on the weather, suggest what kind of clothes I need to carry." Here is how the LLM will respond.

```shell
$ python .\06_multiple_function_calling.py
Tool call: parse_day with arguments: {"day_string":"next Monday"}
Tool call: get_weather with arguments: {"city_name":"Austin","date":"2024-08-19"}

The weather in Austin next Monday (August 19, 2024) is expected to be around 37°C. This is hot weather.

You should pack light and breathable clothing such as:
- T-shirts or short-sleeved shirts
- Shorts or lightweight pants
- Comfortable walking shoes or sandals
```

We can use the following function to translate the text representation of a day to a date.

```shell
def parse_day(day_string):
    """
    Parses a day string and returns a datetime.date object.

    Args:
        day_string: The string to parse (e.g., "today", "tomorrow", "next Monday").

    Returns:
        date as a strning, or invalid input if the input is invalid.
    """
    cal = parsedatetime.Calendar()
    time_struct, parse_status = cal.parse(day_string)

    if parse_status == 0:
        return "Invalid input"

    return json.dumps({
        "day_string": day_string,
        "date": datetime(*time_struct[:6]).strftime("%Y-%m-%d")
    })
```

The `parse_day` function uses the `parsedatetime` package and returns the date string in YYYY-MM-DD format. 

I am using the [VisualCrossing](https://www.visualcrossing.com/) weather API to get weather information for a specified date. We must also update the `get_weather` function to use the date supplied as the input parameter.

```python
def get_weather(city_name, date=None):
    """
    Get the weather at a given location on a given date or current weather.

    Args:
        city_name: The city name, e.g. Bengaluru.
        date: Date on which the weather at the given location should be determined. This defaults to the current weather when a date is not specified.

    Returns:
        JSON string with the city name, date, and temperature.
    """
    api_key = os.getenv("VISUAL_CROSSING_API_KEY")
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    request_url = f"https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/{city_name}/{date}?unitGroup=metric&key={api_key}&contentType=json"
    response = requests.get(request_url)

    if response.status_code != 200:
        return json.dumps({
            "error": "Invalid city name or date"
        })
    else:
        respJson = response.json()
        return json.dumps({
            "city_name": city_name,
            "date": date,
            "temperature": respJson["days"][0]["temp"]
        })
```

With these two tools in place, we can now focus on interacting with the LLM. The `get_model_response` function takes the conversation history as input and returns the LLM's response.

```python
def get_model_response(conversation_history):
    client = AzureOpenAI(
    azure_endpoint = AZURE_OPENAI_ENDPOINT, 
    api_key = AZURE_OPENAI_API_KEY,  
    api_version = "2024-02-01"
    )

    response = client.chat.completions.create(
        model=AZURE_OPENAI_DEPLOYMENT_NAME,
        messages=conversation_history,
        tools=tools,
        temperature=0.0,
        tool_choice="auto",
    )

    return response
```

The second function we need is a way to invoke the tool indicated by the LLM. 

```python
def get_tool_response(tool_name, tool_arguments):
    tools_args = json.loads(tool_arguments)                    
    tool_response = globals()[tool_name](**tools_args)
    return tool_response
```

The `get_tool_response` function takes the tool name and arguments as parameters. It then invokes the function and returns response from the tool call. These two functions are straightforward. The real logic for multi-turn tool calling is in the main block.

```python
    question = "I am going to Austin next week. Based on the weather, suggest what kind of cloths I need to carry."
    conversation_history = [
        {"role": "system", "content": "You are a helpful assistant. You should use the tools provided when needed to generate a response."},
        {"role": "user", "content": question}
    ]

    while True:
        response = get_model_response(conversation_history)
        response_message = response.choices[0].message

        if response_message.tool_calls:
            conversation_history.append({
                "role": "assistant", 
                "tool_calls": [tool_call.to_dict() for tool_call in response_message.tool_calls]
            })
            
            for tool_call in response_message.tool_calls:
                print(f"Tool call: {tool_call.function.name} with arguments: {tool_call.function.arguments}")
                tool_response = get_tool_response(tool_call.function.name, tool_call.function.arguments)
                conversation_history.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": tool_call.function.name,
                        "content": tool_response
                    }
                )
        else:
            print(response_message.content)
            break
```

In this block of code, we set the conversation history with a system message and the user's prompt. The system prompt tells the language model to use the tools as necessary to generate the response.

Within the `while` loop in this block, we check if the response contains any tool calls. If it does, we use the `get_tool_response` function to invoke the tool and return the response. We then update the conversation history to add the response from the tool call and invoke the `get_model_response` function again. This loop goes on until there are no more tool calls. Finally, we will return the final response generated by the LLM to the user.

This example demonstrated how to use multiple tool calls to generate the response a user intends to see. In some scenarios, such as another tool using the model's tool calling functionality, you may want to return structured output to the caller. We shall see that in the next part of this series.


