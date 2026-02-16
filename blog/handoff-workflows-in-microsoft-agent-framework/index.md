# Handoff workflows in Microsoft Agent Framework


In the previous articles, we explored Sequential and Concurrent workflow patterns in the Microsoft Agent Framework (MAF). Today, we dive into one of the most practical and widely-applicable patterns: the handoff workflow. The handoff pattern models real-world scenarios in which a conversation or task is transferred from one agent to another based on context, expertise, or role. Think of it like a customer support call center—you first speak with a frontline agent who assesses your issue and then routes you to the appropriate specialist.

Unlike sequential workflows (where agents execute in a fixed order) or concurrent workflows (where agents work in parallel), handoff workflows are dynamic and conditional. The flow is determined at runtime based on the conversation context. Handoff workflows are useful in scenarios like:

- Customer support systems: Route to refund, shipping, or technical specialists.
- Intake and triage: Assess requests and delegate to domain experts.
- Escalation workflows: Pass complex issues to senior agents.
- Multi-department routing: Direct inquiries to sales, support, or billing.

Before building our handoff workflow, let's understand the core concepts.

The *coordinator* is the entry point agent that assesses incoming requests and decides which specialist to hand off to. It acts as a dispatcher or router. The specialists are the *participant agents*. These are domain-specific agents with focused expertise. Each specialist handles a particular type of request. The framework automatically provides handoff tools to the coordinator, enabling it to transfer control to specialists. The agent simply calls the appropriate handoff function when it determines the right specialist. The interaction mode controls how the workflow handles the conversation:

- `"autonomous"`: Agents operate without waiting for user input between turns.
- `"interactive"`: Pauses for user input during the conversation.

A termination condition is a function that examines the conversation and decides when the workflow should end. This prevents infinite loops and ensures conversations reach a natural conclusion.

### Building a customer support handoff system

Let's build a customer support system step by step. We'll start simple and progressively add sophistication. First, let us define the coordinator.

```python
coordinator = chat_client.create_agent(
    name="coordinator_agent",
    instructions="""You are a frontline customer support agent. 
    Assess the customer's issue and hand off to the appropriate specialist:
    - For refund requests → hand off to refund_agent
    - For shipping issues → hand off to shipping_agent  
    - For technical problems → hand off to technical_agent
    
    Use the handoff tools to transfer the conversation.
    After the specialist resolves the issue, thank the customer and end the conversation.""",
)
```

Notice how the instructions explicitly tell the agent:

- What types of issues exist?
- Which specialist handles each type?
- How to perform the handoff (using tools).

The agent names in the instructions (`refund_agent` and `shipping_agent`) must match the actual agent names; this is how the coordinator knows which handoff tool to invoke.

We will now build the participant or the specialist agents. Each specialist has focused expertise and clear instructions on how to handle their domain:

```python
refund_agent = chat_client.create_agent(
    name="refund_agent",
    instructions="""You handle refund requests. Ask for order details and process refunds.
    Once you have helped the customer, provide a clear resolution and end your response.
    Do not hand off back to the coordinator - just provide your final answer.""",
)

shipping_agent = chat_client.create_agent(
    name="shipping_agent", 
    instructions="""You resolve shipping issues. Track packages and update delivery status.
    For order #12345, inform the customer that you've located the package and 
    it will be delivered within 2 business days.
    Provide a clear resolution and end your response. Do not ask follow-up questions.""",
)

technical_agent = chat_client.create_agent(
    name="technical_agent",
    instructions="""You solve technical problems. Troubleshoot issues step by step.
    Once you have helped the customer, provide a clear resolution and end your response.
    Do not hand off back to the coordinator - just provide your final answer.""",
)
```

With the coordinator and specialist agents in place, we need a termination condition. The termination condition prevents runaway conversations. It's a function that returns `True` when the workflow should stop.

```python
def should_terminate(conversation: list) -> bool:
    """End when the conversation includes resolution keywords or reaches length limit."""
    # Safety limit: end after too many turns
    if len(conversation) >= 6:
        return True
    
    # Content-based termination: look for resolution indicators
    for msg in conversation:
        if hasattr(msg, 'text') and msg.text:
            text_lower = msg.text.lower()
            resolution_keywords = ['resolved', 'delivered', 'refunded', 'fixed', 'thank you for contacting']
            if any(word in text_lower for word in resolution_keywords):
                return True
    
    return False
```

