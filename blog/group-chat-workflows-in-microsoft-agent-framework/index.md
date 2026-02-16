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
creative = chat_client.create_agent(
    name="Creative",
    instructions="You are a creative thinker. Generate bold, innovative ideas.",
)

critic = chat_client.create_agent(
    name="Critic", 
    instructions="You are a critical thinker. Identify potential issues and challenges.",
)

synthesizer = chat_client.create_agent(
    name="Synthesizer",
    instructions="You synthesize ideas. Combine the best elements into actionable plans.",
)
```

The heart of a `GroupChat` workflow is the speaker selection function. This function decides who speaks next based on the current state of the conversation. The speaker selection function receives the conversation state. 

```python
GroupChatStateSnapshot = TypedDict('GroupChatStateSnapshot', {
    'participants': dict,  # Dictionary of participant agents (name → agent)
    'history': list,       # Conversation history so far
    'round_index': int,    # Current round number (0-indexed)
})
```

| Field | Description |
|-------|-------------|
| `participants` | A dictionary where keys are agent names |
| `history` | List of messages exchanged so far |
| `round_index` | How many turns have been taken |

A simple way to select speakers is to use a round-robin method. In this approach, each agent speaks in order.

```python
def select_speaker(state: GroupChatStateSnapshot) -> str | None:
    """Select the next speaker in round-robin order."""
    participants = state["participants"]
    round_index = state["round_index"]
    
    # End after 6 rounds (2 full cycles through 3 agents)
    if round_index >= 6:
        return None  # Returning None ends the conversation
    
    # Get the list of participant names
    participant_names = list(participants.keys())
    
    # Select based on round index
    return participant_names[round_index % len(participant_names)]
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
    
    output_evt: WorkflowOutputEvent | None = None
    
    async for event in workflow.run_stream("How can we make AI agents more trustworthy?"):
        if isinstance(event, ExecutorInvokedEvent):
            print(f"⚡ Starting: {event.executor_id}")
        elif isinstance(event, ExecutorCompletedEvent):
            print(f"✓ Completed: {event.executor_id}")
        elif isinstance(event, WorkflowStatusEvent):
            if event.state == WorkflowRunState.IDLE:
                print("\n✅ Group chat completed!")
        elif isinstance(event, WorkflowOutputEvent):
            output_evt = event
```

The `WorkflowOutputEvent.data` contains the full conversation as a list of messages:

```python
if output_evt:
    print("\n" + "=" * 60)
    print("GROUP CHAT TRANSCRIPT")
    print("=" * 60)
    messages = output_evt.data
    if isinstance(messages, list):
        for i, msg in enumerate(messages, start=1):
            if hasattr(msg, 'role'):
                name = msg.author_name or ("assistant" if msg.role == Role.ASSISTANT else "user")
                print(f"\n{'-' * 60}")
                print(f"{i:02d} [{name}]")
                print(f"{'-' * 60}")
                print(msg.text)
