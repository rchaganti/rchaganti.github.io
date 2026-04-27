# Workflow fundamentals in Microsoft Agent Framework


Earlier in this series, we walked through the five orchestration patterns Microsoft Agent Framework (MAF) ships with: [sequential](/blog/sequential-workflows-in-microsoft-agent-framework/), [concurrent](/blog/concurrent-workflows-in-microsoft-agent-framework/), [handoff](/blog/handoff-workflows-in-microsoft-agent-framework/), [group chat](/blog/groupchat-workflows-in-microsoft-agent-framework/), and [magentic](/blog/magentic-workflows-in-microsoft-agent-framework/). Each one came with a fluent builder (`SequentialBuilder`, `ConcurrentBuilder`, and so on) and a tidy mental model. They are the right tools for ninety percent of multi-agent work.

This article is about the other ten percent. The orchestration builders are convenience layers on top of a smaller, more general set of primitives: *executors* (units of computation), *edges* (the connections between them), *events* (the observable signals the runtime emits as it works), and a *superstep* execution model that decides what runs when. When you understand those four things, the builders stop being magic, and you can build the workflows that the builders do not cover.

We will introduce each primitive, build a small workflow that uses them all, walk through the event stream the runtime produces, and close with the cases where you should and should not reach for the raw API.

## The four primitives

A MAF workflow is a directed graph of *executors* connected by *edges*. An executor is any object that knows how to handle one or more message types and produce zero or more output messages. An edge is a routing rule: when this executor produces a message of this type, send it to that executor. The framework runs the graph in *supersteps* (a single round in which "every executor that has incoming messages runs in parallel") and emits a stream of events throughout, so the calling code can observe progress.

The orchestration builders are pre-baked configurations of executors and edges. `SequentialBuilder` adds an executor for each agent and connects them in a line. `ConcurrentBuilder` fans the input out to a set of agents and fans the results back in. `MagenticBuilder` adds a manager executor that decides at run time which participant to send messages to. The graph is the unit underneath all of them.

## A first workflow

The smallest interesting example is two executors connected by a single edge. The first doubles its input; the second converts the result to a string and returns it as the workflow's output.

```python
import asyncio

from agent_framework import Executor, WorkflowBuilder, WorkflowContext, handler

class Doubler(Executor):
    @handler
    async def double(self, message: int, ctx: WorkflowContext[int]) -> None:
        await ctx.send_message(message * 2)


class Stringifier(Executor):
    @handler
    async def stringify(self, message: int, ctx: WorkflowContext[str, str]) -> None:
        await ctx.yield_output(f"Result: {message}")


async def main():
    doubler = Doubler(id="doubler")
    stringifier = Stringifier(id="stringifier")

    workflow = (
        WorkflowBuilder(start_executor=doubler)
        .add_edge(doubler, stringifier)
        .build()
    )

    final = None
    async for event in workflow.run(5, stream=True):
        if event.type == "output":
            final = event.data

    print(final)


asyncio.run(main())
```

Running this prints `Result: 10`. 

Each executor subclasses `Executor`. The processing logic is a method decorated with `@handler`. The decorator inspects the type annotations on the method to figure out which input types the executor can accept and which output types it can produce. `Doubler.double` accepts an `int` and produces an `int`; `Stringifier.stringify` accepts an `int`, sends `str` messages downstream, and is allowed to yield `str` workflow outputs (the second `str` in `WorkflowContext[str, str]`).

`ctx.send_message(value)` is how an executor passes a message to the next executor along the graph. The runtime decides which executors receive the message based on the edges defined in the builder. `ctx.yield_output(value)` is how an executor marks a value as the workflow's final output, surfacing through the `event.type == "output"` event we covered in the [streaming article](/blog/streaming-and-multi-turn-conversations-in-microsoft-agent-framework/).