This function checks two conditions:

- Conversation length: Prevents runaway loops by limiting turns.
- Resolution keywords: Detects when the issue has been resolved

With the termination function ready, we can build the handoff workflow.

```python
workflow = (
    HandoffBuilder(name="customer_support")
    .participants([coordinator, refund_agent, shipping_agent, technical_agent])
    .set_coordinator(coordinator)
    .with_interaction_mode("autonomous")
    .with_termination_condition(should_terminate)
    .build()
)
```

Let's break down each builder method:

| Method | Purpose |
|--------|---------|
| `HandoffBuilder(name="...")` | Creates a named workflow for identification |
| `.participants([...])` | Registers all agents that can participate |
| `.set_coordinator(agent)` | Designates the entry-point agent |
| `.with_interaction_mode("autonomous")` | Runs without waiting for user input |
| `.with_termination_condition(fn)` | Sets custom logic to end the workflow |
| `.build()` | Compiles the workflow configuration |

To see the handoff workflow in action, we can use streaming events.

```python
async def main():
    print("Running handoff workflow: Coordinator → Specialists")
    print("=" * 60)
    
    output_evt: WorkflowOutputEvent | None = None
    
    async for event in workflow.run_stream("I never received my order #12345"):
        if isinstance(event, ExecutorInvokedEvent):
            print(f"⚡ Starting: {event.executor_id}")
        elif isinstance(event, ExecutorCompletedEvent):
            print(f"✓ Completed: {event.executor_id}")
        elif isinstance(event, WorkflowStatusEvent):
            if event.state == WorkflowRunState.IDLE:
                print("\n✅ Workflow completed!")
        elif isinstance(event, WorkflowOutputEvent):
            output_evt = event

    # Display the conversation history
    if output_evt:
        print("\nCONVERSATION HISTORY")
        messages = output_evt.data
        for msg in messages:
            if hasattr(msg, 'role'):
                name = msg.author_name or msg.role.value
                print(f"[{name}]: {msg.text}")
```

The streaming API emits different event types that let you track workflow progress:

| Event Type | When It Fires | Use Case |
|------------|---------------|----------|
| `ExecutorInvokedEvent` | An agent starts processing | Show "Agent X is working..." |
| `ExecutorCompletedEvent` | An agent finishes | Update progress indicators |
| `WorkflowStatusEvent` | Workflow state changes | Detect completion or errors |
| `WorkflowOutputEvent` | Final output is ready | Capture the result |

The `WorkflowRunState.IDLE` status indicates that the workflow has finished processing.

Here is the complete example.

