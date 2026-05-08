# Introduction to OpenClaw


I have been running and experimenting with [OpenClaw](https://openclaw.ai/) for a while. Unless you just returned from a trip to a cave, you will already know what OpenClaw is. The project originally emerged in late 2025 under the name Clawdbot, authored by the Austrian developer Peter Steinberger. It was renamed to **Moltbot** (January 2026) and then **OpenClaw** due to trademark considerations. 

I am starting a new series of articles for those who want to get started with OpenClaw but do not know where to start or how. This series will provide an introduction to OpenClaw, get you started with running OpenClaw, and incrementally build a multi-agent system that uses OpenClaw at its core. 

While traditional large language model (LLM) interfaces function as reactive, session-bound silos, OpenClaw operates as a persistent, local-first gateway that transforms reasoning models into proactive entities capable of system-level execution and multi-channel communication. The underlying philosophy of OpenClaw is rooted in the democratization of agentic AI. It addresses a critical tension in the modern AI landscape: the trade-off between the power of cloud-hosted models and the privacy of local data. OpenClaw resolves this by serving as a self-hosted gateway, where the "brain" (the LLM) can be either local or remote, while the "body" (the execution environment, memory, and credentials) remains entirely under the user's control.

## Architecture

The fundamental unit of the OpenClaw architecture is the Gateway, a long-lived background process typically running on Node.js or Bun.2 This Gateway serves as the centralized control plane, managing the intersection of messaging platforms, AI models, local toolsets, and persistent state. By operating as a continuous daemon, the Gateway ensures that the agent remains available to process incoming signals or execute scheduled tasks even when the user is not actively engaged.

{{< figure caption="Image Credit: Gemini" src="/images/openclaw_arch.png" width=450 >}}  {{< load-photoswipe >}}

The Gateway comprises five primary subsystems that handle the lifecycle of an agentic interaction. These subsystems are designed for high modularity, allowing the framework to remain lightweight while supporting massive extensibility.

- **Channel adapters**: Normalizes inbound communication from diverse platforms by translating protocol-specific payloads (e.g., WhatsApp, Telegram) into a unified internal format.
- **Session Manager**: Resolves sender identities and maintains conversation context by mapping unique peer identifiers to specific agent sessions and state directories.
- **Queue Manager**: Manages concurrency and serializes execution turns to prevent race conditions when multiple incoming messages are handled during tool execution.
- **Agent Runtime**: The reasoning engine and tool-invocation loop that assembles the prompt context and executes the "call model → execute tool" cycle.
- **Control Plane**: Provides an interface for configuration and external clients via a WebSocket API (default port 18789) for the CLI, web UI, and device nodes.

This lean architecture enables OpenClaw to run on constrained hardware, such as a Raspberry Pi. A defining conceptual pillar of OpenClaw is its "local-first" data model. Unlike cloud assistants that store history in proprietary databases, OpenClaw persists all relevant data to the host's filesystem, specifically under the `~/.openclaw` directory.

## Full turn workflow

The lifecycle of a single user request follows a deterministic "Dual-Loop" execution pattern. The outer loop manages session state, while the inner loop handles the iterative "Reason → Act" cycle.

{{< figure caption="Image Credit: Gemini" src="/images/openclaw_fullturn.png" width=450 >}}

As the scope of automation expands, a single monolithic agent often becomes inefficient due to context window limitations and reasoning pollution. OpenClaw addresses this through advanced orchestration patterns that allow for specialized division of labor.

## Multi-agent pattern

In complex environments, a single agent delegates tasks to specialized sub-agents. These sub-agents are ephemeral workers who prevent context pollution in the main conversation.

{{< figure caption="Image Credit: Gemini" src="/images/openclaw_multiagent.png" width=450 >}}

When using a multi-agent pattern, you will come across agents and sub-agents. 

- *Agents* are persistent personas with their own "soul" (SOUL.md), workspace, memory, and session history. They are the primary interface for users and maintain the long-term context of projects and preferences.
- *Sub-agents* are temporary, stateless workers spawned via the `sessions_spawn` tool to handle a specific, bounded task.

OpenClaw's primary user interface is not a standalone application but the existing messaging ecosystem. This choice is strategic, as it places the AI assistant in the same social context as human colleagues and friends, significantly reducing interaction friction. The Gateway acts as a multi-channel router, allowing a single agent or a team of agents to be accessible across dozens of platforms simultaneously. This routing architecture enables sophisticated use cases, such as an enterprise that uses a single WhatsApp number to provide general customer support while routing executive direct messages (DMs) to a highly privileged, private assistant. When enabled, the pairing mode will prompt unknown senders to provide a pairing code before processing any of their requests. 

OpenClaw supports a vast array of channels. By normalizing these disparate protocols through the Channel Adapter subsystem, OpenClaw allows developers to write a single automation script or skill that functions identically, whether triggered by a WhatsApp message or a Slack command.

## OpenClaw Skills

Conceptually, a "Skill" in OpenClaw is more than just a plugin; it is a packaged unit of procedural knowledge and tool access. Adhering to the [AgentSkills](https://agentskills.io) specification, a skill is defined as a directory containing an SKILL.md file, which uses YAML front matter to declare its requirements and Markdown to provide the agent with instructions for using the bundled tools. The declarative nature of the skill format is central to OpenClaw's ability to minimize token usage and improve reasoning. When the agent starts a turn, it scans the metadata of available skills to build a "capability index." It injects the full instructions for a skill into the prompt only when it determines the skill is relevant to the current task. This process is known as progressive disclosure. I have written about skills in a [couple of earlier articles](https://ravichaganti.com/categories/skills/).

On [ClawHub](https://clawhub.ai/), you can find a wide range of skills, from basic file management to complex integrations such as the *Gog* skill for Google Workspace and the *Github* skill for managing CI/CD pipelines. The [Skill Workshop plugin](https://docs.openclaw.ai/plugins/skill-workshop) of OpenClaw allows the agent to observe its own successful multi-step workflows and codify them into new skills. 

## OpenClaw Autonomy

The transition from a "chatbot" to an "autonomous agent" is primarily facilitated by OpenClaw's proactivity systems. These mechanisms allow the agent to break the cycle of human-triggered prompts and act based on internal schedules or external environmental changes.

- The ***Heartbeat*** is a recurring "turn" of the agent that occurs by default every 30 minutes.14 During a heartbeat, the Gateway injects the contents of a HEARTBEAT.md file into the agent's context. This file functions as a standing order or a checklist of tasks that the agent should perform without being asked.
- OpenClaw's ***Cron*** system provides precise, scheduled execution enabled by the croner library. 

### Identity Stack

OpenClaw agents don't have "built-in" personalities. Instead, identity is assembled from **Markdown files** that are injected into the LLM's system prompt at the start of every session. This is called the **bootstrap**.

```shell
~/.openclaw/agents/<agentId>/

├── SOUL.md      → WHO the agent IS (personality, tone, expertise)
├── IDENTITY.md    → WHAT the agent IS (name, avatar, "creature type")
├── AGENTS.md     → WHAT the agent DOES (rules, workflows, policies)
├── USER.md      → WHO it serves (your name, preferences, context)
├── MEMORY.md     → WHAT it REMEMBERS (long-term curated knowledge)
├── HEARTBEAT.md   → WHEN it acts proactively (schedule, triggers)
└── memory/
  └── YYYY-MM-DD.md → Daily activity logs
```

Every time a new session starts (or the agent "wakes up" from a heartbeat), OpenClaw:

1. **Reads** all identity files from the agent's workspace
2. **Assembles** them into a system prompt
3. **Injects** the system prompt into the LLM call
4. The LLM now "knows" its personality, rules, user context, and recent history

Because LLMs are stateless (each API call is independent), this bootstrap is what creates the *illusion* of a persistent, consistent personality.

## Personal assistant use cases

Here is what I have experimented with and am still building on this knowledge.

- **Morning Briefings**: An agent monitors RSS feeds, weather, calendar, and GitHub activity to deliver a concise, context-aware briefing at 6:30 AM every day.
- **Expense Management**: A photograph of a receipt is sent to the agent via WhatsApp; the agent automatically parses the data and logs it in a spreadsheet.
- **Smart Home Environment**: Proactive routines that dim lights, lock doors, and check security cameras based on the user's natural language standing orders.

## Summary

OpenClaw represents a fundamental architectural shift from AI as a service to AI as infrastructure. By providing a local-first, multi-channel gateway, it empowers users to move beyond simple chat interactions and into a world of autonomous, proactive coordination. This part is a quick overview of OpenClaw: its architecture and features. In the future parts of this series, we will start with deploying OpenClaw as a Docker container and onboarding the WhatsApp channel, setting up identity and personality, exploring tools and skills, using MCP servers and plugins, and finally building a multi-agent workflow. Stay tuned!

