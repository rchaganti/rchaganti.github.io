# Agent skills vs Model Context Protocol - [How] do you choose?


Anthropic [introduced Agent Skills](https://claude.com/blog/skills) in October 2025, just a year after they [introduced Model Context Protocol](https://www.anthropic.com/news/model-context-protocol) (MCP). Today, both Agent Skills and MCP are open standards. The fact that a single company produced two standards that seem to be competing has fueled heated debate on social media, Hacker News, and developer blogs. Some claim that MCP is dead, while others argue that the comparison itself is moot. The truth is more nuanced than that. You can build powerful agents with either or both. For anyone building enterprise-grade agent-powered systems, understanding where these standards genuinely overlap, where they serve fundamentally different purposes, and where each falls short is essential.

Let us start with a quick overview of each standard.

## Model Context Protocol (MCP)

Every AI application that wants to talk to an external service or access external data needs its own integration. This is an N x M integration problem. With MCP, this is reduced to N + M. You build one MCP server per external service, one MCP client per AI application, and they all interoperate through a universal JSON-RPC 2.0 protocol. Anthropic calls it "[USB-C for AI applications](https://modelcontextprotocol.io/docs/getting-started/intro)". 

The MCP architecture has three components. MCP hosts are AI applications such as VS Code, Claude Code, Goose, and ChatGPT. Each MCP host contains one or more [MCP Clients](https://modelcontextprotocol.io/docs/learn/client-concepts) that maintain a 1:1 connection to an MCP server. An [MCP server](https://modelcontextprotocol.io/docs/learn/server-concepts) exposes tools, resources, and prompts. These MCP servers can be run [locally via stdio transport or remotely via streamable HTTP](https://modelcontextprotocol.io/docs/learn/architecture#transport-layer). When a client connects to an MCP server, it calls `tools/list` to discover available tools. The LLM then decides when to call `tools/call` to invoke specific tools based on the tool descriptions loaded into its context window.

MCP saw extraordinary adoption since its announcement in November 2024. The [open specification](https://modelcontextprotocol.io/specification/2025-11-25) underwent multiple revisions, adding or improving security requirements and introducing new features. The [MCP registry](https://modelcontextprotocol.io/registry/about) is the official centralized metadata repository for publicly accessible MCP servers. The SDK availability for different [programming languages](https://modelcontextprotocol.io/docs/sdk) enabled developers to quickly adopt and implement MCP servers and clients. Every major AI company has come out in support of MCP. OpenAI integrated MCP into ChatGPT and the Agents SDK. Google confirmed support in Gemini, ADK, and Cloud databases. Microsoft built it into VS Code, Copilot, and Microsoft Agent Framework. AWS embedded it in Bedrock and AgentCore. You throw a stone, and it literally falls on an MCP server in a public MCP registry. There is one for almost every popular service on the public internet.

## Agent Skills

Anthropic introduced Agent Skills in October 2025 to give Claude repeatable, domain-specific expertise. In December 2025, the company released the Agent Skills specification as [an open standard](https://agentskills.io). 

At its core, a Skill is a directory containing a SKILL.md file with YAML frontmatter, optional scripts, templates, reference documents, and other assets such as images. The SKILL.md contains the name, description, and detailed instructions that teach an agent how to perform a specific task: a company's code review checklist, a financial modeling methodology, a brand guidelines enforcement workflow, or a legal contract review procedure. The standard defines packaging and metadata but leaves execution semantics to each platform. Skills run in whatever execution environment the host agent provides. The agent reads the SKILL.md like a human reading a procedure manual, then follows the instructions using whatever tools it has available (bash, file system, code execution). 

At the heart of Skills is the principle of progressive disclosure. Instead of loading all skill content into the context window upfront, the system works in three phases. In the discovery phase, only the skill name and description load into the system prompt. In the activation phase, when a user's request matches a skill's domain, the full SKILL.md instructions load into context. Finally, when in the execution phase, the agent reads additional files (scripts, references, templates) from the skill directory only as needed, using file system operations rather than context window space. This means the amount of knowledge bundled into a skill is effectively unbounded, because the agent navigates it like a reference manual rather than consuming it all at once.

Many agent platforms, including Claude Code, OpenAI Codex, Cursor, Gemini CLI, VS Code, GitHub Copilot, Amp, Goose, OpenCode, and Letta, have adopted the Agent Skills standard. Vercel introduced a [Skills ecosystem platform](https://skills.sh/).

## MCP vs Skills

To decide whether MCP vs skills or both, we need to first understand what each cannot do.

MCP provides an agent or an AI application with a set of tools to work with external services and data. But it cannot teach the agent the procedural knowledge. Consider an example. You can give your agent `git` tools to work with your project repository. This does not give the agent knowledge of your organization's branching strategy, code review checklist, pull request templates, or issue templates. This is the procedural knowledge buried in your organization's document libraries or in your team as tribal knowledge. This procedural knowledge is what Skills provide.

Giving an agent Skills does not automagically give it the ability to perform actions. It is like giving someone a recipe for baking a cake without any utensils. They will know the procedural knowledge to bake a cake, but won't actually be able to bake one. Agent skills cannot physically perform any actions. Skills are inert knowledge that depends on the agent having *other* capabilities to actually take action. MCP is the *other* capability that Skills need.

This narrative highlights the complementary relationship between Skills and MCP. To decide whether to leverage this relationship or choose between them, we need to examine a few key tenets.

### Security

This is the most important tenet for enterprise adoption. 

Skills are text files with options scripts that live (and execute) in-process as the agent's execution environment. There is no process isolation or a new network boundary. This poses a risk of prompt injection through malicious skill content. A malicious skill could instruct an agent to execute some arbitrary code, read sensitive files, or exfiltrate data through the agent's responses. The skills specification doesn't prescribe how credentials should be handled, how skills should be isolated from one another, or how code execution should be sandboxed. This design choice makes the spec flexible but delegates security decisions entirely to implementers. Different implementations can make vastly different security choices. 

> Anthropic's [documentation cautions](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#security-considerations) against using skills from untrusted sources without a thorough audit of their contents. You must treat Skills installation with the same rigor as installing software on production systems.

Skills do not expand an agent's attack surface beyond what it already has.  If your agent already has bash access and can read files, a Skill doesn't add new capabilities. Instead, it just provides instructions for using existing ones. 

MCP, on the other hand, runs as a separate process with its own runtime, filesystem access, and credential scope. This architectural separation means each server can be sandboxed, containerized, or run under a dedicated OS user, receiving only the secrets and permissions needed for its specific integration. This is a fundamentally stronger isolation model than Agent Skills provides. This stronger isolation does not mean that MCP is more secure. authzed.com has documented [a timeline of MCP security breaches](https://authzed.com/blog/timeline-mcp-breaches). The MCP spec recommends human-in-the-loop oversight using SHOULD rather than MUST, making it advisory rather than mandatory. [Gartner has explicitly](https://www.gartner.com/en/documents/7189330) warned that "MCP introduces new security, stability, and governance risks."

Agent Skills are optimized for rapid capability expansion, allowing you to control all content. MCP is optimized for production deployments with strict security requirements around external service access.

### Authentication and Authorization

As Skills are in progress, they inherit whatever auth context the agent already has. If the agent has access to environment variables with API keys, or if it's running in a context with OAuth tokens already available, Skills can reference those credentials through the tools the agent invokes. There's no auth protocol to implement. Skills are inert knowledge, and any auth-dependent actions happen through whatever tools the agent has access to (which might themselves be MCP tools). Enterprises need to handle Skills governance through platform admin controls. Administrators can centrally provision which Skills are available, control access, and monitor usage. Claude and OpenAI's Codex offer such controls. There's no OAuth flow to manage, no token exchange to implement, no per-skill authorization boundary. This is both a strength and a limitation.

MCP's authentication story is anything but perfect. The first version of the MCP specification shipped without mandatory authentication. This led to major security exposures. The next version mandated OAuth 2.1 with PKCE and mandated every MCP server to implement a full OAuth authorization server, which is an unrealistic requirement for enterprises. Later versions removed the need for an authorization server, classified MCP servers as OAuth resource servers, mandated protected resource metadata and resource indicators, and replaced Dynamic Client Registration with Client ID Metadata Documents. Each MCP server connection requires its own OAuth flow, which is operationally burdensome at scale. The community argues that this is still unnecessary complexity for enterprise environments. 

For enterprise IT operations teams, the auth story creates a stark asymmetry: Skills are trivial to govern through existing IT controls (file access, git permissions, admin provisioning), while MCP requires dedicated auth infrastructure (OAuth servers, token management, gateway proxying) that adds significant operational complexity. This is precisely why the MCP Gateway market has emerged so rapidly.

### Context window and token cost

Agent Skills uses progressive disclosure to minimize context impact. As described above, only skill metadata loads at startup (50–100 tokens per skill), full instructions load only when activated (typically under 5,000 tokens), and additional reference files are accessed through the filesystem rather than the context window. Even with a large library of 100 skills, the total always-present context overhead is roughly 5,000–10,000 tokens.

MCP's context window impact is its most documented operational problem. MCP clients typically load all tool definitions from all connected servers upfront via the `tools/list` call. Each tool definition might consume 50–1,000+ tokens depending on schema complexity. Anthropic has published mitigation strategies: a meta-tool pattern that uses two gateway tools (one for discovery, one for execution) to achieve 85–95% token reduction, and a code-execution pattern in which the agent writes code to interact with MCP servers in a sandbox, achieving 80–99% token reduction. These are architectural workarounds that add complexity and are not the default behavior of MCP clients.

Agent Skills' progressive disclosure directly addresses MCP's biggest practical pain point. Skills represent Anthropic learning from MCP's deployment challenges and building a knowledge-loading system that treats context budget as a first-class design constraint. Skills have a low token-cost profile compared with the linear scaling of token cost with the number of connected MCP servers. For enterprise deployments with dozens of integrations, the cost differential is substantial. An IT operations platform that connects to 15 external services via MCP could easily consume 50,000–100,000 tokens per session for tool definitions alone. The same operational knowledge encoded as Skills would cost a fraction of what it would in context usage. Skills alone wouldn't provide external connectivity. You'd still need *something* (MCP, direct API calls, or CLI tools) to actually reach the external services.

### Ease of deployment

Skills are lightweight folders that you can version-control and deploy with well-known tools in the IT operations space. The barrier to entry is as low as writing a Markdown file. The maintenance burden is near-zero compared to running software.

Building an MCP server means implementing the JSON-RPC 2.0 protocol, defining tool schemas with JSON Schema, handling transport (stdio or Streamable HTTP), managing error handling, and implementing OAuth 2.1 authentication. SDKs for many programming languages, and building a simple MCP server with an SDK takes minutes. But production-grade servers with proper error handling, authentication, rate limiting, and observability require substantial engineering investment.

The operational cost of developing, deploying, and maintaining an MCP server is significantly higher than writing a text file with instructions. 

### Adoption blockers

The Agent Skills specification is intentionally minimal, defining only the structure and format of a Skill. This leaves the execution semantics, progressive disclosure mechanisms, and other capabilities to the agent's runtime. This leads to different implementations across different platforms. This forces enterprises to evaluate each platform's implementation independently. Unlike MCP, there is no centralized official registry for the discovery and distribution of Skills. Skill effectiveness varies by model. There is no standard testing framework, no CI/CD integration for skill validation, and no industry-standard metrics for skill reliability.

MCP's security track record isn't particularly encouraging for enterprise adoption. The authentication complexity and the emergence of MCP gateways as essential infrastructure reflect the gap between the spec's auth design and enterprise operational reality. For enterprise adoption, the ability to observe and debug is most critical. The MCP specification includes no standardized distributed tracing, correlation IDs, cost attribution, or structured logging. Debugging MCP tool failures requires understanding the JSON-RPC protocol, inspecting transport-level messages, and correlating across process boundaries. Gateway vendors are filling this gap, but observability is not built into the protocol.

## When to use each

Use Agent Skills when you need to encode organizational expertise, workflows, and best practices into a reusable, portable format. Skills are the right choice for procedural consistency — your team's code review process, your company's financial modeling approach, your legal department's contract review checklist. They're also appropriate when you want to share domain knowledge across multiple agents and platforms without vendor lock-in, and when token efficiency is a priority.

Use MCP when agents need to interact with external systems such as databases, APIs, SaaS tools, file systems, and cloud services. When the task requires reading or writing data to or from systems outside the agent's native environment, MCP provides a standardized connectivity layer. MCP is also the right choice when you want process-level isolation between the agent and external tools, and when you want to share tool capabilities across multiple AI platforms (one MCP server serves all MCP clients).

Use both together when agents need not only access to external systems but also access *in accordance with your organization's specific methods*. This is the most powerful pattern: MCP connections for tool access combined with Skills that teach the agent how to use those tools effectively in your context. An MCP server grants Claude access to your Jira instance, and a Skill teaches Claude your team's sprint-planning methodology, backlog grooming criteria, and ticket template conventions.

Consider Skills + direct CLI/API calls (without MCP) when you're working at an individual developer scale. The overhead of configuring an MCP server outweighs the benefit, and a Skill documenting how to use curl or a CLI tool directly is more practical. This is the workflow driving much of the "Skills replace MCP" sentiment online, and it's a valid architectural choice for individual developers or small teams where MCP's universality isn't needed.

## Conclusion

The Agent Skills vs MCP debate is not about which standard wins. It is about recognizing that Anthropic deliberately built two standards because it identified two distinct, unsolved problems in the agentic stack, and that solving one does not eliminate the other. Skills deliver token efficiency, ease of authoring, portability of organizational knowledge, and minimal operational complexity, but they cannot independently reach the outside world. MCP delivers universal external connectivity, process isolation, and ecosystem breadth, but carries significant overhead in security management, authentication complexity, context window consumption, and operational infrastructure.

Anthropic built Skills *after* MCP, and Skills' progressive disclosure design directly addresses MCP's biggest practical weakness (context window bloat). The two standards don't compete. They represent Anthropic learning from its first standard and the construction of a complementary layer to address a problem that MCP doesn't solve.

For enterprise IT operations, the actionable takeaway is: invest in Skills to encode your operational playbooks, runbooks, and institutional expertise into portable, token-efficient packages. Deploy MCP selectively for external integrations that genuinely require standardized connectivity, and invest in MCP gateway infrastructure (auth proxying, observability, rate limiting) before going to production. Treat context window budget as a first-class architectural constraint. And use both together where the combination makes workflows both connected *and* intelligent.

I love how Block's [goose team concluded](https://block.github.io/goose/blog/2025/12/22/agent-skills-vs-mcp/): "*The existence of both is a good sign. It means the ecosystem is maturing. We're no longer arguing about whether agents should have tools or instructions. We're building systems that assume you need both. That's progress, not replacement.*"

What is your take on this?

In the next article, I will share my thoughts on context graphs and how Skills and MCP shape and populate the graph with reality.
