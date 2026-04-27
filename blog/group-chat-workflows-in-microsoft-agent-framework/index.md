# Group chat workflows in Microsoft Agent Framework


In the previous articles of this [series](https://ravichaganti.com/series/microsoft-agent-framework/), we explored three powerful workflow patterns in Microsoft Agent Framework (MAF):

- Sequential: Agents process in a fixed order, like a pipeline.
- Concurrent: Agents work in parallel, with results aggregated.
- Handoff: A coordinator routes requests to specialist agents.

But what happens when you need agents to discuss, debate, and build on each other's ideas, like a brainstorming session or a committee meeting? This is where the `GroupChat` workflow pattern shines. In this article, we'll explore how to build dynamic multi-agent conversations using `GroupChatBuilder`, where a moderator (or selection function) orchestrates turn-based discussions among participant agents.

The `GroupChat` workflow is ideal for scenarios where:

- Multiple perspectives are needed on a single topic.
- Ideas need to evolve through discussion and refinement.
- Agents should react to each other's outputs, not just the original input.
- Consensus or synthesis emerges from collaborative dialogue.

To understand this better, let us start with an example. Let's build a classic brainstorming setup with three agents: a creative who generates ideas, a critic who challenges them, and a synthesizer who combines the best elements. Each agent needs a distinct perspective defined in its instructions:

```python
creative = chat_client.as_agent(
    name="Creative",
    instructions="You are a creative thinker. Generate bold, innovative ideas.",
)

critic = chat_client.as_agent(
    name="Critic", 
    instructions="You are a critical thinker. Identify potential issues and challenges.",
)

synthesizer = chat_client.as_agent(
    name="Synthesizer",
    instructions="You synthesize ideas. Combine the best elements into actionable plans.",
)
```

The heart of a `GroupChat` workflow is the speaker selection function. This function decides who speaks next based on the current state of the conversation. The framework hands it a `GroupChatState` (immutable dataclass) imported from `agent_framework.orchestrations`:

| Field | Description |
|-------|-------------|
| `participants` | An `OrderedDict` mapping agent names to their descriptions |
| `conversation` | The full conversation history so far as a `list[Message]` |
| `current_round` | The current round index, starting from 0 |

A simple way to select speakers is to use a round-robin method. In this approach, each agent speaks in order.

```python
from agent_framework.orchestrations import GroupChatState


def select_speaker(state: GroupChatState) -> str | None:
    """Select the next speaker in round-robin order."""
    # End after 6 rounds (2 full cycles through 3 agents)
    if state.current_round >= 6:
        return None  # Returning None ends the conversation

    # Select based on round index
    participant_names = list(state.participants.keys())
    return participant_names[state.current_round % len(participant_names)]
```

As defined in this function, the next participant name is returned. To terminate the conversation, this function returns `None`.

With the speaker selection in place, let us build the workflow.

```python
workflow = (
    GroupChatBuilder()
    .set_select_speakers_func(select_speaker)
    .participants([creative, critic, synthesizer])
    .build()
)
```

The `set_select_speakers_func(func)` method sets the speaker selection function. `participants([...])` registers the agents that can participate, and `build()`creates the executable workflow. We will use the well-known pattern for running the workflow.

```python
async def main():
    print("Running group chat workflow: Creative ↔ Critic ↔ Synthesizer")
    print("=" * 60)
    print("Topic: How can we make AI agents more trustworthy?")
    print("=" * 60)
    
    output_data = None
    
    async for event in workflow.run("How can we make AI agents more trustworthy?", stream=True):
        if event.type == "executor_invoked":
            print(f"⚡ Starting: {event.executor_id}")
        elif event.type == "executor_completed":
            print(f"✓ Completed: {event.executor_id}")
        elif event.type == "status":
            if event.state == WorkflowRunState.IDLE:
                print("\n✅ Group chat completed!")
        elif event.type == "output":
            output_data = event.data
```

The `event.data` on the `output` event contains the full conversation as a list of messages:

```python
if output_data:
    print("\n" + "=" * 60)
    print("GROUP CHAT TRANSCRIPT")
    print("=" * 60)
    if isinstance(output_data, list):
        for i, msg in enumerate(output_data, start=1):
            if hasattr(msg, 'role'):
                name = msg.author_name or ("assistant" if msg.role == Role.ASSISTANT else "user")
                print(f"\n{'-' * 60}")
                print(f"{i:02d} [{name}]")
                print(f"{'-' * 60}")
                print(msg.text)
```

Here's the complete code for a brainstorming `GroupChat`.

```python
from agent_framework import Role, WorkflowRunState
from agent_framework.orchestrations import GroupChatBuilder, GroupChatState
from agent_framework.openai import OpenAIChatClient
from azure.identity import DefaultAzureCredential
import asyncio
import os

from dotenv import load_dotenv

load_dotenv()

# Create chat client
model = (
    os.getenv("AZURE_OPENAI_CHAT_MODEL")
    or os.getenv("AZURE_OPENAI_MODEL")
    or os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME")
    or os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
)
chat_client = OpenAIChatClient(
    model=model,
    credential=DefaultAzureCredential(),
)

# Create participant agents
creative = chat_client.as_agent(
    name="Creative",
    instructions="You are a creative thinker. Generate bold, innovative ideas.",
)

critic = chat_client.as_agent(
    name="Critic", 
    instructions="You are a critical thinker. Identify potential issues and challenges.",
)

synthesizer = chat_client.as_agent(
    name="Synthesizer",
    instructions="You synthesize ideas. Combine the best elements into actionable plans.",
)

# Simple round-robin speaker selection
def select_speaker(state: GroupChatState) -> str | None:
    # End after 6 rounds (2 full cycles)
    if state.current_round >= 6:
        return None
    
    # participants is an ordered dict with agent names as keys
    participant_names = list(state.participants.keys())
    return participant_names[state.current_round % len(participant_names)]

# Build group chat workflow
workflow = (
    GroupChatBuilder()
    .set_select_speakers_func(select_speaker)
    .participants([creative, critic, synthesizer])
    .build()
)


async def main():
    print("Running group chat workflow: Creative ↔ Critic ↔ Synthesizer")
    print("=" * 60)
    print("Topic: How can we make AI agents more trustworthy?")
    print("=" * 60)
    
    output_data = None
    
    async for event in workflow.run("How can we make AI agents more trustworthy?", stream=True):
        if event.type == "executor_invoked":
            print(f"⚡ Starting: {event.executor_id}")
        elif event.type == "executor_completed":
            print(f"✓ Completed: {event.executor_id}")
        elif event.type == "status":
            if event.state == WorkflowRunState.IDLE:
                print("\n✅ Group chat completed!")
        elif event.type == "output":
            output_data = event.data

    # Display the final conversation
    if output_data:
        print("\n" + "=" * 60)
        print("GROUP CHAT TRANSCRIPT")
        print("=" * 60)
        if isinstance(output_data, list):
            for i, msg in enumerate(output_data, start=1):
                if hasattr(msg, 'role'):
                    name = msg.author_name or ("assistant" if msg.role == Role.ASSISTANT else "user")
                    print(f"\n{'-' * 60}")
                    print(f"{i:02d} [{name}]")
                    print(f"{'-' * 60}")
                    print(msg.text)
        else:
            print(output_data)


if __name__ == "__main__":
    asyncio.run(main())
```

Here's what you can expect when you run this workflow.

```shell
> python.exe .\04-group_chat.py
Running group chat workflow: Creative ↔ Critic ↔ Synthesizer
============================================================
Topic: How can we make AI agents more trustworthy?
============================================================
⚡ Starting: groupchat_orchestrator_08ab99b0
✓ Completed: groupchat_orchestrator_08ab99b0
⚡ Starting: groupchat_agent:Creative
✓ Completed: groupchat_agent:Creative
⚡ Starting: groupchat_orchestrator_08ab99b0
✓ Completed: groupchat_orchestrator_08ab99b0
⚡ Starting: groupchat_agent:Critic
✓ Completed: groupchat_agent:Critic
⚡ Starting: groupchat_orchestrator_08ab99b0
✓ Completed: groupchat_orchestrator_08ab99b0
⚡ Starting: groupchat_agent:Synthesizer
✓ Completed: groupchat_agent:Synthesizer
⚡ Starting: groupchat_orchestrator_08ab99b0
✓ Completed: groupchat_orchestrator_08ab99b0
⚡ Starting: groupchat_agent:Creative
✓ Completed: groupchat_agent:Creative
⚡ Starting: groupchat_orchestrator_08ab99b0
✓ Completed: groupchat_orchestrator_08ab99b0
⚡ Starting: groupchat_agent:Critic
✓ Completed: groupchat_agent:Critic
⚡ Starting: groupchat_orchestrator_08ab99b0
✓ Completed: groupchat_orchestrator_08ab99b0
⚡ Starting: groupchat_agent:Synthesizer
✓ Completed: groupchat_agent:Synthesizer
⚡ Starting: groupchat_orchestrator_08ab99b0
✓ Completed: groupchat_orchestrator_08ab99b0

✅ Group chat completed!

============================================================
GROUP CHAT TRANSCRIPT
============================================================
.....
```

The round-robin method for speaker selection is simple but does not necessarily reflect real-world brainstorming. In the following sections, we will look at slightly more advanced methods for selecting a speaker in a `GroupChat` workflow.

### Conditional selection based on consent

In this pattern, we let the content of the conversation drive the speaker selection. Let us look at the implementation.

```python
def content_aware_selection(state: GroupChatState) -> str | None:
    """Select speaker based on what was just said."""
    if state.current_round >= 9:
        return None

    if state.current_round == 0:
        return "Creative"

    last_message = ""
    if state.conversation:
        last = state.conversation[-1]
        if last.text:
            last_message = last.text.lower()

    if "idea" in last_message or "propose" in last_message:
        return "Critic"

    if "concern" in last_message or "risk" in last_message:
        return "Creative"

    return "Synthesizer"
```

In this pattern, based on the `creative` or `critic` agent's response, we choose the next speaker. Again, this may not always be the right thing. Imagine a chatty, opinionated co-worker in a brainstorming session. They end up taking a lot of time. To address this, we can use a weighted selection where a few agents are selected more often than others.

### **Priority-Based Selection**

In this method, you can prioritize one speaker over others.

```python
def weighted_selection(state: GroupChatState) -> str | None:
    """Weighted speaker selection - Creative speaks more often."""
    if state.current_round >= 8:
        return None

    # Pattern: Creative, Critic, Creative, Synthesizer, repeat
    pattern = ["Creative", "Critic", "Creative", "Synthesizer"]
    return pattern[state.current_round % len(pattern)]
```

In this example, the `creative` agent is given greater weight than the others.

### Last speaker exclusion

In this pattern, we ensure that the same agent doesn't speak twice in a row.

```python
def no_repeat_selection(state: GroupChatState) -> str | None:
    """Prevent the same agent from speaking consecutively."""
    if state.current_round >= 6:
        return None

    participant_names = list(state.participants.keys())

    # Find who spoke last
    last_speaker = None
    for msg in reversed(state.conversation):
        if hasattr(msg, "author_name") and msg.author_name:
            last_speaker = msg.author_name
            break

    # Filter out last speaker
    available = [p for p in participant_names if p != last_speaker]

    # Simple rotation among available speakers
    return available[state.current_round % len(available)]
```

In this method, from the message history, we identify who spoke last and remove that speaker from the list of potential participants.

### LLM-based speaker selection

For scenarios that require dynamic speaker selection, you can assign an LLM to be the manager.

```python
moderator = chat_client.as_agent(
    name="Moderator",
    instructions="""You are a discussion moderator. 
    Based on the conversation so far, decide who should speak next:
    - 'Creative' when new ideas are needed
    - 'Critic' when ideas need evaluation
    - 'Synthesizer' when it's time to consolidate
    
    Return ONLY the agent name, nothing else.""",
    temperature=0.3,
)

workflow = (
    GroupChatBuilder()
    .set_manager(moderator, display_name="Moderator")
    .participants([creative, critic, synthesizer])
    .with_max_rounds(10)
    .build()
)
```

In this approach, the `moderator` agent becomes the manager of the conversation and selects the appropriate agent based on the goal. This agent has access to the full conversation history, returns the name of the next speaker, and can make dynamic decisions based on context.

In addition to speaker selection, identifying and implementing an appropriate termination condition is important. There are multiple ways to do this.

### Return None from Selection Function

The simplest approach is to return `None` when you want to stop:

```python
def select_speaker(state: GroupChatState) -> str | None:
  if state.current_round >= 10:
    return None  # End after 10 rounds
  # ... selection logic
```

### Implementing a custom termination condition

We can use `with_termination_condition()` for complex logic.

```python
def check_consensus(state: GroupChatState) -> bool:
    """End when agents reach consensus."""
    for entry in state.conversation:
        text = entry.text.upper() if hasattr(entry, "text") and entry.text else ""
        if "CONSENSUS REACHED" in text or "AGREED" in text:
            return True
    return False

workflow = (
    GroupChatBuilder()
    .set_select_speakers_func(select_speaker)
    .participants([creative, critic, synthesizer])
    .with_termination_condition(check_consensus)
    .build()
)
```

As shown in the LLM-based speaker selection example, one additional way to terminate a conversation is to specify a maximum number of rounds using `with_max_rounds()`. 

The `GroupChat` workflow pattern enables dynamic, turn-based conversations between multiple AI agents. Key takeaways.

- Speaker selection is the control mechanism. You can use functions or an LLM manager.
- All agents share the conversation history, enabling true dialogue.
- Termination conditions prevent infinite loops.
- Design complementary personas for productive discussions.
- Use streaming events to monitor conversation progress

`GroupChat` excels when you need agents to build on each other's ideas; brainstorm, debate, code-review, and collaborate on problem-solving.

{{< notice "info" >}}
**Updated 27th April 2026 for breaking API changes.** Microsoft Agent Framework's Python package was reorganized in version 1.2.0. Several names and patterns referenced here have changed: `AzureOpenAIChatClient` (in `agent_framework.azure`) is now `OpenAIChatClient` (in `agent_framework.openai`), with an explicit `model=` parameter and either an `azure_endpoint=` argument or an `AZURE_OPENAI_ENDPOINT` environment variable; chat clients use `chat_client.as_agent(...)` rather than `chat_client.create_agent(...)`; `GroupChatBuilder` moved from `agent_framework` to `agent_framework.orchestrations`; `workflow.run_stream(...)` is now `workflow.run(input, stream=True)`; the per-event classes were collapsed into a single `WorkflowEvent` type discriminated by `event.type`; and the speaker-selection state type is now `GroupChatState` (a frozen dataclass) with attributes `current_round`, `participants`, and `conversation`, replacing the older `GroupChatStateSnapshot` `TypedDict` with `round_index`/`history`. All code samples in this article have been updated. See the [client comparison article](/blog/choosing-the-right-microsoft-agent-framework-client/) for the current client surface.
{{< /notice >}}