```python
from agent_framework import (
    HandoffBuilder,
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

chat_client = AzureOpenAIChatClient(
    credential=DefaultAzureCredential(),
)

# Coordinator agent
coordinator = chat_client.create_agent(
    name="coordinator_agent",
    instructions="""You are a frontline customer support agent. 
    Assess the customer's issue and hand off to the appropriate specialist:
    - For refund requests → hand off to refund_agent
    - For shipping issues → hand off to shipping_agent  
    - For technical problems → hand off to technical_agent
    
    Use the handoff tools to transfer the conversation.
    After the specialist resolves the issue, thank the customer and end the conversation.""",
)

# Specialist agents
refund_agent = chat_client.create_agent(
    name="refund_agent",
    instructions="""You handle refund requests. Ask for order details and process refunds.
    Once you have helped the customer, provide a clear resolution and end your response.
    Do not hand off back to the coordinator - just provide your final answer.""",
)

shipping_agent = chat_client.create_agent(
    name="shipping_agent", 
    instructions="""You resolve shipping issues. Track packages and update delivery status.
    For order #12345, inform the customer that you've located the package and it will be delivered within 2 business days.
    Provide a clear resolution and end your response. Do not ask follow-up questions.""",
)

technical_agent = chat_client.create_agent(
    name="technical_agent",
    instructions="""You solve technical problems. Troubleshoot issues step by step.
    Once you have helped the customer, provide a clear resolution and end your response.
    Do not hand off back to the coordinator - just provide your final answer.""",
)

def should_terminate(conversation: list) -> bool:
    """End when the conversation includes resolution keywords or reaches length limit."""
    if len(conversation) >= 6:
        return True
    for msg in conversation:
        if hasattr(msg, 'text') and msg.text:
            text_lower = msg.text.lower()
            if any(word in text_lower for word in ['resolved', 'delivered', 'refunded', 'fixed', 'thank you for contacting']):
                return True
    return False

workflow = (
    HandoffBuilder(name="customer_support")
    .participants([coordinator, refund_agent, shipping_agent, technical_agent])
    .set_coordinator(coordinator)
    .with_interaction_mode("autonomous")  # Complete without prompting for user input
    .with_termination_condition(should_terminate)
    .build()
)

async def main():
    print("Running handoff workflow: Coordinator → Specialists")
    print("=" * 60)
    print("Customer issue: I never received my order #12345")
    print("=" * 60)
    
    output_evt: WorkflowOutputEvent | None = None
    
    async for event in workflow.run_stream("I never received my order #12345"):
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
        print("CONVERSATION HISTORY")
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

Here is the expected output when you run this workflow.

```shell
> python.exe .\03-handoff.py    
Running handoff workflow: Coordinator → Specialists
============================================================
Customer issue: I never received my order #12345
============================================================
⚡ Starting: input-conversation
✓ Completed: input-conversation
⚡ Starting: coordinator_agent
✓ Completed: coordinator_agent
⚡ Starting: handoff-coordinator
✓ Completed: handoff-coordinator
⚡ Starting: shipping_agent
✓ Completed: shipping_agent
⚡ Starting: handoff-coordinator
✓ Completed: handoff-coordinator

✅ Workflow completed!

============================================================
CONVERSATION HISTORY
============================================================

------------------------------------------------------------
01 [user]
------------------------------------------------------------
I never received my order #12345

------------------------------------------------------------
02 [shipping_agent]
------------------------------------------------------------
Thank you — I’ve located the package for order #12345. It’s back in transit with the carrier and is scheduled to be delivered within 2 business days (by Tuesday, February 3, 2026). No action is needed on your part; we’ll continue to monitor until delivery. Apologies for the delay — the issue is resolved.
```

In the advanced implementation of this workflow, a specialist can hand off to other specialists.

```python
senior_technical_agent = chat_client.create_agent(
    name="senior_technical_agent",
    instructions="""You handle escalated technical issues that require 
    deep expertise. You receive cases from the technical_agent.""",
)

technical_agent = chat_client.create_agent(
    name="technical_agent",
    instructions="""You solve technical problems. For complex issues 
    you cannot resolve, hand off to senior_technical_agent.""",
)

.....

workflow = (
    HandoffBuilder(name="support")
    .set_coordinator(coordinator)
    .participants([refund_agent, shipping_agent, technical_agent])
    .add_handoff(refund_agent, technical_agent)  # Refund can transfer to Technical
    .add_handoff(shipping_agent, refund_agent)   # Shipping can transfer to Refund
    .build()
)
```

For scenarios that require a human-in-the-loop, you can set the interaction mode to `interactive`.

```python
workflow = (
    HandoffBuilder(name="customer_support")
    .participants([coordinator, refund_agent, shipping_agent])
    .set_coordinator(coordinator)
    .with_interaction_mode("interactive")
    .build()
)
```

This pauses the workflow at natural points, allowing users to provide additional information or confirm actions.

The Handoff pattern enables dynamic, context-aware routing between agents. This is perfect for customer support, intake systems, and any scenario where different experts handle different concerns. By combining a coordinator, specialized agents, and smart termination logic, you can build sophisticated multi-agent systems that feel natural and efficient. When using this workflow:

- Be explicit about when and to whom an agent should hand off.
- Always include a length-based termination to prevent infinite loops.
- Ensure each agent excels at exactly one thing.

In the next article, we'll explore the group chat orchestration pattern for even more complex multi-agent collaboration scenarios.

