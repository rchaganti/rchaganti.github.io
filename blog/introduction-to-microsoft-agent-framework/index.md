# Introduction to Microsoft Agent Framework


I have been following the Microsoft ecosystem for agent and agentic workflow development and have evaluated frameworks such as [AutoGen](https://github.com/microsoft/autogen) and [Semantic Kernel](https://github.com/microsoft/semantic-kernel). In the past, I have written [briefly about AutoGen](https://ravichaganti.com/categories/autogen/). I used Semantic Kernel, along with Azure AI Foundry, to experiment with a few enterprise-ready agentic scenarios. Both frameworks are useful in their own ways, and Semantic Kernel, with its enterprise-deployment readiness, became the go-to framework for many. Microsoft [announced plans to converge these frameworks](https://devblogs.microsoft.com/foundry/introducing-microsoft-agent-framework-the-open-source-engine-for-agentic-ai-apps/) into what it calls the Microsoft Agent Framework, which brings together the best parts of AutoGen and Semantic Kernel.

Microsoft Agent Framework supports enterprise integrations using Microsoft 365 Agents SDK and the enterprise-grade agent service integrations with Microsoft Foundry (Azure AI Foundry is renamed to Microsoft Foundry). Microsoft Agent Framework is built with interoperability at its core, which means it has built-in support for open standards such as the Model Context Protocol (MCP) for data and tool access and Agent-to-Agent (A2A) for inter-agent communication. 

![Source: Microsoft](https://devblogs.microsoft.com/foundry/wp-content/uploads/sites/89/2025/10/Screenshot-2025-10-14-214120-1024x489.png)

**Figure 1**: Agent Framework (Source: Microsoft)

Microsoft Agent Framework supports [Agent](https://learn.microsoft.com/en-us/agent-framework/user-guide/agents/agent-types/) and [Workflow](https://learn.microsoft.com/en-us/agent-framework/user-guide/workflows/overview) orchestration. This enables LLM-driven reasoning and decision-making as well as business-logic driven deterministic agentic workflows. As a developer, you can choose what makes more sense for your use case. Agents and workflows are two primary capability categories that this framework offers. 

Agents use LLMs as their brains, tools for accessing external APIs, and to perform actions. Because of their probabilistic nature, agents are best suited to scenarios where the input task is unstructured and cannot be easily defined in advance. Microsoft Agent Framework supports different types of agents for different use cases. The Azure AI Foundry Agents are used to create agents that use the Foundry Agent service. In addition, it supports Anthropic agents, Azure OpenAI, and OpenAI chat and response agents. 

Here is a quick example of an [Azure AI Foundry agent](https://learn.microsoft.com/en-us/agent-framework/user-guide/agents/agent-types/azure-ai-foundry-agent).

```python
import asyncio
from agent_framework.azure import AzureAIAgentClient
from azure.identity.aio import AzureCliCredential

async def main():
    async with (
        AzureCliCredential() as credential,
        AzureAIAgentClient(async_credential=credential).create_agent(
            name="HelperAgent",
            instructions="You are a helpful assistant."
        ) as agent,
    ):
        result = await agent.run("Hello!")
        print(result.text)

asyncio.run(main())
```

Workflows are graph structures that connect multiple agents to perform complex, multi-step tasks. A workflow is well-suited to a predefined sequence of operations and may include multiple agents, external integrations, and human interactions. By defining the flow of work, a developer can control the execution path, resulting in more deterministic behavior. Microsoft Agent Framework derives its workflow orchestration capabilities from AutoGen and therefore supports sequential, concurrent (parallel), handoff (control transfer), group chat (collaborative conversations), and magentic (manager-coordinated) workflows.

Here is a quick example of a concurrent workflow.

```python
from agent_framework.azure import AzureChatClient
from agent_framework import ChatMessage, WorkflowCompletedEvent
from agent_framework import ConcurrentBuilder

chat_client = AzureChatClient(credential=AzureCliCredential())

researcher = chat_client.create_agent(
    instructions=(
        "You're an expert market and product researcher. Given a prompt, provide concise, factual insights,"
        " opportunities, and risks."
    ),
    name="researcher",
)

marketer = chat_client.create_agent(
    instructions=(
        "You're a creative marketing strategist. Craft compelling value propositions and target messaging"
        " aligned to the prompt."
    ),
    name="marketer",
)

legal = chat_client.create_agent(
    instructions=(
        "You're a cautious legal/compliance reviewer. Highlight constraints, disclaimers, and policy concerns"
        " based on the prompt."
    ),
    name="legal",
)

workflow = ConcurrentBuilder().participants([researcher, marketer, legal]).build()

completion: WorkflowCompletedEvent | None = None
async for event in workflow.run_stream("We are launching a new budget-friendly electric bike for urban commuters."):
    if isinstance(event, WorkflowCompletedEvent):
        completion = event

if completion:
    print("===== Final Aggregated Conversation (messages) =====")
    messages: list[ChatMessage] | Any = completion.data
    for i, msg in enumerate(messages, start=1):
        name = msg.author_name if msg.author_name else "user"
        print(f"{'-' * 60}\n\n{i:02d} [{name}]:\n{msg.text}")        
```

In this series of articles, we will learn how to create agents and workflows using the Microsoft Agent Framework. We will start by diving deep into Agents, then move on to exploring workflows in depth.

{{< notice "info" >}}
  Last updated: 6th December 2025
{{< /notice >}}