The `WorkflowBuilder` is constructed with a `start_executor` (the executor that receives the workflow's input) and a sequence of `add_edge(source, target)` calls that wire the graph together. The `build()` call validates the graph and returns a runnable `Workflow`.

## Executors in detail

The `@handler` decorator is the only piece of plumbing that turns a method into a workflow handler. The method's first argument is `self`; the second is the message; the third is the `WorkflowContext`, parameterized by the types the handler can produce. The runtime inspects all three to figure out the executor's input and output types.

An executor can have multiple `@handler` methods, each accepting a different message type:

```python
class Router(Executor):
    @handler
    async def handle_text(self, message: str, ctx: WorkflowContext[dict]) -> None:
        await ctx.send_message({"kind": "text", "value": message})

    @handler
    async def handle_number(self, message: int, ctx: WorkflowContext[dict]) -> None:
        await ctx.send_message({"kind": "number", "value": message})
```

`Router` accepts both `str` and `int` messages. The runtime dispatches each incoming message to the matching handler based on its type.

A handler can also produce no output messages at all. That is the right shape for a "side-effect" executor that, for example, writes to a database or emits a custom event but does not feed anything downstream:

```python
class Audit(Executor):
    @handler
    async def log_message(self, message: str, ctx: WorkflowContext[None]) -> None:
        print(f"[audit] saw: {message}")
```

The `WorkflowContext[None]` annotation tells the framework that this executor produces no downstream messages. It can still observe input, write to logs, mutate external state, or call `ctx.add_event(...)` to emit a custom event into the run's event stream.

Every executor has an `id` (set via the constructor or auto-generated). The id is what shows up in `executor_invoked` / `executor_completed` events and is the handle you use to set explicit edges between executors. For graphs with more than a few nodes, set the ids deliberately so the event stream is readable.

## Edges

An edge is a routing rule: when this executor produces a message that the target executor can handle, send it. The simplest edge is a direct connection.

```python
WorkflowBuilder(start_executor=a) \
    .add_edge(a, b) \
    .build()
```

A *conditional* edge attaches a predicate. The message only flows to the target if the predicate returns true:

```python
.add_edge(router, text_path, condition=lambda msg: msg["kind"] == "text")
.add_edge(router, number_path, condition=lambda msg: msg["kind"] == "number")
```

This is the building block that lets you create branching workflows: one source, several possible targets, the edges' conditions decide which one fires for any given message.

For *fan-out* (one source, multiple parallel targets), the builder has a convenience method:

```python
.add_fan_out_edges(start, [worker_a, worker_b, worker_c])
```

The message produced by `start` is delivered to all three workers in the same superstep, and they run in parallel. The inverse, *fan-in*, is the corresponding shape:

```python
.add_fan_in_edges([worker_a, worker_b, worker_c], aggregator)
```

The `aggregator` executor only fires when all three workers have produced output. Its handler receives a list of the workers' messages, in source-id order. This is exactly how the concurrent orchestration builder works under the hood: a fan-out from the input to the participant agents, and a fan-in to the aggregator.

For more elaborate routing — picking one of several targets based on a more nuanced rule — `add_switch_case_edge_group` and `add_multi_selection_edge_group` give you `switch` semantics and a multi-target select rule, respectively. Reach for those when the conditional-edge form starts to get unwieldy.

## The BSP execution model

The runtime executes the graph in *supersteps*, following a Bulk Synchronous Parallel pattern.

Each *superstep* proceeds in three phases. First, all executors that have at least one incoming message run in parallel. Second, the messages they produce are collected and routed across the edges to the next set of target executors. Third, the runtime emits a `superstep_completed` event and starts the next superstep with whatever messages are now sitting in the inboxes.

This matters because it tells you what runs in parallel and what does not. Within a *superstep*, every executor with incoming messages runs concurrently; across *supersteps*, each one waits for the previous to finish. A fan-out followed by a fan-in is therefore one *superstep* of parallel work, followed by another *superstep* in which the aggregator runs alone. A long sequential chain is N *supersteps*, with one executor per step.

It also shows how the runtime handles cycles: a graph with a feedback loop runs as long as messages are still in flight, up to the max_iterations limit in `WorkflowBuilder`. The default is 100, which is enough for most scenarios; if your graph genuinely needs to iterate longer, raise it explicitly.

The model is deliberate. Pregel-like execution is what makes workflows checkpoint-able (you can pause cleanly between *supersteps*), durable (you can resume from the last completed *superstep*), and observable (each *superstep* is a discrete, namable point in the run). Those properties are what we will lean on in the next article when we cover checkpointing and resuming.

## Events

The runtime produces a typed event stream while the graph executes. We saw the high-level shape in the [streaming article](/blog/streaming-and-multi-turn-conversations-in-microsoft-agent-framework/); here are the events that matter for raw-workflow code, with the fields each one carries.

| Event type | When it fires | Useful fields |
|------------|---------------|---------------|
| `"started"` | Run begins | (lifecycle marker) |
| `"status"` | Workflow state changes | `event.state` (`STARTED`, `IN_PROGRESS`, `IDLE`, `FAILED`, ...) |
| `"superstep_started"` | A new superstep begins | `event.iteration` |
| `"executor_invoked"` | A handler is about to run | `event.executor_id`, `event.data` (the input message) |
| `"executor_completed"` | A handler finished | `event.executor_id`, `event.data` (the messages it sent) |
| `"superstep_completed"` | All executors in a superstep finished | `event.iteration` |
| `"output"` | An executor yielded a workflow output | `event.executor_id`, `event.data` (the output value) |
| `"executor_failed"` | A handler raised | `event.executor_id`, `event.details` |
| `"failed"` | The whole run failed | `event.details` |
| `"warning"` / `"error"` | User-emitted via `ctx.add_event` | `event.data` |

Iterating the run with `stream=True` and filtering by `event.type` is the lowest-level way to observe a workflow. For interactive surfaces, you usually only care about `executor_invoked` (to show "now running X"), `output` (to capture results), and the failure events. For audit and tracing, the full stream is what you want, including the superstep markers, which give you a clean way to align traces with the BSP semantics.

## Raw workflows vs orchestration builders

The raw API gives you total control, and almost always more flexibility than you need. Reach for it in three cases.

The first is a *novel topology*. If your workflow is not "agents in a pipeline," "agents in parallel," "agents that pass control to each other," or one of the other shapes the builders ship with, building the graph by hand is the cleanest path. Examples include map-reduce-style pipelines over data, branching workflows whose structure depends on the input, or workflows that mix agents with pure-Python executors.

The second is *non-agent computation*. Executors do not have to be agents. Plain Python code, calls to external services, transformations, validators, and so on are all valid executors. When most of your workflow is data shuffling with one or two agent calls in the middle, the raw API keeps the graph honest about that.

The third is *production primitives that the builders do not surface*. Checkpointing, custom events, edge conditions that depend on accumulated state, and integration with the request-info system for human-in-the-loop pauses all occur at the `WorkflowBuilder` / `Executor` layer. The orchestration builders use these internally; for direct access, use the raw API.

For everything else — and that is most agent work — the orchestration builders are the better default. They are tested, they bake in good patterns, and they save you from rebuilding the same graph for the hundredth time.

## Things to know

Type annotations are load-bearing. The framework derives input and output types from `@handler` annotations, and a wrong annotation produces a runtime "no handler matches this message" error well after the workflow starts. When the graph misbehaves, the first place to look is whether the message type at the source matches the parameter type at the target.

Handlers must be `async`. The runtime always invokes them through the asyncio event loop, and a synchronous handler will simply not run. Wrap blocking calls in `asyncio.to_thread` rather than calling them directly, the same advice we gave for [function tools](/blog/function-tools-in-microsoft-agent-framework/).

Cycles need an explicit termination story. The runtime will keep running supersteps as long as messages are in flight, up to `max_iterations`. A workflow that loops indefinitely will hit the limit and fail rather than running forever, but the failure mode is not always obvious. Build a counter into your state or use a conditional edge to break the loop, rather than relying on the iteration cap.

Fan-in waits for all sources. A fan-in edge group only fires the aggregator when every source has produced a message in the current run. If one source can legitimately produce no message, the aggregator will hang. Either guarantee every source produces something (even a sentinel "no result" value) or model the optional source differently.

Finally, the graph is statically defined at build time. You cannot add or remove edges while the workflow runs. If your topology genuinely needs to change with the input, the right move is usually a `MagenticBuilder`-style manager executor that decides routing at run time, not graph mutation.

## Summary

A MAF workflow is a graph of executors connected by edges, executed in supersteps, observed through a typed event stream. The orchestration builders cover the common shapes; the raw `WorkflowBuilder` and `Executor` API covers everything else, and gives you direct access to the primitives the builders are built on. When you reach for the raw API, you are making a deliberate trade: more code, more flexibility, more responsibility for making the graph make sense.

In the next article, we will look at the two operational features that underpin much of the BSP execution model: checkpointing (pausing a long-running workflow cleanly between supersteps) and visualization (exporting the graph as a Mermaid or Graphviz diagram so the topology is reviewable). Both lean on the same primitives we covered here.

