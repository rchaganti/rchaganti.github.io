# Sequential workflows in Microsoft Agent Framework


A single AI agent is powerful and can do impressive things. But real-world applications often need multiple specialists working together, with each agent handling a specific task before passing results to the next. As with humans, in the agentic world we also need to break complex problems into manageable pieces and have specialized agents handle each task. We need one agent to review another's work and handle complex tool invocation.

Trying to cram all of this into one agent leads to:
- Confused outputs (the agent doesn't know which "hat" to wear)
- Context overload (too many tools and instructions)
- Difficult debugging (hard to know what went wrong)

Microsoft Agent Framework (MAF) makes this orchestration simple with its workflow patterns. Workflows in MAF connect multiple agents (and other executors) into a graph that defines how data flows between them. Think of it as the "plumbing" that connects your agents together.  In this article, we'll focus on the most fundamental pattern: [Sequential Workflows](https://learn.microsoft.com/en-us/agent-framework/user-guide/workflows/orchestrations/sequential?pivots=programming-language-python).

## Sequential Workflows

The Sequential Pattern is the simplest and most intuitive workflow pattern. Agents process data sequentially, each building on the previous agent's output.

{{< figure src="/images/maf-sequential.png" >}}  {{< load-photoswipe >}}

In a sequential flow, each agent receives the accumulated conversation history (including all previous messages), processes the input, generates a response, appends it to the conversation, and passes the updated conversation to the next agent. These workflows are perfect for content pipelines (research → write → edit → publish), data transformation chains (extract → transform → load), review processes (draft → review → approve), and step-by-step analysis (collect data → analyze → summarize).

### Building a Sequential Workflow: Step by Step

Let's build a content creation pipeline that demonstrates the sequential pattern. We'll start simple and gradually add complexity.

First, install the required packages:

```bash
$ pip install agent-framework-azure-ai --pre
$ pip install python-dotenv azure-identity
```

Set up your environment variables (create a `.env` file):

```bash
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
AZURE_OPENAI_CHAT_DEPLOYMENT_NAME="gpt-4o"
```

Let's start by importing everything we need:

```python
from agent_framework import (
  SequentialBuilder,
  ChatMessage,
  Role,
  WorkflowOutputEvent,
  ExecutorInvokedEvent,
  ExecutorCompletedEvent,
  WorkflowStatusEvent,
  WorkflowRunState,
)

from agent_framework.azure import AzureOpenAIChatClient
from azure.identity import DefaultAzureCredential
import asyncio
from typing import Any
from dotenv import load_dotenv

load_dotenv()
```

`SequentialBuilder` in the MAF package `agent_framework` is used to build a sequential workflow. We will discuss other imports as we progress further.

We need a chat client for the workflow.

```python
chat_client = AzureOpenAIChatClient(
  credential=DefaultAzureCredential(),
)
```

The `DefaultAzureCredential` handles authentication automatically. It tries multiple authentication methods in order:

- Environment variables
- Managed Identity
- Azure CLI (`az login`)

Now let's create three specialized agents for our content pipeline:

```python
researcher = chat_client.create_agent(
    name="Researcher",
    instructions="Research the given topic and provide key facts and statistics.",
)

writer = chat_client.create_agent(
    name="Writer", 
    instructions="Take the research and write an engaging article draft.",
)

editor = chat_client.create_agent(
    name="Editor",
    instructions="Review the draft for clarity, grammar, and engagement. Provide the final version.",
)
```

A sequential workflow is created using the `SequentialBuilder()`.

```python
workflow = (
    SequentialBuilder()
    .participants([researcher, writer, editor])
    .build()
)
```

That's it! Just two method calls:

- `.participants([...])`- List your agents in the order they should execute.
- `.build()`- Construct the workflow.

Under the hood, this creates:

- An executor for each agent
- Edges connecting them in sequence
- A start point (first agent) and an end point (last agent)

### Running the Workflow with Streaming

MAF supports real-time event streaming during workflow execution. This gives you visibility into what's happening:

```python
async def main():        
    # Run the workflow with streaming events
    print("Running sequential workflow: Researcher → Writer → Editor")
    print("=" * 60)
    
    output_evt: WorkflowOutputEvent | None = None
    
    async for event in workflow.run_stream("Write about the future of AI agents"):
        if isinstance(event, ExecutorInvokedEvent):
            print(f"⚡ Starting: {event.executor_id}")
        elif isinstance(event, ExecutorCompletedEvent):
            print(f"✓ Completed: {event.executor_id}")
        elif isinstance(event, WorkflowStatusEvent):
            if event.state == WorkflowRunState.IDLE:
                print("\n✅ Workflow completed!")
        elif isinstance(event, WorkflowOutputEvent):
            output_evt = event
```

Let's understand each event type:

| Event | When It Fires | What It Contains |
|-------|---------------|------------------|
| `ExecutorInvokedEvent` | When an agent starts processing | `executor_id` - the agent's name |
| `ExecutorCompletedEvent` | When an agent finishes | `executor_id` |
| `WorkflowStatusEvent` | When the workflow state changes | `state` - RUNNING, IDLE, ERROR |
| `WorkflowOutputEvent` | When the workflow produces output | `data` - the final result |

The final output contains the complete conversation history.

```python
    # Display the final conversation
    if output_evt:
        print("\n" + "=" * 60)
        print("FINAL CONVERSATION")
        print("=" * 60)
        messages: list[ChatMessage] | Any = output_evt.data
        for i, msg in enumerate(messages, start=1):
            name = msg.author_name or ("assistant" if msg.role == Role.ASSISTANT else "user")
            print(f"\n{'-' * 60}")
            print(f"{i:02d} [{name}]")
            print(f"{'-' * 60}")
            print(msg.text)

if __name__ == "__main__":
    asyncio.run(main())
```

The `WorkflowOutputEvent.data` contains a list of `ChatMessage` objects with:

- `role`: USER or ASSISTANT
- `author_name`: The agent's name (for assistant messages)
- `text`: The message content

Here is the complete example.

```python
from agent_framework import (
    SequentialBuilder,
    ChatMessage,
    Role,
    WorkflowOutputEvent,
    ExecutorInvokedEvent,
    ExecutorCompletedEvent,
    WorkflowStatusEvent,
    WorkflowRunState,
)
from agent_framework.azure import AzureOpenAIChatClient
from azure.identity import DefaultAzureCredential
import asyncio
from typing import Any

from dotenv import load_dotenv

load_dotenv()

# Create chat client
chat_client = AzureOpenAIChatClient(
    credential=DefaultAzureCredential(),
)

# Create specialized agents
researcher = chat_client.create_agent(
    name="Researcher",
    instructions="Research the given topic and provide key facts and statistics.",
)

writer = chat_client.create_agent(
    name="Writer", 
    instructions="Take the research and write an engaging article draft.",
)

editor = chat_client.create_agent(
    name="Editor",
    instructions="Review the draft for clarity, grammar, and engagement. Provide the final version.",
)

async def main():        
    # Build sequential workflow
    workflow = (
        SequentialBuilder()
        .participants([researcher, writer, editor])
        .build()
    )

    # Run the workflow with streaming events
    print("Running sequential workflow: Researcher → Writer → Editor")
    print("=" * 60)
    
    output_evt: WorkflowOutputEvent | None = None
    
    async for event in workflow.run_stream("Write about the future of AI agents"):
        if isinstance(event, ExecutorInvokedEvent):
            print(f"⚡ Starting: {event.executor_id}")
        elif isinstance(event, ExecutorCompletedEvent):
            print(f"✓ Completed: {event.executor_id}")
        elif isinstance(event, WorkflowStatusEvent):
            if event.state == WorkflowRunState.IDLE:
                print("\n✅ Workflow completed!")
        elif isinstance(event, WorkflowOutputEvent):
            output_evt = event

    # Display the final conversation
    if output_evt:
        print("\n" + "=" * 60)
        print("FINAL CONVERSATION")
        print("=" * 60)
        messages: list[ChatMessage] | Any = output_evt.data
        for i, msg in enumerate(messages, start=1):
            name = msg.author_name or ("assistant" if msg.role == Role.ASSISTANT else "user")
            print(f"\n{'-' * 60}")
            print(f"{i:02d} [{name}]")
            print(f"{'-' * 60}")
            print(msg.text)

if __name__ == "__main__":
    asyncio.run(main())
```

When you run this workflow, you'll see something like:

```shell
Running sequential workflow: Researcher → Writer → Editor
============================================================
⚡ Starting: Researcher
✓ Completed: Researcher
⚡ Starting: Writer
✓ Completed: Writer
⚡ Starting: Editor
✓ Completed: Editor

✅ Workflow completed!

============================================================
FINAL CONVERSATION
============================================================

------------------------------------------------------------
01 [user]
------------------------------------------------------------
Write about the future of AI agents

------------------------------------------------------------
02 [Researcher]
------------------------------------------------------------
# Key Facts and Statistics on AI Agents

## Market Growth
- The AI agent market is projected to reach $47.1 billion by 2030
- Autonomous AI systems are expected to handle 85% of customer interactions by 2027
...

------------------------------------------------------------
03 [Writer]
------------------------------------------------------------
# The Future of AI Agents: A New Era of Intelligent Automation

The rise of AI agents represents one of the most transformative shifts...
[Engaging article draft based on the research]

------------------------------------------------------------
04 [Editor]
------------------------------------------------------------
# The Future of AI Agents: Reshaping How We Work and Live
....
```

Sequential workflows in MAF provide a simple yet powerful way to orchestrate multiple AI agents. With just a few lines of code, you can create sophisticated pipelines where:

- Each agent specializes in one task
- Data flows naturally from one agent to the next
- You have full visibility through event streaming
- The framework handles all the orchestration complexity

The `SequentialBuilder` makes this pattern incredibly easy to implement. You just define your agents, list them in order, and let MAF handle the rest.

