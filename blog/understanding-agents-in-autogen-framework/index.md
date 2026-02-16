# Understanding Agents in Microsoft AutoGen framework


In the previous parts of this series on the [Microsoft AutoGen framework](https://ravichaganti.com/series/autogen/), we looked at how to get started with the AutoGen framework. We examined the process of building a simple agent using the prebuilt `AssistantAgent` in AutoGen and explored the development of a multi-agent team. 

However, what is an agent in the context of AutoGen? How do agents communicate with each other? I needed answers to these questions before proceeding to the next step in using AutoGen to build larger, multi-agent applications. So, I started exploring the `Core` package upon which the `autogen-chat` is built. This article is a result of that exploration. 

To understand the fundamentals, I used the quick-start [example](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/quickstart.html) as a starting point and modified it. While the quick-start example demonstrates two agents coordinating to count down from 10 to 1, the modified example in this article uses two agents to generate ten random prime numbers. 

An agent in the context of AutoGen is defined as:

> An **agent** is a software entity that communicates via messages, maintains state, and performs actions in response to received messages or state changes. These actions may modify the agent’s state and produce external effects, such as updating message logs, sending new messages, executing code, or making API calls.

Each agent is a self-contained unit of execution that can be developed, tested, and deployed independently.

Let's dive into the code.

## The Basics

Before anything else, ensure that you have [installed](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/installation.html) the `autogen-core` package.

```shell
$ pip install "autogen-core"
```

AutoGen core is the event-driven actor framework for creating agentic workflows. This package provides message-passing, event-driven agents, as well as local and distributed agent runtimes. In the [actor model](https://en.wikipedia.org/wiki/Actor_model), an actor is an entity that, in response to a message it receives, can concurrently send a finite number of messages to other actors, create a finite number of new actors, and designate the behavior to be used for the next message it receives. These actions could be carried out in parallel. 

Let us first define the agent and its logic for handling messages.

```python
from dataclasses import dataclass
from typing import Callable
import asyncio
from sympy import isprime
import random

from autogen_core import DefaultTopicId, MessageContext, RoutedAgent, default_subscription, message_handler
from autogen_core import AgentId, SingleThreadedAgentRuntime

@dataclass
class Message:
    content: int

@default_subscription
class Generator(RoutedAgent):
    def __init__(self, generate_val: Callable[[], int]) -> None:
        super().__init__("A generator agent.")
        self._generate_val = generate_val

    @message_handler
    async def handle_message(self, message: Message, ctx: MessageContext) -> None:
        val = self._generate_val()
        print(f"{'-'*80}\nGenerator:\nWe got {message.content} prime numbers. \nNext number is {val}")
        await self.publish_message(Message(content=val), DefaultTopicId())


@default_subscription
class Checker(RoutedAgent):
    def __init__(self, run_until: Callable[[int], bool]) -> None:
        super().__init__("A checker agent.")
        self.count = 0
        self._run_until = run_until
        self.prime_numbers = []

    @message_handler
    async def handle_message(self, message: Message, ctx: MessageContext) -> None:
        if message.content not in self.prime_numbers:
            if isprime(message.content):            
                self.count = self.count+1
                self.prime_numbers.append(message.content)
                if not self._run_until(self.count):
                    print(f"{'-'*80}\nChecker:\n{message.content} is a prime number, continue to next.")
                    await self.publish_message(Message(content=self.count), DefaultTopicId())
                else:                
                    print(f"{'-'*80}\nChecker:\nWe got {self.count} prime numbers, stopping.")
                    print(f"{'-'*80}\nPrime numbers generated: {self.prime_numbers}")
            else:
                print(f"{'-'*80}\nChecker:\n{message.content} is not a prime number, generate next.")
                await self.publish_message(Message(content=self.count), DefaultTopicId())
        else:
            print(f"{'-'*80}\nChecker:\n{message.content} exists in the generated prime numbers, continue to next.")
            await self.publish_message(Message(content=self.count), DefaultTopicId())
```

The `Message` data class defines the messages passed between agents. The `Generator` agent generates a random number, while the `Checker` agent verifies whether the random number received as a message is prime. Each agent defines a method for handling messages. This is indicated using the `@message_handler` decorator. The method you designate as the message handler must be asynchronous and must have three arguments: `self`, `message`, and `context`.  

The agent runtime is a key component of the AutoGen framework. This provides the communication infrastructure required for agent-to-agent communication. The runtime handles agent creation and agents' lifecycle. In this example, we use a `SingleThreadedAgentRuntime,` which is most suitable for development and standalone applications. This runtime processes all messages using a single `asyncio` queue. We can create a runtime using the `SingleThreadedAgentRuntime()` method. Once a runtime is created, we need to register the agents.

```python
await Generator.register(
    runtime,
    "generator",
    lambda: Generator(generate_val=lambda: random.randint(1, 15)),
)

await Checker.register(
    runtime,
    "checker",
    lambda: Checker(run_until=lambda count: count >= 5),
)
```

Within each agent's registration, we supply a lambda function that is used as an action when a message is received. The `Generator` agent uses `random.randint(1, 15)` as the lambda while the `Checker` agent checks for the condition `count >= 5`. 

```python
async def main():
    runtime = SingleThreadedAgentRuntime()

    await Generator.register(
        runtime,
        "generator",
        lambda: Generator(generate_val=lambda: random.randint(1, 15)),
    )

    await Checker.register(
        runtime,
        "checker",
        lambda: Checker(run_until=lambda count: count >= 5),
    )

    runtime.start()
    await runtime.send_message(Message(1), AgentId("checker", "default"))
    await runtime.stop_when_idle()

asyncio.run(main())
```

To start the runtime, we need to call `runtime.start()`. The `send_message` method can be used to initiate the conversation between the agents. In this example, we send `Message(1)` as the initial message. `runtime.stop_when_idle()` specifies that the runtime should stop when it is idle.

```shell
$ python 05-autogencore-basics.py
--------------------------------------------------------------------------------
Checker:
1 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 0 prime numbers. 
Next number is 8
--------------------------------------------------------------------------------
Checker:
8 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 0 prime numbers. 
Next number is 4
--------------------------------------------------------------------------------
Checker:
4 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 0 prime numbers. 
Next number is 11
--------------------------------------------------------------------------------
Checker:
11 is a prime number, continue to next.
--------------------------------------------------------------------------------
Generator:
We got 1 prime numbers. 
Next number is 7
--------------------------------------------------------------------------------
Checker:
7 is a prime number, continue to next.
--------------------------------------------------------------------------------
Generator:
We got 2 prime numbers. 
Next number is 4
--------------------------------------------------------------------------------
Checker:
4 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 2 prime numbers. 
Next number is 15
--------------------------------------------------------------------------------
Checker:
15 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 2 prime numbers. 
Next number is 8
--------------------------------------------------------------------------------
Checker:
8 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 2 prime numbers. 
Next number is 10
--------------------------------------------------------------------------------
Checker:
10 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 2 prime numbers.
Next number is 10
--------------------------------------------------------------------------------
Checker:
10 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 2 prime numbers.
Next number is 7
--------------------------------------------------------------------------------
Checker:
7 exists in the generated prime numbers, continue to next.
--------------------------------------------------------------------------------
Generator:
We got 2 prime numbers.
Next number is 4
--------------------------------------------------------------------------------
Checker:
4 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 2 prime numbers.
Next number is 6
--------------------------------------------------------------------------------
Checker:
6 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 2 prime numbers.
Next number is 6
--------------------------------------------------------------------------------
Checker:
6 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 2 prime numbers.
Next number is 2
--------------------------------------------------------------------------------
Checker:
2 is a prime number, continue to next.
--------------------------------------------------------------------------------
Generator:
We got 3 prime numbers.
Next number is 7
--------------------------------------------------------------------------------
Checker:
7 exists in the generated prime numbers, continue to next.
--------------------------------------------------------------------------------
Generator:
We got 3 prime numbers.
Next number is 11
--------------------------------------------------------------------------------
Checker:
11 exists in the generated prime numbers, continue to next.
--------------------------------------------------------------------------------
Generator:
We got 3 prime numbers.
Next number is 7
--------------------------------------------------------------------------------
Checker:
7 exists in the generated prime numbers, continue to next.
--------------------------------------------------------------------------------
Generator:
We got 3 prime numbers.
Next number is 10
--------------------------------------------------------------------------------
Checker:
10 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 3 prime numbers.
Next number is 7
--------------------------------------------------------------------------------
Checker:
7 exists in the generated prime numbers, continue to next.
--------------------------------------------------------------------------------
Generator:
We got 3 prime numbers.
Next number is 9
--------------------------------------------------------------------------------
Checker:
9 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 3 prime numbers.
Next number is 3
--------------------------------------------------------------------------------
Checker:
3 is a prime number, continue to next.
--------------------------------------------------------------------------------
Generator:
We got 4 prime numbers.
Next number is 3
--------------------------------------------------------------------------------
Checker:
3 exists in the generated prime numbers, continue to next.
--------------------------------------------------------------------------------
Generator:
We got 4 prime numbers.
Next number is 2
--------------------------------------------------------------------------------
Checker:
2 exists in the generated prime numbers, continue to next.
--------------------------------------------------------------------------------
Generator:
We got 4 prime numbers.
Next number is 1
--------------------------------------------------------------------------------
Checker:
1 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 4 prime numbers.
Next number is 6
--------------------------------------------------------------------------------
Checker:
6 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 4 prime numbers.
Next number is 14
--------------------------------------------------------------------------------
Checker:
14 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 4 prime numbers.
Next number is 4
--------------------------------------------------------------------------------
Checker:
4 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 4 prime numbers.
Next number is 8
--------------------------------------------------------------------------------
Checker:
8 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 4 prime numbers.
Next number is 6
--------------------------------------------------------------------------------
Checker:
6 is not a prime number, generate next.
--------------------------------------------------------------------------------
Generator:
We got 4 prime numbers.
Next number is 13
--------------------------------------------------------------------------------
Checker:
We got 5 prime numbers, stopping.
--------------------------------------------------------------------------------
Prime numbers generated: [11, 7, 2, 3, 13]
```

This is a quick tour of how you can build agents with AutoGen core. We will explore more about different agent patterns in the upcoming articles of this series.

