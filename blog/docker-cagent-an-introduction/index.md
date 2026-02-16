# Docker cagent - An introduction


Docker is one company that has been really taking advantage of the AI wave. True to its philosophy, it is helping developers with new tools and frameworks to simplify AI application development. Starting with Docker MCP catalog, MCP toolkit, Model Runner, MCP gateway, and cagent, Docker is certainly at the forefront of AI agent developer experience. In this article, we will get started with `cagent`.

## Introduction

[Docker `cagent`](https://www.docker.com/blog/cagent-build-and-distribute-ai-agents-and-workflows/) is an [open-source](https://github.com/docker/cagent), multi-agent AI runtime that lets you build, orchestrate, and share teams of specialized AI agents defined declaratively in YAML. Instead of wiring together complex agent frameworks in code, you describe what each agent does, which tools it can access, and how agents delegate to one another. `cagent` handles the rest: model communication, tool orchestration, context isolation, and inter-agent coordination. It ships bundled with Docker Desktop 4.49+ and can distribute agent configurations as OCI artifacts through Docker Hub, treating agents with the same rigor as container images. Written in Go and currently labeled experimental, `cagent` represents Docker's bet that the agent ecosystem needs the same standardization, portability, and trust infrastructure that containers brought to application deployment.

With the evolution of various agent frameworks, we are moving from a simple request-response pattern for implementing monolithic agents to orchestrating specialized agents. `cagent` helps simplify this transition with its declarative approach.

cagent sits at the top of Docker's AI stack. [Docker Model Runner (DMR)](https://www.docker.com/blog/announcing-docker-model-runner-ga/) provides local inference with no API keys. The [MCP Gateway](https://www.docker.com/blog/docker-mcp-gateway-secure-infrastructure-for-agentic-ai/) orchestrates external tools in isolated containers. The [MCP Catalog](https://hub.docker.com/mcp) offers curated tool servers on Docker Hub. cagent ties these layers together. It uses DMR for local models, routes tool calls through the MCP Gateway, and packages agent configurations as OCI artifacts for distribution. If Docker containers standardized how applications ship, `cagent` aims to standardize how AI agents ship.

## Architecture

`cagent`'s architecture centers on a few core concepts that govern how agents are defined, how they communicate, and how they access tools. Every agent configuration has a root agent, which is the entry point that receives user messages. The root agent can work alone or coordinate a team through two delegation mechanisms.

### Sub-agents

Sub-agents implement hierarchical task delegation. A parent agent assigns a specific task to a child agent using an auto-generated `transfer_task` tool. The child agent executes in its own isolated context. Each child agent has its own model, instructions, and toolset and returns results to the parent. The parent retains control and can delegate to multiple sub-agents in a sequence or combine their outputs. Sub-agents can have sub-agents themselves, enabling arbitrarily deep hierarchies.

### Handoffs

The handoff mechanism implements peer-to-peer conversation transfer. When an agent encounters a topic outside its expertise, it hands the entire conversation to a more suitable peer using the `transfer_to_agent` tool. The receiving agent takes over completely. This pattern works well for routing conversations between domain experts without a central coordinator.

Each agent maintains its own conversation context. When a root agent delegates to a sub-agent, the sub-agent receives only the specific task description, not the parent's full conversation history. This isolation keeps contexts focused and prevents token-bloat in deep hierarchies.

## Getting started

[Docker Desktop 4.49+](https://docs.docker.com/desktop/) includes cagent integration. After updating Docker Desktop, verify with:

```shell
PS> cagent version
cagent version v1.19.4
Commit: 7e631ef3f39ee56e4c0f2bb39eab73444c040601
```

You can also install `cagent` using the standalone binary available on the GitHub [releases](https://github.com/docker/cagent/releases) page. 

`cagent` [supports models](https://docs.docker.com/ai/cagent/model-providers/) from Anthropic, Gemini, and OpenAI. For managed model providers, it is important to supply the API keys as environment variables.

```shell
export ANTHROPIC_API_KEY=your_key
export OPENAI_API_KEY=your_key
export GOOGLE_API_KEY=your_key
```

`cagent` also supports local models run using Docker Model Runner and an OpenAI-compatible endpoint.

### Basic agent

`cagent` uses a YAML configuration file for defining the agentic application. The YAML skeleton structure is as shown below.

```yaml
version: "2"        # Schema version (current: "2")
agents: {}          # Required — agent definitions
models: {}          # Optional — named model configurations
rag: {}             # Optional — RAG knowledge sources
metadata: {}        # Optional — author, license, readme
```

The "2" schema version is the current standard and is shipped with Docker Desktop 4.49+. Older files without a version field are treated as v1 and remain backward-compatible. The v2 schema supports the full feature set, including RAG, structured output, thinking budgets, and advanced delegation.

We will dive into configuration options as we progress in this walk-through. Let us start with a basic agent.

```yaml
agents:
  root:
    model: openai/gpt-4o
    description: A helpful coding assistant
    instruction: |
      You are a helpful coding assistant.
      Help me write and understand code.
      When I ask you to write code, please provide it in a markdown code block.
      When I ask you to explain code, please provide a clear, concise explanation.
```

This basic agent uses a simple configuration and uses `openai/gpt-4o` for the model. You can run this agent using the `cagent exec` command.

````shell
PS> cagent exec .\cagent\01-basic.yaml "Write a Python program to determine the nth factorial."

--- Agent: root ---
To determine the nth factorial, you can use a simple iterative function. Here's a Python program that calculates the factorial of a number \( n \):

```python
def factorial(n):
    if n < 0:
        raise ValueError("Factorial is not defined for negative numbers")
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

# Example usage:
n = 5
print(f"The factorial of {n} is: {factorial(n)}")
```

### Explanation:
- This function `factorial` computes the factorial of a non-negative integer \( n \).
- If \( n \) is less than 0, it raises a `ValueError` since factorials are only defined for non-negative integers.
- It initializes `result` to 1 because the factorial of 0 is 1 by definition.
- It uses a for loop to multiply `result` by each integer from 2 up to \( n \), inclusive. This iteratively calculates the factorial.
- Finally, it returns the calculated `result`.

You can replace `n = 5` with any non-negative integer to find its factorial.
````

`cagent exec` takes a prompt and generates a response. If you prefer a conversational interface, you can use the `cagent run` command. This command opens a simple yet beautiful TUI.

{{< figure src="/images/cagent-tui.png" >}}  {{< load-photoswipe >}}

Let us try the same with a local model run using DMR.

```yaml
models:
  local-gemma:
    provider: dmr
    model: ai/gemma3:4B
    base_url: http://localhost:12434/v1

agents:
  root:
    model: local-gemma
    description: A helpful coding assistant
    instruction: |
      You are a helpful coding assistant.
      Help me write and understand code.
      When I ask you to write code, please provide it in a markdown code block.
      When I ask you to explain code, please provide a clear, concise explanation.
```

In this example, we use the `models` object from the configuration to define the agent's model configuration. `local-gemma` is the model configuration name we can reference in the agent configuration. If you are running this on a Windows system, ensure you also provide the `base_url`. By default, `cagent` tries to connect to a local socket for the model endpoint. This configuration can be run the same way we did earlier. The other supported model fields in the model configuration include `provider`, `model`, `max_tokens`, `temperature`, `top_p`, `frequency_penalty`, `presence_penalty`, `base_url` (for custom endpoints), `token_key`, `parallel_tool_calls`, and `provider_opts` for provider-specific settings. Alloy models let you rotate between multiple models by separating names with commas in the `model` field. 

The `model` specification we saw in the first example is the inline shorthand specification. The prefix in the model name, such as `openai` or `dmr`, is used to route to the appropriate provider. `model: auto` lets cagent auto-select a provider based on available API keys.

### A simple multi-agent

Now that we have a basic agent working, let us explore the real power of `cagent`. In this example, we will build a small team: a coordinator agent that delegates research to a researcher and writing to a writer. Each agent has its own model, instructions, and tools.

```yaml
version: "2"

agents:
  root:
    model: openai/gpt-4o
    description: Coordinator that manages a research and writing team
    instruction: |
      You are a project coordinator. When a user asks you to write
      about a topic:
      1. First, delegate research to the researcher agent
      2. Then, pass the research findings to the writer agent
      3. Present the final output to the user
      Always delegate. Do not research or write yourself.
    sub_agents: [researcher, writer]

  researcher:
    model: openai/gpt-4o-mini
    description: Researches topics and gathers key facts
    instruction: |
      You are a research specialist. When given a topic, provide
      a structured summary of key facts, important details, and
      relevant context. Be thorough but concise.

  writer:
    model: openai/gpt-4o-mini
    description: Writes polished content from research notes
    instruction: |
      You are a skilled technical writer. When given research notes,
      transform them into a well-structured, engaging article.
      Use clear language and logical flow. Do NOT use bullet points.
```

There are a few important things to observe in this configuration. The `root` agent is always the entry point. It is the only agent that interacts directly with the user. The `sub_agents` field lists the agents that the root agent can delegate tasks to. Each sub-agent has its own `model`, `description`, and `instruction`. The `description` field is particularly important in multi-agent setups since `cagent` uses it to help the parent agent decide which sub-agent to call and what task to assign.

Notice how we are using `gpt-4o` for the coordinator (which needs to understand complex instructions and make delegation decisions) and the cheaper `gpt-4o-mini` for the researcher and writer (which handles more focused, well-defined tasks). This is a practical cost-optimization pattern: use your most capable model where judgment matters, and cheaper models where the task is well scoped.

Let us run this agent and see how it works.

```shell
PS> cagent exec .\cagent\03-multi-agent.yaml "Write about the history of containerization in software"
```

When you run this, you will see the delegation in action. `cagent` clearly labels which agent is active at each step. The root agent interprets the user request, delegates research to the researcher, receives findings, and then hands those findings to the writer for polishing.

There is also an alternative delegation mechanism called handoffs. Unlike sub-agents, where the parent retains control, a handoff transfers the entire conversation to another agent. This is useful when you want domain experts to take over completely.

```yaml
agents:
  root:
    model: openai/gpt-4o
    description: Routes user queries to the right expert
    instruction: |
      You are a routing agent. Based on the user's question:
      - If it's about Python, hand off to python_expert
      - If it's about Go, hand off to go_expert
      - For general questions, answer directly
    handoffs: [python_expert, go_expert]

  python_expert:
    model: openai/gpt-4o-mini
    description: Expert Python developer
    instruction: |
      You are an expert Python developer. Help users with
      Python-related questions, code reviews, and debugging.

  go_expert:
    model: openai/gpt-4o-mini
    description: Expert Go developer
    instruction: |
      You are an expert Go developer. Help users with
      Go-related questions, code reviews, and debugging.
```

The key difference: `sub_agents` uses a `transfer_task` tool in which the parent assigns a specific task and receives the results. `handoffs` uses a `transfer_to_agent` tool where the conversation moves entirely to the new agent. Think of sub-agents as a manager delegating work and handoffs as a receptionist routing you to the right department.

This article covered the foundations, how `cagent`'s architecture works with sub-agents and handoffs, and how to get started with basic and multi-agent configurations. But we have barely scratched the surface of what `cagent` can do. In the next parts of the series, we will dive into using tools and MCP, RAG with `cagent`, evaluating and sharing agents, and, finally, a complex multi-agent workflow that brings together all the learnings.

