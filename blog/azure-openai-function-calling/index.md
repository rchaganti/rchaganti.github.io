# Implementing tool/function calling when using Azure OpenAI


In the last article of [this series](https://ravichaganti.com/series/azure-openai/), we learned how to use the chat completion API. Towards the end, we learned that the LLMs have a knowledge cut-off date and no real-time access to information. However, this can be bridged using the tool/function calling feature of Azure OpenAI service. In this article, we shall learn how to implement tool calling.

Azure OpenAI's function calling capability lets you connect your language models to external tools and APIs, enabling them to perform a wider range of tasks and access real-time information. This opens up a world of possibilities, allowing your models to interact with the real world in ways never imagined.

### The Power of Tool Calling

Imagine asking your language model to "Book a flight from Bengaluru to Delhi next Monday." Without tool calling, the model could only provide general flight information or suggest potential airlines. But with tool calling, it can directly interact with a flight booking API, search for available flights, compare prices, and even make the booking for you!

This is just one example of how tool calling can empower your language models. Other use cases include:

- Retrieving real-time data like weather forecasts, stock prices, or news updates
- Performing actions like sending emails, scheduling appointments, or controlling smart home devices
- Accessing proprietary information from your databases or internal systems

### Implementing tools

To implement tool calling, you must first implement the necessary tools or functions. For this purpose, we shall build a function that retrieves real-time weather information for a given location. We will use [Open Weather Map API](https://openweathermap.org/api) for this purpose. You can sign up and get an API key to work with this API.

```python
def get_weather(city_name):
    """Get the current weather for a given location"""
    print(f"get_current_time called with location: {city_name}")  
    city_lower = city_name.lower()

    api_key = os.getenv("OPEN_WEATHER_API_KEY")
    base_url = "http://api.openweathermap.org/data/2.5/weather?"
    complete_url = base_url + "appid=" + api_key + "&q=" + city_lower
    
    response = requests.get(complete_url)
    respJson = response.json()
    return json.dumps({
        "city_name": city_name,
        "temperature": respJson["main"]["temp"]
    })
```

This function retrieves weather data for a given city using the OpenWeatherMap API. It accepts the city name as input, constructs the API URL, makes the request, and returns the JSON response containing the temperature. Besides the logic, the structure of this function is important to consider as a tool. The function must have a doc string that describes its purpose. It needs to return a JSON object. Once we have this function, we can look at the code that interacts with the LLM.

### Implementing tool calling

We implement tool calling and LLM interaction as the get_response function in this example. Within the function, we must define the available tools, which are identified by the `tools` list.

```python
def get_response(prompt):
    # Define the available tools
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get the current weather for a given location",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "city_name": {
                            "type": "string",
                            "description": "The city name, e.g. Bengaluru",
                        },
                    },
                    "required": ["city_name"],
                },
            }
        }
    ]

    # Initialize the conversation history
    conversation_history = [
        {"role": "system", "content": "You are a helpful assistant. You should use the tools provided when needed to generate a response. When asked about the 	 weather, return the response in Celsius."},
        {"role": "user", "content": prompt}
    ]

    # Create an Azure OpenAI client
    client = AzureOpenAI(
        azure_endpoint = AZURE_OPENAI_ENDPOINT, 
        api_key = AZURE_OPENAI_API_KEY,  
        api_version = "2024-02-01"
    )

    # Send the initial prompt to the model
    response = client.chat.completions.create(
        model=AZURE_OPENAI_DEPLOYMENT_NAME,
        messages=conversation_history,
        tools=tools,
        tool_choice="auto",
    )

    response_message = response.choices.message

    # Check if the model wants to use any tools
    if response_message.tool_calls:
        # Add the tool call to the conversation history
        conversation_history.append({
            "role": "assistant", 
            "tool_calls": [tool_call.to_dict() for tool_call in response_message.tool_calls]
        })
        # Iterate through the tool calls
        for tool_call in response_message.tool_calls:
            if tool_call.function.name == "get_weather":
                # Extract the function arguments
                function_args = json.loads(tool_call.function.arguments)
                print(f"Function arguments: {function_args}")
                # Call the get_weather function with the provided arguments
                weather_response = get_weather(
                    city_name=function_args.get("city_name")
                )

                # Add the tool response to the conversation history
                conversation_history.append({                        
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": "get_weather",
                    "content": weather_response,
                })
                # Send the updated conversation history back to the model
                final_response = client.chat.completions.create(
                    model=AZURE_OPENAI_DEPLOYMENT_NAME,
                    messages=conversation_history,
                    tools = tools,
                )

                return final_response.choices.message.content
    else:
        # If no tool calls are required, return the initial response
        return response_message.content
```

We defined a system prompt that tells the LLM to use the tools when available. We add the user-supplied prompt to it and then invoke the API to get a response. If the user's prompt includes a question about the weather at some location, the LLM determines that the get_weather tools must be invoked and indicates the same in response to the user. The response handling function, `get_response`, must handle this, call the tool with the identified arguments, and send the response back to the LLM as the response from the tool call.

```python
conversation_history.append({
   "role": "assistant", 
   "tool_calls": [tool_call.to_dict() for tool_call in response_message.tool_calls]
})
```

I want to re-iterate that calling tools indicated by the LLM is the application's responsibility. LLM never calls the tools directly. 

Once the tool call response, along with the prior conversation history, is provided to the LLM, the LLM's final response includes the answer to the user's prompt.

We can include a call to the `get_response` function to invoke the workflow.

```python
if __name__ == "__main__":
  question = "What's the weather like in Bengaluru?"
  response = get_response(question)
  print(response)
```

Here is the response for a user prompt "*What's the weather like in Bengaluru?*"

```shell
(.venv) PS C:\> python.exe .\05_function_calling.py
get_current_time called with location: Bengaluru
The current temperature in Bengaluru is approximately 23°C.
```

If the prompt does not contain any request for weather information, LLM would behave normally.

```shell
(.venv) PS C:\> python.exe .\05_function_calling.py
I currently don't have access to real-time traffic information. You can check platforms such as Google Maps, Waze, or local traffic apps for up-to-date traffic conditions in Bengaluru. Let me know if there's anything else I can assist you with!
```

This is a good start. This example showed only one tool definition. However, you can provide any number of tools, and as long as those tools are adequately described, the LLM will be able to indicate what tools to call iteratively. In the next article in this series, we will look at that.

