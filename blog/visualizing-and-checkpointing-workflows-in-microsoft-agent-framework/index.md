# Visualizing and checkpointing workflows in Microsoft Agent Framework


In the [previous article](/blog/workflow-fundamentals-in-microsoft-agent-framework/), we walked through the four primitives that make a Microsoft Agent Framework (MAF) workflow tick: executors, edges, events, and the superstep-based execution model. That model has two payoffs we have not yet collected. The first is *visualization*: because the graph is statically defined at build time, MAF can render it for you in a couple of standard formats. The second is *checkpointing*: because execution proceeds in discrete supersteps, the runtime can pause cleanly between them and resume later from exactly where it left off.

Both features matter for production workflows. A graph you cannot see is hard to review and even harder to use when onboarding new engineers. A long-running workflow that cannot survive a process restart is fragile. This article is about how MAF handles each.

## Visualizing a workflow

The `WorkflowViz` class wraps a built workflow and produces representations you can read or render. It supports two text formats out of the box (Mermaid and Graphviz DOT) plus image export to SVG, PNG, or PDF.

```python
from agent_framework import (
    Executor, WorkflowBuilder, WorkflowContext, WorkflowViz, handler,
)

class Doubler(Executor):
    @handler
    async def double(self, message: int, ctx: WorkflowContext[int]) -> None:
        await ctx.send_message(message * 2)

class Stringifier(Executor):
    @handler
    async def stringify(self, message: int, ctx: WorkflowContext[str, str]) -> None:
        await ctx.yield_output(f"Result: {message}")

doubler = Doubler(id="doubler")
stringifier = Stringifier(id="stringifier")

workflow = (
    WorkflowBuilder(start_executor=doubler, name="DemoWorkflow")
    .add_edge(doubler, stringifier)
    .build()
)

viz = WorkflowViz(workflow)
print(viz.to_mermaid())
```

`to_mermaid()` returns a Mermaid string suitable for dropping straight into a markdown file or any Mermaid-rendering tool:

```text
flowchart TD
  doubler["doubler (Start)"];
  stringifier["stringifier"];
  doubler --> stringifier;
```

`to_digraph()` returns the equivalent in Graphviz DOT. For static documentation, image export is often what you want:

```python
viz.save_svg("workflow.svg")
viz.save_png("workflow.png")
viz.save_pdf("workflow.pdf")
```

For a programmatic export with explicit format selection, use `export("svg" | "png" | "pdf" | "dot", filename=...)`. SVG and DOT do not require any system tools beyond the Python package; PNG and PDF rely on the `graphviz` binary being on your `PATH`, as with any other Python project that renders DOT.

By default, the visualization shows only the executors you defined. Some orchestration builders (handoff, group chat, magentic) inject framework-internal coordinator executors that do not directly correspond to anything in your code. To include them in the diagram, pass `include_internal_executors=True`. For a documentation diagram, the default is the right call; for debugging unexpected event sequences, the more verbose form often answers the question "where is this event coming from."

A practical note. The Mermaid output is the cheapest to integrate, and it is what most blog posts and READMEs use. Reach for SVG when you need precise sizing or want to embed a vector graphic in a slide deck. Reach for DOT only when you need post-processing with another Graphviz tool. The image formats are convenient for review but immutable; if the workflow changes, regenerate.

## Why checkpointing

A workflow that runs in a single process for ten seconds does not need checkpoints. A workflow that runs across days, waits on a human approver, fans out to many calls to a slow service, or simply needs to survive an application restart does so. Without checkpointing, a process crash or a planned deployment causes the run to lose the state; with checkpointing, the run resumes from the last completed superstep and continues.

MAF's superstep execution model is what makes this clean. The runtime knows exactly which executors have finished and what messages are sitting in the next-step inboxes at any superstep boundary. That is the natural pause point: serialize the state at the boundary, store it somewhere durable, and a future run can rehydrate from the same point with no surprises.

Concretely, MAF saves a `WorkflowCheckpoint` per superstep when checkpoint storage is configured on the builder. Each checkpoint carries a generated ID, an iteration counter, messages in flight, any per-executor state, and a hash of the graph signature, so that resumption can detect graph drift.

## Adding checkpoint storage

Checkpointing is enabled when you provide the builder with a `CheckpointStorage` instance and a workflow name. After that, the runtime automatically persists checkpoints; no per-handler code changes.

```python
from agent_framework import InMemoryCheckpointStorage

storage = InMemoryCheckpointStorage()

workflow = (
    WorkflowBuilder(
        start_executor=doubler,
        checkpoint_storage=storage,
        name="DemoWorkflow",
    )
    .add_edge(doubler, stringifier)
    .build()
)

async for event in workflow.run(5, stream=True):
    if event.type == "output":
        print(f"Output: {event.data}")
```

The workflow name matters because the storage layer keys checkpoints by workflow. Several workflows can share the same storage backend without colliding, and resumption uses the name to find the right runs to choose from.

Inspect what was saved:

```python
ids = await storage.list_checkpoint_ids(workflow_name="DemoWorkflow")
print(f"{len(ids)} checkpoints saved.")

latest = await storage.get_latest(workflow_name="DemoWorkflow")
if latest:
    print(f"Latest iteration: {latest.iteration_count}")
    print(f"Latest id: {latest.checkpoint_id}")
```

For our two-executor demo, one checkpoint is saved per superstep, so a complete run produces two checkpoints. For a longer graph, expect one per superstep, with the count increasing linearly with the run depth.

## Resuming from a checkpoint

