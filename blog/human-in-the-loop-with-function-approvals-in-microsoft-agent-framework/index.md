# Human-in-the-loop with function approvals in Microsoft Agent Framework


By the time an agent has tools, conversation memory, middleware, and a workflow around them, the question of what to do when the agent decides to take an irreversible action becomes practical. Canceling a customer's order, charging a card, sending a payroll change, or deleting a record. Each of these is a decision you do not want a model making unilaterally, no matter how confident it sounds in the prose around the call.

Microsoft Agent Framework (MAF) handles this with *function approvals*. You mark a tool as approval-required during construction. When the model decides to call it, the agent runs completes early without firing the tool. Instead, the response includes a `user_input_requests` list containing the pending call, and your application surfaces it to a human (or a separate authorization system) for a yes-or-no decision. The decision goes back to the agent, the tool runs (or does not), and the conversation continues.

We have brushed against this pattern several times already: middleware's `MiddlewareTermination` is one way to short-circuit a run; hosted MCP's `approval_mode` is the same idea applied to whole MCP servers. This article is about the canonical primitive: `tool(approval_mode="always_require")` on a function tool, and the request-and-response shape that surrounds it.

## Marking a tool as approval-required

The simplest case is a function tool that should always pause for approval. Add `approval_mode="always_require"` to the `@tool` decorator (which we covered in the [function tools article](/blog/function-tools-in-microsoft-agent-framework/)).

```python
from typing import Annotated
from pydantic import Field
from agent_framework import tool

@tool(approval_mode="always_require")
def cancel_order(
    order_id: Annotated[str, Field(description="ID of the order to cancel.")],
    reason: Annotated[str, Field(description="Reason for cancellation.")] = "Customer request",
) -> str:
    """Cancel a customer order. Once cancelled, the action cannot be undone."""
    # Real implementation would call your order system.
    return f"Order {order_id} cancelled: {reason}"
```

Two values are accepted: `"always_require"` (every call pauses for approval) and `"never_require"` (the default behavior; the framework auto-invokes the tool). The mode lives on the tool, not on the agent, which means the same tool behaves the same way wherever it is wired up.

Approval-required tools are passed to the agent the same way as any other tool:

```python
agent = chat_client.as_agent(
    name="OrderAssistant",
    instructions="You are an order management assistant. Cancel orders only when explicitly asked.",
    tools=[cancel_order, get_order_status],
)
```

The model sees both tools in its catalog. It does not know which ones require approval. From its perspective, both are normal tool calls; the framework intercepts the approval-required ones before they execute.

When the model decides to call `cancel_order`, the run does not actually invoke the function. Instead, the framework completes the run early, leaving the call pending. The result object carries the pending call on its `user_input_requests` field.

```python
result = await agent.run(
    "Please cancel order #12345 because the customer changed their mind.",
    session=session,
)

if result.user_input_requests:
    print(f"Agent paused with {len(result.user_input_requests)} approval request(s).")
    for request in result.user_input_requests:
        print(f"  Tool: {request.function_call.name}")
        print(f"  Arguments: {request.function_call.arguments}")
        print(f"  Request id: {request.id}")
else:
    print("Agent answered without needing approval:", result.text)
```

A few things are worth understanding about this shape. `user_input_requests` is a list because the model can request multiple tool calls in a single turn; each call gets its own request. The request carries the function call as a `Content` object, including the tool name and the arguments the model wanted to pass. The ID is what your code uses later to construct the response.

The session captures the conversation up to and including the tool-call request. When you eventually approve or reject and resume, the framework picks up exactly where it left off.

In a production application, this is the point where you would surface the request to a human: render a "the assistant wants to cancel order #12345 because the customer changed their mind. Approve?" UI, drop the request into a queue for an admin to review, or send a notification to a Slack channel. The pattern is request-driven, so the application has full control of the approval surface.

## Approving and resuming

To resume the agent run, construct an approval response and pass it back as the next input. The simplest form uses the request's own `to_function_approval_response` helper:

```python
from agent_framework import Content

approvals: list[Content] = []
for request in result.user_input_requests:
    # Decide based on whatever logic your application uses.
    user_approved = await ask_human_for_approval(request)
    approvals.append(request.to_function_approval_response(approved=user_approved))

# Resume the agent run with the approval responses as input.
result = await agent.run(approvals, session=session)
print(result.text)
```

Once the responses are returned, the framework executes the approved tools (skipping the rejected ones), feeds the results into the conversation, and lets the model continue producing the final reply. The result of this second `agent.run` is the agent's actual response, the same as a normal run.

Rejected tools do not silently disappear. The framework records a "tool was rejected" message in the conversation, and the model sees that signal on its next turn. The model usually responds appropriately,  apologizing, suggesting an alternative, or asking for clarification, but the exact behavior depends on the prompt. For tools where rejection has a meaningful follow-up ("the cancellation was rejected, would you like to escalate?"), Include guidance in the agent's instructions about how to handle a rejected approval.

For the case where you want to construct the response without going through the request object, the lower-level constructor works too:

