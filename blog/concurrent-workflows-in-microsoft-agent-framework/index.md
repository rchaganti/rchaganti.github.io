# Concurrent workflows in Microsoft Agent Framework


In the [previous article]([Sequential workflows in Microsoft Agent Framework | Ravikanth Chaganti](https://ravichaganti.com/blog/sequential-workflows-in-microsoft-agent-framework/)), we explored the sequential workflow pattern, a straightforward approach where agents process tasks one after another in a defined order. While sequential workflows are powerful for pipeline-style processing, they have a limitation: speed. When agents don't depend on each other's output, running them one at a time is inefficient.

Here's where the concurrent workflow pattern comes into play. This pattern allows multiple agents to work in parallel, dramatically reducing total execution time and enabling scenarios that require diverse perspectives to be analyzed simultaneously.

In this article, we'll build up from a simple example to a sophisticated multi-analyst system that gathers insights from different perspectives and synthesizes them into a unified executive summary.

The concurrent pattern is useful in scenarios such as:

- Independent analysis: Multiple agents can analyze the same input without needing each other's results.
- Time-sensitive operations: You need results fast, and parallelism can speed things up.
- Diverse perspectives: You want varied viewpoints on the same topic (technical, business, ethical, and so on).
- Redundancy/voting: Multiple agents tackle the same problem, and you aggregate their answers.

Let us explore this further using an example. In this example, we will create three analyst agents that analyze a topic across three facets: technical, business, and ethical. 

{{< figure src="/images/maf-concurrent.png" >}}  {{< load-photoswipe >}}

```python
from agent_framework import (
    ConcurrentBuilder,
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

# Create three specialized analyst agents
technical_analyst = chat_client.create_agent(
    name="TechnicalAnalyst",
    instructions="Analyze the topic from a technical/engineering perspective. Be concise.",
)

business_analyst = chat_client.create_agent(
    name="BusinessAnalyst",
    instructions="Analyze the topic from a business/market perspective. Be concise.",
)

ethical_analyst = chat_client.create_agent(
    name="EthicalAnalyst",
    instructions="Analyze the topic from an ethical/societal perspective. Be concise.",
)

# Build the concurrent workflow
workflow = (
    ConcurrentBuilder()
    .participants([technical_analyst, business_analyst, ethical_analyst])
    .build()
)

async def main():
    print("Running concurrent analysis with 3 analysts...")
    print("=" * 60)
    
    async for event in workflow.run_stream("Analyze the impact of autonomous vehicles"):
        if isinstance(event, ExecutorInvokedEvent):
            print(f"⚡ Starting: {event.executor_id}")
        elif isinstance(event, ExecutorCompletedEvent):
            print(f"✓ Completed: {event.executor_id}")
        elif isinstance(event, WorkflowStatusEvent):
            if event.state == WorkflowRunState.IDLE:
                print("\n✅ Workflow completed!")
        elif isinstance(event, WorkflowOutputEvent):
            print(f"\n{'='*60}")
            print("RESULTS")
            print(f"{'='*60}")
            for msg in event.data:
                name = msg.author_name or "Assistant"
                print(f"\n--- {name} ---")
                print(msg.text)

if __name__ == "__main__":
    asyncio.run(main())
```

In this concurrent workflow, three agents are created, each with a different analytical perspective. `ConcurrentBuilder` creates a workflow that runs all participants in parallel. All three agents receive the same input: *Analyze the impact of autonomous vehicles*. They execute simultaneously, returning results as they complete.

The `ConcurrentBuilder` is a fluent builder pattern for constructing concurrent workflows:

```python
workflow = (
  ConcurrentBuilder()
  .participants([agent1, agent2, agent3])  # Agents to run in parallel
  .build()                  # Finalize and return the workflow
)
```

Unlike `SequentialBuilder`, where agents run one after another, passing output forward, `ConcurrentBuilder` fans out the input to all participants simultaneously.

With the help of events, we can track the progress of the agents as they complete.

```shell
$ python concurrent.py
Running concurrent analysis with 3 analysts...
============================================================
⚡ Starting: TechnicalAnalyst
⚡ Starting: BusinessAnalyst
⚡ Starting: EthicalAnalyst
✓ Completed: BusinessAnalyst
✓ Completed: TechnicalAnalyst
✓ Completed: EthicalAnalyst
....

✅ Workflow completed!
```

So far, we have received individual responses from each agent. But what if we want to combine their insights into a unified summary? This is where aggregators come in.

We can extend this workflow by adding an aggregator. It would be nice if another agent could take the response from the parallel workflow and summarize it for us.

### Building a custom aggregator function

An aggregator is an async function that receives all agent responses and produces a combined output. 

{{< figure src="/images/maf-concurrent-aggregator.png" >}}

```python
from agent_framework import AgentExecutorResponse, ChatMessage, Role

# Create a summarizer agent to synthesize results
summarizer = chat_client.create_agent(
    name="Summarizer",
    instructions="""You are an expert synthesizer. You will receive analyses from three perspectives:
    - Technical/Engineering
    - Business/Market  
    - Ethical/Societal
    
    Create a unified executive summary that:
    1. Highlights key insights from each perspective
    2. Identifies common themes
    3. Notes tensions or trade-offs
    4. Provides actionable recommendations
    
    Keep the summary concise but comprehensive.""",
)

async def aggregate_with_summarizer(results: list[AgentExecutorResponse]) -> str:
    """Aggregate all analyst responses using the summarizer agent."""
    
    # Step 1: Collect all analyses
    analyses = []
    for r in results:
        agent_name = r.executor_id
        # Get the last assistant message (the analysis)
        for msg in reversed(r.agent_run_response.messages):
            if msg.role.value == "assistant":
                analyses.append(f"## {agent_name} Analysis\n{msg.text}")
                break
    
    # Step 2: Create prompt for summarizer
    combined = "\n\n---\n\n".join(analyses)
    prompt = f"Please synthesize the following three analyses into a unified executive summary:\n\n{combined}"
    
    # Step 3: Run summarizer agent
    response = await summarizer.run([ChatMessage(role=Role.USER, text=prompt)])
    
    return response.text
```

This aggregator function can be used with `ConcurrentBuilder()`.

```python
workflow = (
    ConcurrentBuilder()
    .participants([technical_analyst, business_analyst, ethical_analyst])
    .with_aggregator(aggregate_with_summarizer)
    .build()
)
```

The `.with_aggregator()` method tells the workflow what to do with all the parallel results:

- All three analysts run concurrently.
- Once all are complete, the results are passed to `aggregate_with_summarizer`.
- The summarizer creates a unified executive summary.
- The summary becomes the final `WorkflowOutputEvent.data`

Here is the complete working example.

```python
from agent_framework import (
    ConcurrentBuilder, 
    AgentExecutorResponse,
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

from dotenv import load_dotenv
load_dotenv()

# Create chat client
chat_client = AzureOpenAIChatClient(
    credential=DefaultAzureCredential(),
)

# Create agents with different perspectives
technical_analyst = chat_client.create_agent(
    name="TechnicalAnalyst",
    instructions="Analyze the topic from a technical/engineering perspective. Be concise.",
)

business_analyst = chat_client.create_agent(
    name="BusinessAnalyst",
    instructions="Analyze the topic from a business/market perspective. Be concise.",
)

ethical_analyst = chat_client.create_agent(
    name="EthicalAnalyst",
    instructions="Analyze the topic from an ethical/societal perspective. Be concise.",
)

# Create aggregator/summarizer agent
summarizer = chat_client.create_agent(
    name="Summarizer",
    instructions="""You are an expert synthesizer. You will receive analyses from three different perspectives:
    - Technical/Engineering
    - Business/Market  
    - Ethical/Societal
    
    Your job is to create a unified executive summary that:
    1. Highlights the key insights from each perspective
    2. Identifies common themes across all analyses
    3. Notes any tensions or trade-offs between perspectives
    4. Provides actionable recommendations
    
    Keep the summary concise but comprehensive.""",
)

# Custom aggregator function that uses the summarizer agent
async def aggregate_with_summarizer(results: list[AgentExecutorResponse]) -> str:
    """Aggregate all analyst responses using the summarizer agent."""
    # Collect all analyses
    analyses = []
    for r in results:
        agent_name = r.executor_id
        # Get the last assistant message (the analysis)
        for msg in reversed(r.agent_run_response.messages):
            if msg.role.value == "assistant":
                analyses.append(f"## {agent_name} Analysis\n{msg.text}")
                break
    
    # Create prompt for summarizer
    combined = "\n\n---\n\n".join(analyses)
    prompt = f"Please synthesize the following three analyses into a unified executive summary:\n\n{combined}"
    
    # Run summarizer agent
    response = await summarizer.run([ChatMessage(role=Role.USER, text=prompt)])
    
    return response.text

# Build concurrent workflow with custom aggregator
workflow = (
    ConcurrentBuilder()
    .participants([technical_analyst, business_analyst, ethical_analyst])
    .with_aggregator(aggregate_with_summarizer)
    .build()
)

async def main():
    # Run the workflow with streaming events
    print("Running concurrent analysis with 3 analysts + summarizer...")
    print("=" * 60)
    
    output_evt: WorkflowOutputEvent | None = None
    
    async for event in workflow.run_stream("Analyze the impact of autonomous vehicles"):
        if isinstance(event, ExecutorInvokedEvent):
            print(f"⚡ Starting: {event.executor_id}")
        elif isinstance(event, ExecutorCompletedEvent):
            print(f"✓ Completed: {event.executor_id}")
        elif isinstance(event, WorkflowStatusEvent):
            if event.state == WorkflowRunState.IDLE:
                print("\n✅ Workflow completed!")
        elif isinstance(event, WorkflowOutputEvent):
            output_evt = event
    
    # Display the aggregated summary
    if output_evt:
        print(f"\n{'='*60}")
        print("EXECUTIVE SUMMARY (Aggregated by Summarizer Agent)")
        print(f"{'='*60}")
        print(output_evt.data)

if __name__ == "__main__":
    asyncio.run(main())
```

The design of an aggregator is important. Consider the following for designing a meaningful aggregator.

- What insights should be preserved from each agent?
- How should conflicts between perspectives be handled?
- What format does the final output need to be in?

Agents in a concurrent workflow may complete at different speeds. The concurrent workflow waits for all to finish before aggregating. If you need partial results, consider using the events to track individual completions.

In the next article, we'll explore the handoff workflow pattern, in which agents can dynamically transfer control to each other based on the conversation context. This is perfect for scenarios like customer support, where a coordinator routes requests to specialized agents. Stay tuned!