```

Here's the complete code for a brainstorming `GroupChat`.

```python
from agent_framework import (
    GroupChatBuilder,
    GroupChatStateSnapshot,
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

from dotenv import load_dotenv

load_dotenv()

# Create chat client
chat_client = AzureOpenAIChatClient(
    credential=DefaultAzureCredential(),
)

# Create participant agents
creative = chat_client.create_agent(
    name="Creative",
    instructions="You are a creative thinker. Generate bold, innovative ideas.",
)

critic = chat_client.create_agent(
    name="Critic", 
    instructions="You are a critical thinker. Identify potential issues and challenges.",
)

synthesizer = chat_client.create_agent(
    name="Synthesizer",
    instructions="You synthesize ideas. Combine the best elements into actionable plans.",
)

# Simple round-robin speaker selection
def select_speaker(state: GroupChatStateSnapshot) -> str | None:
    participants = state["participants"]
    round_index = state["round_index"]
    
    # End after 6 rounds (2 full cycles)
    if round_index >= 6:
        return None
    
    # participants is a dict with agent names as keys
    participant_names = list(participants.keys())
    return participant_names[round_index % len(participant_names)]

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
    
    output_evt: WorkflowOutputEvent | None = None
    
    async for event in workflow.run_stream("How can we make AI agents more trustworthy?"):
        if isinstance(event, ExecutorInvokedEvent):
            print(f"⚡ Starting: {event.executor_id}")
        elif isinstance(event, ExecutorCompletedEvent):
            print(f"✓ Completed: {event.executor_id}")
        elif isinstance(event, WorkflowStatusEvent):
            if event.state == WorkflowRunState.IDLE:
                print("\n✅ Group chat completed!")
        elif isinstance(event, WorkflowOutputEvent):
            output_evt = event

    # Display the final conversation
    if output_evt:
        print("\n" + "=" * 60)
        print("GROUP CHAT TRANSCRIPT")
        print("=" * 60)
        messages = output_evt.data
        if isinstance(messages, list):
            for i, msg in enumerate(messages, start=1):
                if hasattr(msg, 'role'):
                    name = msg.author_name or ("assistant" if msg.role == Role.ASSISTANT else "user")
                    print(f"\n{'-' * 60}")
                    print(f"{i:02d} [{name}]")
                    print(f"{'-' * 60}")
                    print(msg.text)
        else:
            print(output_evt.data)


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
def content_aware_selection(state: GroupChatStateSnapshot) -> str | None:
    """Select speaker based on what was just said."""
    history = state["history"]
    round_index = state["round_index"]
    
    if round_index >= 9:
        return None
    
    if round_index == 0:
        return "Creative"
    
    last_turn = history[-1] if history else None
    last_message = ""
    if last_turn and hasattr(last_turn, 'message'):
        last_message = last_turn.message.lower() if isinstance(last_turn.message, str) else ""
    
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
def weighted_selection(state: GroupChatStateSnapshot) -> str | None:
    """Weighted speaker selection - Creative speaks more often."""
    round_index = state["round_index"]
    
    if round_index >= 8:
        return None
    
    # Pattern: Creative, Critic, Creative, Synthesizer, repeat
    pattern = ["Creative", "Critic", "Creative", "Synthesizer"]
    return pattern[round_index % len(pattern)]
```

In this example, the `creative` agent is given greater weight than the others.

### Last speaker exclusion

In this pattern, we ensure that the same agent doesn't speak twice in a row.

```python
def no_repeat_selection(state: GroupChatStateSnapshot) -> str | None:
    """Prevent the same agent from speaking consecutively."""
    participants = state["participants"]
    history = state["history"]
    round_index = state["round_index"]
    
    if round_index >= 6:
        return None
    
    participant_names = list(participants.keys())
    
    # Find who spoke last
    last_speaker = None
    for msg in reversed(history):
        if hasattr(msg, 'author_name') and msg.author_name:
            last_speaker = msg.author_name
            break
    
    # Filter out last speaker
    available = [p for p in participant_names if p != last_speaker]
    
    # Simple rotation among available speakers
    return available[round_index % len(available)]
```

In this method, from the message history, we identify who spoke last and remove that speaker from the list of potential participants.

### LLM-based speaker selection

For scenarios that require dynamic speaker selection, you can assign an LLM to be the manager.

```python
moderator = chat_client.create_agent(
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
def select_speaker(state: GroupChatStateSnapshot) -> str | None:
  if state["round_index"] >= 10:
    return None  # End after 10 rounds
  # ... selection logic
```

### Implementing a custom termination condition

We can use `with_termination_condition()` for complex logic.

```python
def check_consensus(state: GroupChatStateSnapshot) -> bool:
    """End when agents reach consensus."""
    for entry in state["history"]:
        text = entry.text.upper() if hasattr(entry, 'text') else ""
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