To pick up a run from a checkpoint, pass the checkpoint ID to the `workflow.run` along with the same storage instance. No new input message is needed; the runtime rehydrates from the saved state and continues from there.

```python
latest = await storage.get_latest(workflow_name="DemoWorkflow")

async for event in workflow.run(
    checkpoint_id=latest.checkpoint_id,
    checkpoint_storage=storage,
    stream=True,
):
    if event.type == "output":
        print(f"Resumed output: {event.data}")
```

The most common shape this enables is a workflow that *pauses* to wait for an external event, such as human approval, and *resumes* once the event arrives. The pause is just a checkpoint; the resume is just `run(checkpoint_id=..., responses=...)`. The `responses` parameter is how you supply data that the workflow was waiting on; for an approval flow, it is where the approver's decision goes.

For a workflow that does not require external input but simply wants to retry the last superstep (perhaps after fixing a bug in an executor), the same shape works without `responses`. The runtime replays the stored messages through the (newly redeployed) handler code.

A third use case is *forking*. A checkpoint ID is just a string; nothing prevents you from running a checkpoint multiple times, with different `responses` each time, to explore alternative paths. This is occasionally useful for evaluation pipelines that want to compare downstream behavior under different responses to the same upstream prompt.

## Picking storage

MAF ships two storage backends, and the abstract base class lets you write your own.

`InMemoryCheckpointStorage()` keeps checkpoints in a Python dictionary that lives for the duration of the process. Useful for tests, demos, and short-lived development loops. Not useful for anything that has to survive a restart.

`FileCheckpointStorage(storage_path=...)` writes checkpoints as JSON files under a directory you specify. The right default for single-machine deployments and for development workflows where you want to inspect what was saved.

```python
from agent_framework import FileCheckpointStorage
storage = FileCheckpointStorage(storage_path="./checkpoints/")
```

For production with multiple machines, you probably want a shared backend, which means you'll need to write your own. Subclass `CheckpointStorage` and implement `save`, `load`, `delete`, `list_checkpoint_ids`, `list_checkpoints`, and `get_latest`. The interface is small and intentionally storage-shaped: any KV store with prefix scans (Cosmos, Redis, S3 with a metadata index, Postgres) maps cleanly onto it.

A general rule for production checkpoint storage: use the same persistence layer as the rest of your application's state. The checkpoint is part of the application's durable state, and placing it alongside the rest of the application (rather than on its own bespoke backend) keeps backups, observability, and disaster recovery uniform.

## Inspecting a checkpoint

`WorkflowCheckpoint` is a serializable record. The fields that matter for most cases:

| Field | What it carries |
|-------|-----------------|
| `checkpoint_id` | Unique id for this checkpoint (used to resume). |
| `previous_checkpoint_id` | The id of the checkpoint this one was created from, useful for tracing the run's history. |
| `iteration_count` | Which superstep produced this checkpoint. |
| `messages` | The messages in flight at the boundary. |
| `state` | Per-executor state captured at the boundary. |
| `pending_request_info_events` | Outstanding requests for external input (the human-in-the-loop case). |
| `metadata` | Free-form metadata associated with the run. |
| `workflow_name` | The workflow this checkpoint belongs to. |
| `graph_signature_hash` | A hash of the graph at build time, used to detect changes to the graph since the checkpoint was saved. |

The graph signature hash is worth understanding. If you save a checkpoint, change the graph (rename an executor or add a new edge), and then try to resume, the runtime detects the mismatch via the hash and refuses to resume, rather than silently doing the wrong thing. For long-lived applications where the graph evolves over time, plan a migration path: a "drain" phase in which outstanding checkpoints finish on the old graph before the new one ships, or explicit checkpoint discarding at deployment time.

## Things to know

Checkpoint storage grows. Every superstep produces a checkpoint. A long-running, deeply-iterating workflow can produce hundreds. Have a retention policy: keep the latest N, or all checkpoints since the last completed run, and prune the rest. The storage layer's `delete` method is the hook for this.

Sensitive data lives in checkpoints. Messages, executor state, and request metadata all serialize as part of the checkpoint. If your workflow handles PII, secrets, or anything else that should not sit on disk in clear text, encrypt at the storage layer (or use a backend that does it for you). The framework does not do this automatically.

Resumption is exact, not approximate. Resuming a checkpoint replays from the saved superstep boundary; it does not "almost" replay. If the executor code has changed in a way that affects deterministic behavior (e.g., a different random seed or an external API version), the resumed run can diverge from what the original run would have done. For most workflows, this is fine, but for ones where bit-level reproducibility matters, resumption is not the right tool.

The default backend (`InMemoryCheckpointStorage`) survives nothing. If you have wired checkpointing into a service and it is not surviving restarts, the first thing to check is which storage backend you actually configured. The in-memory backend is convenient enough that it shows up in production code by accident.

Finally, do not assume you can mix and match. Once a workflow has been built and is producing checkpoints, do not change the storage backend mid-flight. Migrate by draining the old storage's runs before pointing the new builder at the new backend.

## Summary

`WorkflowViz` turns the static graph into something you can paste into a docstring or render as an image. `CheckpointStorage`, configured at build time, turns the BSP execution model into something you can pause and resume across processes, deployments, and human-in-the-loop waits. Both are small APIs that lean directly on the workflow primitives we covered in the [previous article](/blog/workflow-fundamentals-in-microsoft-agent-framework/), and both are the kind of feature that pays for itself the first time a long-running workflow needs to survive an event the developer did not see coming.