```python
approval = Content.from_function_approval_response(
    approved=True,
    id=request.id,
    function_call=request.function_call,
)
```

The two forms are equivalent; `to_function_approval_response` is the convenient shortcut.

## Per-tool approval on MCP servers

The same approval mechanic exists on MCP tools. We saw it briefly in the [hosted MCP article](/blog/hosted-mcp-tools-in-microsoft-agent-framework/): the `approval_mode` parameter on `chat_client.get_mcp_tool(...)` accepts the same `"always_require"` and `"never_require"` strings, plus a dict form for selective per-tool approval within a single MCP server:

```python
github_tool = chat_client.get_mcp_tool(
    name="github",
    url="https://your-github-mcp-endpoint.example.com/mcp",
    approval_mode={"always_require": ["create_issue", "delete_issue", "merge_pr"]},
)
```

With this form, the read-only tools auto-invoke and the destructive ones pause for approval, all from the same hosted server. Local MCP tools (`MCPStdioTool`, `MCPStreamableHTTPTool`) accept the same parameter in their constructors. The request-and-response shape on the agent side is identical: pending requests appear in `user_input_requests`, and you resume by passing approval responses back through `agent.run`.

The dict form is the right default for any agent that uses an MCP server with a mix of safe and unsafe operations. Allow-listing the safe ones via `approval_mode={"always_require": [...]}` is less brittle than policing the model's choices through the prompt alone.

## Designing the approval flow

The framework provides the technical pause-and-resume mechanism. The design questions live above it.

What to show the approver. The function call carries the tool name, the arguments, and the conversation ID. Most production approval UIs also show the prior message (so the approver can see why the agent made this decision) and a brief description of what the tool will do. The agent's instructions and the tool's description are good sources for the latter; do not invent a separate description for the approval UI when the canonical one is right there.

Who can approve? For some workflows, the original user is the approver (a customer approving their own card charge). For others, the approver is a different person entirely (a manager approving an action the agent took on a customer's behalf). The framework does not care; it is your responsibility to route requests to the right approver and authenticate their decision. The request ID is the handle for that routing.

How long to wait? A pending agent run does not consume model tokens, but it does sit on whatever session storage you have configured. If approvals can take days, plan storage accordingly: the [context providers article](/blog/context-providers-and-pluggable-memory-in-microsoft-agent-framework/) covered the durable-storage options, and the [checkpointing article](/blog/visualizing-and-checkpointing-workflows-in-microsoft-agent-framework/) covered the equivalent for workflows. For approvals that should not wait forever, attach a TTL at the application layer and treat expiry as an automatic rejection.

What rejection means in your domain. The framework treats rejection as "do not invoke this tool, and let the model continue." That is fine for "do not cancel the order"; it can be wrong for "do not transfer the funds, *and revert the placeholder transaction we created in the prior turn*." When rejection has side effects beyond not invoking the tool, model them explicitly, either as additional approval-required tools that fire on rejection or as a wrapper layer that the approval response triggers.

## Pitfalls

A few things to plan for once approval-required tools are in production.

The model can request multiple approvals in a single turn. A single-agent run can produce a user_input_requests list containing several entries. The application has to decide whether to approve them in batches (all-or-nothing, simpler UI) or individually (more flexible, more UI work). Either is supportable, but pick deliberately rather than accidentally.

Approval requests carry the full intended call. The arguments the approver sees are the arguments the model produced, not necessarily what the user asked for. A model can hallucinate an order ID, mishear an amount, or pick the wrong account. The approver is the last line of defense; their UI should make the actual arguments easy to scrutinize, and your application should validate them before invoking the underlying system on approval.

Auto-approve is tempting and rarely the right answer. There is always a path of least resistance where the application's "approver" is a service account that approves everything; that path defeats the purpose of marking the tool as approval-required. If you find yourself wanting to auto-approve, the right answer is usually to set `approval_mode="never_require"` on the tool itself, with the safety story moved into a different layer (validation in the function, rate-limiting middleware, and an external risk system).

Resumption requires the same session. The framework needs the prior conversation state to continue from where the run paused. Pass the same `session` through to the second `agent.run`, and make sure your session storage is durable enough to survive between the original call and the approval. If you are using an in-memory `AgentSession` and the process restarts before approval, the run is lost; rehydrate the session from a persistent store on the resume side.

Finally, approvals interact with streaming in ways that matter. A streaming run that hits an approval-required tool stops streaming when the run pauses. The application has to detect the pause (by inspecting `user_input_requests` after `await stream.get_final_response()`) and explicitly handle the resumption. Mixing approvals into a heavily streamed UI works, but it is more code than the non-streaming case.

## Summary

`approval_mode="always_require"` on a function tool, or the equivalent on an MCP tool, is the simplest path from "the agent can do this" to "the agent can ask to do this, and a human decides." The pause shape is concrete: the run completes with `user_input_requests`, the application surfaces the requests, and the resumed run carries the approval responses back into the conversation. The hardest parts are above the framework: who approves, what they see, and what rejection actually means in your domain.

