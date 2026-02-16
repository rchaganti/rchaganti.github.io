# Teams of agents in AutoGen


In the previous article in this series on Microsoft AutoGen, we looked at [how to get started with Microsoft AutoGen](https://ravichaganti.com/blog/getting-started-with-autogen-framework-for-building-ai-agents-and-applications/) and create a simple agent. We built a weather agent capable of retrieving real-time weather data. Through this demonstration, we gained an understanding of the basics of implementing an agent using the AutoGen framework. In this article, we will examine the process of building a team of agents or a multi-agent team to achieve a slightly more complex goal. We will start this exploration by building a single-agent team. Yes, you read that correctly. AutoGen allows you to create a single-agent team. This is useful in running an agent in a loop until a goal is achieved.

## A single-agent team

For this demonstration, we will construct an agent that identifies five random prime numbers within a specified range. The task is simple. The agent must use the tools to generate a random number, check if it is prime, and repeat this process until five prime numbers are found. Let's first examine the tools.

```python
def generate_number(start: int, end: int) -> int:
    """Generate a random number."""
    return random.randint(start,end)

def check_is_prime_number(number: int) -> bool:
    """check if the random number is a prime."""
    return isprime(number)
```

Let us now define an agent and equip it with the necessary tools.

```python
prime_number_assistant = AssistantAgent(
    "prime_number_assistant",
    model_client=model_client,
    tools=[generate_number, check_is_prime_number],
    system_message=""""
            You are a helpful AI assistant, use the tools to generate random number and check if the number is prime or not.
            Skip already generated or verified numbers.
            Respond with DONE when all required prime numbers are found and return all prime numbers you found."
        """
)

termination_condition = TextMentionTermination("DONE")
```

This definition should be familiar. This was mentioned in the earlier article. We use the `AssistantAgent` and give it a model to interact with. This is one of the [predefined agents](https://microsoft.github.io/autogen/stable/reference/python/autogen_agentchat.agents.html#autogen_agentchat.agents.AssistantAgent) in the AutoGen library and can use tools to perform actions. We specify the system message to define the role the agent needs to play clearly. We need to tell the agent when to stop. This is done by specifying a termination condition. AutoGen offers [various types of conditions](https://microsoft.github.io/autogen/stable/reference/python/autogen_agentchat.conditions.html#), and in this example, we will utilize the `TextMentionTermination` condition. This indicates to the agent that the conversation should be terminated when the specified text is mentioned.

We can now create a [team](https://microsoft.github.io/autogen/stable/reference/python/autogen_agentchat.teams.html). A simple method for creating a team is to use the `RoundRobinGroupChat`. A round-robin group chat is a team that runs a group chat, with participants taking turns in a round-robin fashion to publish a message to all. As we have only one agent in the team, it will be the only speaker.

Let us put this all together.

```python
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.conditions import TextMentionTermination
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_ext.models.openai import AzureOpenAIChatCompletionClient
from autogen_agentchat.ui import Console

from dotenv import load_dotenv
import os

import asyncio
import random
from sympy import isprime

load_dotenv(override=True)

api_key = os.getenv("AZURE_OPENAI_API_KEY")
model = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME")
endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
api_version = os.getenv("AZURE_OPENAI_API_VERSION")
model_client = AzureOpenAIChatCompletionClient(
    model=model,
    api_key=api_key,
    endpoint=endpoint,
    api_version=api_version,
)

def generate_number(start: int, end: int) -> int:
    """Generate a random number."""
    return random.randint(start,end)

def check_is_prime_number(number: int) -> bool:
    """check if the random number is a prime."""
    return isprime(number)

async def main():
    prime_number_assistant = AssistantAgent(
        "prime_number_assistant",
        model_client=model_client,
        tools=[generate_number, check_is_prime_number],
        system_message=""""
            You are a helpful AI assistant, use the tools to generate random number and check if the number is prime or not.
            Skip already generated or verified numbers.
            Respond with DONE when all required prime numbers are found and return all prime numbers you found."
        """
    )

    termination_condition = TextMentionTermination("DONE")

    team = RoundRobinGroupChat(
        [prime_number_assistant],
        termination_condition=termination_condition,
    )

    await team.reset()
    await Console(team.run_stream(task="Find 5 random prime numbers between 1 and 15."))

asyncio.run(main())
```

The `team.run_stream` is similar to the `on_messages_stream()` we saw in the earlier example. It runs the team and generates a stream of messages. When the agents finish, it produces a `TaksResult`. 

Let's see this agent in action.

```shell
$ python 03-single-agent-team.py
---------- user ----------
Find 5 random prime numbers between 1 and 15.
---------- prime_number_assistant ----------
[FunctionCall(id='call_FIOXaa8IiGRUI70sEeFgoQis', arguments='{"start":1,"end":15}', name='generate_number')]
---------- prime_number_assistant ----------
[FunctionExecutionResult(content='7', name='generate_number', call_id='call_FIOXaa8IiGRUI70sEeFgoQis', is_error=False)]
---------- prime_number_assistant ----------
7
---------- prime_number_assistant ----------
[FunctionCall(id='call_SukPoqLsvtMAoPQDzBRum13W', arguments='{"number":7}', name='check_is_prime_number')]
---------- prime_number_assistant ----------
[FunctionExecutionResult(content='True', name='check_is_prime_number', call_id='call_SukPoqLsvtMAoPQDzBRum13W', is_error=False)]
---------- prime_number_assistant ----------
True
---------- prime_number_assistant ----------
The number 7 is a prime number! I'll continue finding more prime numbers.
---------- prime_number_assistant ----------
[FunctionCall(id='call_D4jzf4NPU6YNazxR0Nei9fdq', arguments='{"start":1,"end":15}', name='generate_number')]
---------- prime_number_assistant ----------
[FunctionExecutionResult(content='5', name='generate_number', call_id='call_D4jzf4NPU6YNazxR0Nei9fdq', is_error=False)]
---------- prime_number_assistant ----------
5
---------- prime_number_assistant ----------
[FunctionCall(id='call_5HPqrpLlV9ifiRLgExtCcKNe', arguments='{"number":5}', name='check_is_prime_number')]
---------- prime_number_assistant ----------
[FunctionExecutionResult(content='True', name='check_is_prime_number', call_id='call_5HPqrpLlV9ifiRLgExtCcKNe', is_error=False)]
---------- prime_number_assistant ----------
True
---------- prime_number_assistant ----------
The number 5 is a prime number! I now have two prime numbers: 7 and 5. Continuing the search...
.....
---------- prime_number_assistant ----------
[FunctionCall(id='call_TIirUcHBylgJ9m2akMNdmxDm', arguments='{"start":1,"end":15}', name='generate_number')]
---------- prime_number_assistant ----------
[FunctionExecutionResult(content='7', name='generate_number', call_id='call_TIirUcHBylgJ9m2akMNdmxDm', is_error=False)]
---------- prime_number_assistant ----------
7
---------- prime_number_assistant ----------
[FunctionCall(id='call_u6J6zXAYEkYuSQ7uX65MhX1y', arguments='{"start":1,"end":15}', name='generate_number')]
---------- prime_number_assistant ----------
[FunctionExecutionResult(content='4', name='generate_number', call_id='call_u6J6zXAYEkYuSQ7uX65MhX1y', is_error=False)]
---------- prime_number_assistant ----------
4
---------- prime_number_assistant ----------
[FunctionCall(id='call_uibluZI0IljGmn9TXgFEN2P0', arguments='{"number":4}', name='check_is_prime_number')]
---------- prime_number_assistant ----------
[FunctionExecutionResult(content='False', name='check_is_prime_number', call_id='call_uibluZI0IljGmn9TXgFEN2P0', is_error=False)]
---------- prime_number_assistant ----------
False
---------- prime_number_assistant ----------
[FunctionCall(id='call_E2KrXXeIe7VpLzITrjcAavip', arguments='{"start":1,"end":15}', name='generate_number')]
---------- prime_number_assistant ----------
[FunctionExecutionResult(content='5', name='generate_number', call_id='call_E2KrXXeIe7VpLzITrjcAavip', is_error=False)]
---------- prime_number_assistant ----------
5
---------- prime_number_assistant ----------
[FunctionCall(id='call_Pm7KRu6DvRrdCVQz2ZeUlwG1', arguments='{"start":1,"end":15}', name='generate_number')]
---------- prime_number_assistant ----------
[FunctionExecutionResult(content='5', name='generate_number', call_id='call_Pm7KRu6DvRrdCVQz2ZeUlwG1', is_error=False)]
---------- prime_number_assistant ----------
5
---------- prime_number_assistant ----------
[FunctionCall(id='call_FYdvVQMvuBwUj8pPVr7RwbaH', arguments='{"start":1,"end":15}', name='generate_number')]
---------- prime_number_assistant ----------
[FunctionExecutionResult(content='2', name='generate_number', call_id='call_FYdvVQMvuBwUj8pPVr7RwbaH', is_error=False)]
---------- prime_number_assistant ----------
2
---------- prime_number_assistant ----------
[FunctionCall(id='call_aXZrxX6rj7Mfk5drOg2W8FLQ', arguments='{"number":2}', name='check_is_prime_number')]
---------- prime_number_assistant ----------
[FunctionExecutionResult(content='True', name='check_is_prime_number', call_id='call_aXZrxX6rj7Mfk5drOg2W8FLQ', is_error=False)]
---------- prime_number_assistant ----------
True
---------- prime_number_assistant ----------
The number 2 is a prime number! So far, I have three prime numbers: 7, 5, and 2. Let's find the remaining two.
---------- prime_number_assistant ----------
[FunctionCall(id='call_FZ4hFXuqsATSItZoZ5stXue0', arguments='{"start":1,"end":15}', name='generate_number')]
---------- prime_number_assistant ----------
[FunctionExecutionResult(content='5', name='generate_number', call_id='call_FZ4hFXuqsATSItZoZ5stXue0', is_error=False)]
---------- prime_number_assistant ----------
5
---------- prime_number_assistant ----------
[FunctionCall(id='call_4IbHsZYIq4Gw65URuXRCzT7T', arguments='{"start":1,"end":15}', name='generate_number')]
---------- prime_number_assistant ----------
[FunctionExecutionResult(content='11', name='generate_number', call_id='call_4IbHsZYIq4Gw65URuXRCzT7T', is_error=False)]
---------- prime_number_assistant ----------
11
---------- prime_number_assistant ----------
[FunctionCall(id='call_tLYwXnVPWV3j5Vu1Y0o4frEG', arguments='{"number":11}', name='check_is_prime_number')]
---------- prime_number_assistant ----------
[FunctionExecutionResult(content='True', name='check_is_prime_number', call_id='call_tLYwXnVPWV3j5Vu1Y0o4frEG', is_error=False)]
---------- prime_number_assistant ----------
True
---------- prime_number_assistant ----------
The number 11 is a prime number! So far, the prime numbers I've found are 7, 5, 2, and 11. Only one more to go.
---------- prime_number_assistant ----------
[FunctionCall(id='call_0tR2vGJ1QaTd05Ca4ZCQQ2RC', arguments='{"start":1,"end":15}', name='generate_number')]
---------- prime_number_assistant ----------
[FunctionExecutionResult(content='13', name='generate_number', call_id='call_0tR2vGJ1QaTd05Ca4ZCQQ2RC', is_error=False)]
---------- prime_number_assistant ----------
13
---------- prime_number_assistant ----------
[FunctionCall(id='call_1S9DTlNPcASj3bmSTM4NK3XS', arguments='{"number":13}', name='check_is_prime_number')]
---------- prime_number_assistant ----------
[FunctionExecutionResult(content='True', name='check_is_prime_number', call_id='call_1S9DTlNPcASj3bmSTM4NK3XS', is_error=False)]
---------- prime_number_assistant ----------
True
---------- prime_number_assistant ----------
The number 13 is a prime number!

I have now found 5 prime numbers: **7, 5, 2, 11, and 13**.
DONE
```

For brevity, I removed a few lines from the output. As you can see, the agent calls the `generate_number` and `check_is_prime_number` tools as necessary. Once all five random prime numbers are found, the agent terminates. If the random number generated has already been verified as a prime or non-prime, the model skips calling the `check_is_prime_number` tool. Essentially, it maintains the state without requiring us to provide it to the agent explicitly. As mentioned in the system message, the agent terminates once all five prime numbers are found.

Let's now examine the process of creating a multi-agent team.

## A multi-agent team

Creating a multi-agent team is not very different. Let us take the same task of deriving five random prime numbers. Instead of using a single agent, we will now distribute the work across two agents. Once again, we will use the predefined `AssistantAgent` type for this and continue to use the `RoundRobinGroupChat` for the team.

Let us look at the code.

```python
import asyncio

from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.base import TaskResult
from autogen_agentchat.conditions import ExternalTermination, TextMentionTermination
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_agentchat.ui import Console
from autogen_core import CancellationToken
from autogen_ext.models.openai import AzureOpenAIChatCompletionClient
import random
from sympy import isprime

import os
from dotenv import load_dotenv

load_dotenv(override=True)

def generate_number(start: int, end: int) -> int:
    """Generate a random number."""
    return random.randint(start,end)

def check_is_prime_number(number: int) -> bool:
    """check if the random number is a prime."""
    return isprime(number)

async def main():
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    model = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION")
    model_client = AzureOpenAIChatCompletionClient(
        model=model,
        api_key=api_key,
        endpoint=endpoint,
        api_version=api_version,
    )

    generator_agent = AssistantAgent(
        "generator",
        description="An agent that generates random numbers.",
        model_client=model_client,
        tools=[generate_number],
        system_message="""
        You are a numbers wizard. Use the tools to generate random number.
        Maintain a list of generated numbers. If a new number is generated, check if it is already in the list.
        If it is, generate a new number. If it is not, add it to the list and return the number.
        """,
    )

    verifier_agent = AssistantAgent(
        "verifier",
        description="An agent that verifies if a number is prime.",
        model_client=model_client,
        tools=[check_is_prime_number],
        system_message=""""
            You are a powerful calculator, use the tools to verify if a number is prime number.
            Skip already verified numbers.
            Respond with DONE when all required prime numbers are found and return all prime numbers you found."
        """
    )

    text_termination = TextMentionTermination("DONE")

    team = RoundRobinGroupChat([generator_agent, verifier_agent], termination_condition=text_termination)

    await team.reset()
    await Console(team.run_stream(task="Find 5 random prime numbers between 1 and 15."))

result = asyncio.run(main())
print(result)
```

We define two instances of `AssistantAgent` -- The `generator_agent` and the `verifier_agent`. We give each of these agents the tools they need. The behavior of two agents performing this task is different from the single-agent team. 

```shell
$ python 04-multi-agent-team.py
---------- user ----------
Find 5 random prime numbers between 1 and 15.
---------- generator ----------
[FunctionCall(id='call_894jeNfW7tCkahg4oFunruAq', arguments='{"start": 1, "end": 15}', name='generate_number'), FunctionCall(id='call_fH1d93NA2BHFcDyr8hlINvvJ', arguments='{"start": 1, "end": 15}', name='generate_number'), FunctionCall(id='call_eyKVFeDGGoe5uf2I7JIKddM4', arguments='{"start": 1, "end": 15}', name='generate_number'), FunctionCall(id='call_FnghutlmxBIQf74a6oGruByH', arguments='{"start": 1, "end": 15}', name='generate_number'), FunctionCall(id='call_vG6bzFg1EW1RIlHxGLQE52ii', arguments='{"start": 1, "end": 15}', name='generate_number')]
---------- generator ----------
[FunctionExecutionResult(content='15', name='generate_number', call_id='call_894jeNfW7tCkahg4oFunruAq', is_error=False), FunctionExecutionResult(content='11', name='generate_number', call_id='call_fH1d93NA2BHFcDyr8hlINvvJ', is_error=False), FunctionExecutionResult(content='1', name='generate_number', call_id='call_eyKVFeDGGoe5uf2I7JIKddM4', is_error=False), FunctionExecutionResult(content='2', name='generate_number', call_id='call_FnghutlmxBIQf74a6oGruByH', is_error=False), FunctionExecutionResult(content='10', name='generate_number', call_id='call_vG6bzFg1EW1RIlHxGLQE52ii', is_error=False)]
---------- generator ----------
15
11
1
2
10
---------- verifier ----------
[FunctionCall(id='call_2iCvwnnwpaboUgSVVNhRVl9O', arguments='{"number": 15}', name='check_is_prime_number'), FunctionCall(id='call_Su29tYoERzRYyredK2s4MeCj', arguments='{"number": 11}', name='check_is_prime_number'), FunctionCall(id='call_zAZEyK1RgQlxKlfKI2cwwP1W', arguments='{"number": 1}', name='check_is_prime_number'), FunctionCall(id='call_1aJQIBX9w063rjtLSGjZEmPW', arguments='{"number": 2}', name='check_is_prime_number'), FunctionCall(id='call_YaT7FkojUoHBR8ADvQkeJVAh', arguments='{"number": 10}', name='check_is_prime_number')]
---------- verifier ----------
[FunctionExecutionResult(content='False', name='check_is_prime_number', call_id='call_2iCvwnnwpaboUgSVVNhRVl9O', is_error=False), FunctionExecutionResult(content='True', name='check_is_prime_number', call_id='call_Su29tYoERzRYyredK2s4MeCj', is_error=False), FunctionExecutionResult(content='False', name='check_is_prime_number', call_id='call_zAZEyK1RgQlxKlfKI2cwwP1W', is_error=False), FunctionExecutionResult(content='True', name='check_is_prime_number', call_id='call_1aJQIBX9w063rjtLSGjZEmPW', is_error=False), FunctionExecutionResult(content='False', name='check_is_prime_number', call_id='call_YaT7FkojUoHBR8ADvQkeJVAh', is_error=False)]
---------- verifier ----------
False
True
False
True
False
---------- generator ----------
The random numbers generated are: **15, 11, 1, 2, and 10**.

Upon verification of whether they're prime or not:
- **15**: Not prime (divisible by 3 and 5).
- **11**: Prime.
- **1**: Not prime (prime numbers start from 2).
- **2**: Prime.
- **10**: Not prime (divisible by 2 and 5).

Let's filter and continue generating new random prime numbers until we obtain 5 unique prime numbers between 1 and 15. So far, we have two prime numbers (**11** and **2**). Let me generate three more.
---------- generator ----------
[FunctionCall(id='call_sJiRDadKeNIYRP36h8H636Dy', arguments='{"start": 1, "end": 15}', name='generate_number'), FunctionCall(id='call_0edqKSkqWOiuA2E0fgNbO6Vu', arguments='{"start": 1, "end": 15}', name='generate_number'), FunctionCall(id='call_J4qdolJj9xCFCa7gqr0nP8hE', arguments='{"start": 1, "end": 15}', name='generate_number')]
---------- generator ----------
[FunctionExecutionResult(content='15', name='generate_number', call_id='call_sJiRDadKeNIYRP36h8H636Dy', is_error=False), FunctionExecutionResult(content='8', name='generate_number', call_id='call_0edqKSkqWOiuA2E0fgNbO6Vu', is_error=False), FunctionExecutionResult(content='4', name='generate_number', call_id='call_J4qdolJj9xCFCa7gqr0nP8hE', is_error=False)]
---------- generator ----------
15
8
4
---------- verifier ----------
[FunctionCall(id='call_VF51HDANEX28kesdjEGmHdQi', arguments='{"number": 15}', name='check_is_prime_number'), FunctionCall(id='call_biagEfBKc8tM5CT6INB5Cvz8', arguments='{"number": 8}', name='check_is_prime_number'), FunctionCall(id='call_4JzDMXXf3a8fAcPGTCwRVW9w', arguments='{"number": 4}', name='check_is_prime_number')]
---------- verifier ----------
[FunctionExecutionResult(content='False', name='check_is_prime_number', call_id='call_VF51HDANEX28kesdjEGmHdQi', is_error=False), FunctionExecutionResult(content='False', name='check_is_prime_number', call_id='call_biagEfBKc8tM5CT6INB5Cvz8', is_error=False), FunctionExecutionResult(content='False', name='check_is_prime_number', call_id='call_4JzDMXXf3a8fAcPGTCwRVW9w', is_error=False)]
---------- verifier ----------
False
False
False
---------- generator ----------
The newly generated random numbers are: **15, 8, and 4**.

Upon verification:
- **15**: Not prime (divisible by 3 and 5).
- **8**: Not prime (divisible by 2).
- **4**: Not prime (divisible by 2).

Still, we only have two prime numbers (**11** and **2**) so far. Let me generate more until we reach 5 unique prime numbers.
---------- generator ----------
[FunctionCall(id='call_XsmXqy5UAvptmxCcCazNfwl6', arguments='{"start": 1, "end": 15}', name='generate_number'), FunctionCall(id='call_MHznHp9uqfg4NVc113zmUPuO', arguments='{"start": 1, "end": 15}', name='generate_number'), FunctionCall(id='call_4cGoESKrN7cNcUcsiMYGThQM', arguments='{"start": 1, "end": 15}', name='generate_number')]
---------- generator ----------
[FunctionExecutionResult(content='6', name='generate_number', call_id='call_XsmXqy5UAvptmxCcCazNfwl6', is_error=False), FunctionExecutionResult(content='4', name='generate_number', call_id='call_MHznHp9uqfg4NVc113zmUPuO', is_error=False), FunctionExecutionResult(content='2', name='generate_number', call_id='call_4cGoESKrN7cNcUcsiMYGThQM', is_error=False)]
---------- generator ----------
6
4
2
---------- verifier ----------
Skipping already verified number "2".
---------- verifier ----------
[FunctionCall(id='call_aZY6dD90AaxB7pZM6jTwroyU', arguments='{"number": 6}', name='check_is_prime_number'), FunctionCall(id='call_RAMqj1UNgU0fxpHx1ggCtWgm', arguments='{"number": 4}', name='check_is_prime_number')]
---------- verifier ----------
[FunctionExecutionResult(content='False', name='check_is_prime_number', call_id='call_aZY6dD90AaxB7pZM6jTwroyU', is_error=False), FunctionExecutionResult(content='False', name='check_is_prime_number', call_id='call_RAMqj1UNgU0fxpHx1ggCtWgm', is_error=False)]
---------- verifier ----------
False
False
---------- generator ----------
The newly generated random numbers are: **6**, **4**, and **2**.

Upon verification:
- **6**: Not prime (divisible by 2 and 3).
- **4**: Not prime (divisible by 2).
- **2**: Already identified as prime, but it is not unique in this process.

To summarize, we still only have two unique prime numbers (**11** and **2**). I'll proceed to generate more numbers until we achieve 5 unique prime numbers.
---------- generator ----------
[FunctionCall(id='call_xdyKFh35FzGs50YPq5rWSjZF', arguments='{"start": 1, "end": 15}', name='generate_number'), FunctionCall(id='call_p9xk79X8lLREn2CRr01qZq44', arguments='{"start": 1, "end": 15}', name='generate_number'), FunctionCall(id='call_DyC3tYI711jOZ3JBD9mOBSF5', arguments='{"start": 1, "end": 15}', name='generate_number')]
---------- generator ----------
[FunctionExecutionResult(content='8', name='generate_number', call_id='call_xdyKFh35FzGs50YPq5rWSjZF', is_error=False), FunctionExecutionResult(content='6', name='generate_number', call_id='call_p9xk79X8lLREn2CRr01qZq44', is_error=False), FunctionExecutionResult(content='5', name='generate_number', call_id='call_DyC3tYI711jOZ3JBD9mOBSF5', is_error=False)]
---------- generator ----------
8
6
5
---------- verifier ----------
[FunctionCall(id='call_yeaYJyH84xwmy4qy7tcSaCv5', arguments='{"number": 8}', name='check_is_prime_number'), FunctionCall(id='call_63MzDx5TP4OQqtegd2hlJHhk', arguments='{"number": 6}', name='check_is_prime_number'), FunctionCall(id='call_nh4Kbzw8zQt8dsYSk8AbDeWJ', arguments='{"number": 5}', name='check_is_prime_number')]
---------- verifier ----------
[FunctionExecutionResult(content='False', name='check_is_prime_number', call_id='call_yeaYJyH84xwmy4qy7tcSaCv5', is_error=False), FunctionExecutionResult(content='False', name='check_is_prime_number', call_id='call_63MzDx5TP4OQqtegd2hlJHhk', is_error=False), FunctionExecutionResult(content='True', name='check_is_prime_number', call_id='call_nh4Kbzw8zQt8dsYSk8AbDeWJ', is_error=False)]
---------- verifier ----------
False
False
True
---------- generator ----------
The newly generated random numbers are: **8**, **6**, and **5**.

Upon verification:
- **8**: Not prime (divisible by 2).
- **6**: Not prime (divisible by 2 and 3).
- **5**: Prime.

Now we have three unique prime numbers: **11**, **2**, and **5**. We need two more. Generating additional numbers.
---------- generator ----------
[FunctionCall(id='call_jFPQ1YEM80bIwR1E1jGTKVot', arguments='{"start": 1, "end": 15}', name='generate_number'), FunctionCall(id='call_Kjrf499UylUV232SF4Id4Mca', arguments='{"start": 1, "end": 15}', name='generate_number'), FunctionCall(id='call_RLKqvfwdY5PZxDos3Zr9rXwI', arguments='{"start": 1, "end": 15}', name='generate_number')]
---------- generator ----------
[FunctionExecutionResult(content='2', name='generate_number', call_id='call_jFPQ1YEM80bIwR1E1jGTKVot', is_error=False), FunctionExecutionResult(content='8', name='generate_number', call_id='call_Kjrf499UylUV232SF4Id4Mca', is_error=False), FunctionExecutionResult(content='2', name='generate_number', call_id='call_RLKqvfwdY5PZxDos3Zr9rXwI', is_error=False)]
---------- generator ----------
2
8
2
---------- verifier ----------
[FunctionCall(id='call_WUndSjvxaKwx99xlXBcAMZyL', arguments='{"number": 8}', name='check_is_prime_number')]
---------- verifier ----------
[FunctionExecutionResult(content='False', name='check_is_prime_number', call_id='call_WUndSjvxaKwx99xlXBcAMZyL', is_error=False)]
---------- verifier ----------
False
---------- generator ----------
[FunctionCall(id='call_RK6WeByLnudd85EMQpBAptPD', arguments='{"start": 1, "end": 15}', name='generate_number'), FunctionCall(id='call_4ltyvOuEGC0boIZO1tKdKowx', arguments='{"start": 1, "end": 15}', name='generate_number'), FunctionCall(id='call_9xUdr2fX1YEARIbTxQHhkCuX', arguments='{"start": 1, "end": 15}', name='generate_number')]
---------- generator ----------
[FunctionExecutionResult(content='2', name='generate_number', call_id='call_RK6WeByLnudd85EMQpBAptPD', is_error=False), FunctionExecutionResult(content='2', name='generate_number', call_id='call_4ltyvOuEGC0boIZO1tKdKowx', is_error=False), FunctionExecutionResult(content='12', name='generate_number', call_id='call_9xUdr2fX1YEARIbTxQHhkCuX', is_error=False)]
---------- generator ----------
2
2
12
---------- verifier ----------
[FunctionCall(id='call_RZoKcfjoOgCSRX2f47pQgFqk', arguments='{"number":12}', name='check_is_prime_number')]
---------- verifier ----------
[FunctionExecutionResult(content='False', name='check_is_prime_number', call_id='call_RZoKcfjoOgCSRX2f47pQgFqk', is_error=False)]
---------- verifier ----------
False
---------- generator ----------
[FunctionCall(id='call_ekpU1QikKZeINATnJNJUwazo', arguments='{"start": 1, "end": 15}', name='generate_number'), FunctionCall(id='call_5Dhm659YhWbvjPoPyoLN26K8', arguments='{"start": 1, "end": 15}', name='generate_number'), FunctionCall(id='call_L6HHEr1BiRIbtL1lmwvEiG7S', arguments='{"start": 1, "end": 15}', name='generate_number')]
---------- generator ----------
[FunctionExecutionResult(content='13', name='generate_number', call_id='call_ekpU1QikKZeINATnJNJUwazo', is_error=False), FunctionExecutionResult(content='13', name='generate_number', call_id='call_5Dhm659YhWbvjPoPyoLN26K8', is_error=False), FunctionExecutionResult(content='3', name='generate_number', call_id='call_L6HHEr1BiRIbtL1lmwvEiG7S', is_error=False)]
---------- generator ----------
13
13
3
---------- verifier ----------
[FunctionCall(id='call_ZlprPJLLfm6CnphIpkeTKJOg', arguments='{"number": 13}', name='check_is_prime_number'), FunctionCall(id='call_0ugsQ0h8YfwuBONedlCkw57k', arguments='{"number": 3}', name='check_is_prime_number')]
---------- verifier ----------
[FunctionExecutionResult(content='True', name='check_is_prime_number', call_id='call_ZlprPJLLfm6CnphIpkeTKJOg', is_error=False), FunctionExecutionResult(content='True', name='check_is_prime_number', call_id='call_0ugsQ0h8YfwuBONedlCkw57k', is_error=False)]
---------- verifier ----------
True
True
---------- generator ----------
The newly generated numbers are **13**, **13**, and **3**.

Upon verification:
- **13**: Prime.
- **13**: Already identified above (duplicate).
- **3**: Prime.

Now we have five unique prime numbers: **11**, **2**, **5**, **13**, and **3**.

Final list of random prime numbers between 1 and 15: **11, 2, 5, 13, 3**.
---------- verifier ----------
DONE. The 5 random prime numbers between 1 and 15 are: **11, 2, 5, 13, 3**.
```

The `generator_agent` generates all five numbers at a time. The `verifier_agent` finds two prime numbers out of the five. In the next turn, the generator generates only three random numbers as we need only three more prime numbers. This goes on until the task is complete. This is much more efficient than an agent generating one number and the second one verifying the number in a sequence.

The team behavior may change based on the type of team we select to implement. We will explore more on this in the next part of this series.

