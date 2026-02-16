# Google ADK - OpenAPI tools, agents-as-tools, authentication, and long-running operations


Imagine this scenario. Your company has dozens of internal REST APIs, each with an OpenAPI specification already published. You need an agent that can query the inventory service, place orders through the fulfillment API, and check shipment tracking, all without writing individual tool functions for every single endpoint. Now layer on some more complexity. Some of those APIs require OAuth2 tokens. One task, say generating a compliance report, takes ten minutes to complete. And you want a coordinator agent that can delegate research tasks to a specialized sub-agent without losing control of the conversation.

These four problems, connecting to REST APIs at scale, composing agents hierarchically, authenticating with protected services, and handling slow operations gracefully, are exactly what this article covers. Each is a distinct Google ADK capability, but together they form the toolkit you need to build production-grade agents that interact with the real world. 

Let us start with [OpenAPI tools](https://google.github.io/adk-docs/tools-custom/openapi-tools/).

## OpenAPI tools

When your organization already has REST APIs documented with OpenAPI specifications, writing individual `FunctionTool` wrappers for each endpoint is tedious and error-prone. The `OpenAPIToolset` class solves this by reading an OpenAPI v3.x specification and automatically generating callable tools for every operation it discovers. You hand ADK a spec file, and it returns a set of tools your agent can use immediately.

### The two key classes

The [OpenAPI](https://swagger.io/specification/) integration revolves around two classes working together.

`OpenAPIToolset` is the entry point. You initialize it with your OpenAPI specification, provided as a JSON string, a YAML string, or a Python dictionary, and it handles parsing, reference resolution, and tool generation. Think of it as the factory that reads the blueprint and produces the individual tools.

`RestApiTool` is what the factory produces. Each API operation defined in your spec (every `GET`, `POST`, `PUT`, `DELETE` path) becomes one `RestApiTool` instance. This tool can construct the correct HTTP request, fill in path parameters, attach query strings and headers, serialize the request body, and return the response, all based on the information in the spec.

### How the toolset generates tools

When you create an `OpenAPIToolset`, several things happen internally:

1. The spec is parsed, and all internal `$ref` references are resolved to produce a complete API description.
2. Every valid operation within the `paths` section is identified.
3. For each operation, a `RestApiTool` is created with a name derived from the `operationId` field (converted to `snake_case`, capped at 60 characters). If no `operationId` exists, the name is generated from the HTTP method and path.
4. The tool's description is pulled from the `summary` or `description` field in the spec, which helps the LLM understand when to use it.
5. Each `RestApiTool` dynamically creates a `FunctionDeclaration` that maps the operation's parameters and request body into arguments the LLM can provide.

### Basic usage

Here is how you would connect an agent to a task management API using its OpenAPI spec.

> This example uses a mock OpenAPI server created in Python using FastAPI. The code for this server is at [A mock OpenAPI server](https://gist.github.com/rchaganti/8449850eb83bc7e7834dded9ff275395)

```python
from google.adk.tools.openapi_tool.openapi_spec_parser.openapi_toolset import OpenAPIToolset
from google.adk.agents import LlmAgent
import asyncio
import requests
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# Fetch the spec from the running server
response = requests.get("http://localhost:3000/openapi.json")
response.raise_for_status()
spec_content = response.text

# Create the toolset
task_toolset = OpenAPIToolset(
    spec_str=spec_content,
    spec_str_type="json"
)

# Build the agent with the generated tools
task_agent = LlmAgent(
    name="TaskManager",
    model="gemini-2.0-flash",
    instruction="""You manage tasks through the Task API. 
You can list tasks, create new ones, update their status, and delete completed ones.
Always confirm with the user before deleting a task.""",
    tools=[task_toolset]
)
```

The `task_toolset` automatically generates tools like `list_tasks`, `create_task`, `update_task`, and `delete_task` based on the operations defined in the spec. The agent can call any of them as needed.

You can also provide the spec as a YAML string or a Python dictionary. When using YAML, set `spec_str_type="yaml"`. When passing a dictionary, use the `spec_dict` parameter instead of `spec_str`.

```python
# From YAML
toolset_from_yaml = OpenAPIToolset(
    spec_str=yaml_string,
    spec_str_type="yaml"
)

# From a dictionary
toolset_from_dict = OpenAPIToolset(
    spec_dict=spec_dictionary
)
```

Let us add the execution logic to interact with this agent.

```python
async def main():
    session_service = InMemorySessionService()
    runner = Runner(
        agent=root_agent,
        app_name="task_app",
        session_service=session_service
    )
    
    session = await session_service.create_session(
        app_name="task_app",
        user_id="user1"
    )
    
    msg = types.Content(
        parts=[types.Part(text="list all tasks in progress.")],
        role="user"
    )
    
    async for event in runner.run_async(
        user_id="user1",
        session_id=session.id,
        new_message=msg
    ):
        if event.get_function_calls():
            call = event.get_function_calls()[0]
            print(f"Tool called: {call.name} with args: {call.args}")
        if event.is_final_response() and event.content and event.content.parts:
            print(f"Agent: {event.content.parts[0].text}")

if __name__ == "__main__":
    asyncio.run(main())
```

When you run this, you will see the agent calling the `list_tasks_api_tasks_get` tool with the argument `{'status': 'in-progress'}`.  

```shell
> python.exe .\openapi\agent.py

Tool called: list_tasks_api_tasks_get with args: {'status': 'in-progress'}

Agent: Here are all the tasks in progress: Review pull request, Deploy to staging, and upload new podcast.
```

### Working with individual RestApiTool instances

Sometimes you need finer control over specific tools. You can retrieve individual tools by name using `get_tool()` or get all of them with `get_tools()`.

```python
# Get a specific tool
get_task_tool = task_toolset.get_tool("list_tasks_api_tasks_get")

# Get all tools as a list
all_tools = task_toolset.get_tools()

# Add custom headers to a specific tool
get_task_tool.set_default_headers({
    "X-Request-Source": "adk-agent",
    "X-Trace-Id": "abc123"
})
```

This is particularly useful when you want to apply tool-specific configurations, such as custom headers or different authentication credentials, to individual endpoints.

## Agents-as-tools (AgentTool)

In the [MCP tools article](/blog/google-adk-mcp-tools/), we saw how to extend an agent's capabilities by connecting it to external tool servers. But what if the capability you need is not a simple function but an entire reasoning process that, in turn, requires an LLM? What if you need a "research agent" that can search, synthesize, and summarize information, and you want a parent agent to be able to call this research agent the same way it would call any other tool?

This is where `AgentTool` comes in. It wraps an entire agent, with its own instruction, model, and tools, and exposes it as a callable tool for a parent agent. The parent agent sends a request to the wrapped agent, which processes it using its own LLM and tools, and the result flows back to the parent as a standard tool response.

### How AgentTool differs from sub-agent transfer

ADK provides two ways for agents to work together, and understanding the difference is critical for designing the right architecture.

With **sub-agent transfer** (using `sub_agents`), the parent agent hands off control of the conversation entirely. The sub-agent takes over, directly responds to the user, and handles all follow-up questions. The parent steps out of the loop. This is like a customer service representative transferring your call to a specialist. You are now speaking with the specialist, not the original representative.

With **AgentTool**, the parent agent remains in control. It formulates a specific question, sends it to the tool agent, receives the result, and then decides what to do next, including how to present the answer to the user. The tool agent never talks to the user directly. This is like a manager asking a team member to research something and report back. The manager still owns the conversation with the client.

Here is a summary of the key differences:

| Aspect                    | Sub-Agent Transfer               | AgentTool                             |
| ------------------------- | -------------------------------- | ------------------------------------- |
| Who talks to the user     | The sub-agent                    | The parent agent                      |
| Who handles follow-ups    | The sub-agent                    | The parent agent                      |
| Does control return?      | No                               | Yes                                   |
| What is sent to the child | Full conversation history        | A summarized question from the parent |
| Typical LLM calls         | 2 (parent decides + sub answers) | 3+ (parent + child + parent again)    |
| Session context           | Shared                           | Separate (encapsulated)               |

### Using AgentTool

To use an agent as a tool, wrap it with the `AgentTool` class and add it to the parent agent's `tools` list.

```python
from google.adk.agents import LlmAgent
from google.adk.tools.agent_tool import AgentTool

# Define a specialist agent
code_reviewer = LlmAgent(
    name="CodeReviewer",
    model="gemini-2.0-flash",
    description="Reviews code snippets for bugs, style issues, and security vulnerabilities.",
    instruction="""You are an expert code reviewer. 
When given code, analyze it for:
1. Logical bugs and edge cases
2. Style and readability issues
3. Security vulnerabilities
Provide a structured review with severity ratings."""
)

# Define the parent agent that uses the specialist as a tool
dev_assistant = LlmAgent(
    name="DevAssistant",
    model="gemini-2.0-flash",
    instruction="""You are a software development assistant.
When a user shares code and wants a review, use the CodeReviewer tool to analyze it.
Then present the findings to the user in a friendly, actionable format.
For general coding questions, answer directly without using the tool.""",
    tools=[AgentTool(agent=code_reviewer)]
)
```

When the user asks the `DevAssistant` to review code, the LLM invokes the `CodeReviewer` tool. ADK runs the `CodeReviewer` agent in its own execution context, collects its response, and returns it to the `DevAssistant` as a tool result. The `DevAssistant` then summarizes and presents the findings to the user.

### The skip_summarization option

By default, when the tool agent returns its result, the parent agent's LLM makes an additional call to summarize or interpret that result before presenting it to the user. This is useful when the tool agent's output is verbose or technical and needs to be adapted for the user.

However, if the tool agent already produces clean, user-ready output, this extra LLM call is wasteful. Setting `skip_summarization=True` tells ADK to bypass the summarization step and pass the tool agent's output directly to the parent.

```python
# Skip summarization when the tool agent's output is already well-formatted
formatted_reporter = AgentTool(
    agent=code_reviewer,
    skip_summarization=True
)
```

### Building a hierarchical agent system

`AgentTool` really shines when you build multi-level hierarchies. Consider a research coordinator who delegates to specialized agents.

```python
from google.adk.agents import LlmAgent
from google.adk.tools.agent_tool import AgentTool

# Level 1: Specialist agents with their own tools
web_researcher = LlmAgent(
    name="WebResearcher",
    model="gemini-2.0-flash",
    description="Searches the web for current information on a topic.",
    instruction="Search for the requested information and return factual findings with sources."
)

data_analyst = LlmAgent(
    name="DataAnalyst",
    model="gemini-2.0-flash",
    description="Analyzes numerical data and produces statistical summaries.",
    instruction="Analyze the provided data. Return key metrics, trends, and anomalies."
)

# Level 2: Coordinator that uses specialists as tools
research_coordinator = LlmAgent(
    name="ResearchCoordinator",
    model="gemini-2.0-flash",
    description="Coordinates research tasks by delegating to specialists.",
    instruction="""You coordinate research efforts.
For questions requiring current information, use the WebResearcher tool.
For questions requiring data analysis, use the DataAnalyst tool.
Synthesize results from multiple tools when needed.""",
    tools=[
        AgentTool(agent=web_researcher),
        AgentTool(agent=data_analyst)
    ]
)

# Level 3: Top-level agent that delegates entire research projects
project_manager = LlmAgent(
    name="ProjectManager",
    model="gemini-2.0-flash",
    instruction="""You manage projects and write reports.
When you need research done on any topic, use the ResearchCoordinator tool.
Focus on synthesizing the research into clear, actionable recommendations.""",
    tools=[AgentTool(agent=research_coordinator)]
)
```

The user interacts with the `ProjectManager`. When it needs research, it calls the `ResearchCoordinator` as a tool, which in turn calls `WebResearcher` or `DataAnalyst` as tools. Results flow back up the hierarchy, with each level adding its own interpretation and context.

## Authenticated tools

Many real-world APIs require authentication. Your agent might need to read a user's calendar events (requiring OAuth2 consent), query an internal service protected by API keys, or access enterprise resources behind OpenID Connect. ADK provides a comprehensive authentication system that integrates with `OpenAPIToolset`, `RestApiTool`, and custom `FunctionTool` implementations.

### Authentication building blocks

ADK's auth system is built on two core concepts.

**AuthScheme** defines *how* an API expects credentials. Is it an API key in a header? An OAuth2 bearer token? A service account? ADK supports the same authentication schemes as OpenAPI 3.0: `APIKey`, `HTTPBearer`, `OAuth2`, and `OpenIdConnectWithConfig`.

**AuthCredential** stores the initial information needed to start the authentication process. This includes your application's OAuth client ID and secret, an API key, or a service account JSON key. It also includes an `auth_type` field that specifies the credential type.

The supported credential types are:

| Type                | When to use                                            |
| ------------------- | ------------------------------------------------------ |
| `API_KEY`           | Simple key-based auth, no exchange needed              |
| `HTTP`              | Pre-obtained bearer tokens                             |
| `OAUTH2`            | Standard OAuth2 flows requiring user consent           |
| `OPEN_ID_CONNECT`   | Enterprise OIDC providers like Okta or Auth0           |
| `SERVICE_ACCOUNT`   | Google Cloud service accounts for server-to-server auth |

### API key authentication

The simplest form of authentication is an API key. You can use the `token_to_scheme_credential` helper to create the required objects.

```python
from google.adk.tools.openapi_tool.auth.auth_helpers import token_to_scheme_credential
from google.adk.tools.openapi_tool.openapi_spec_parser.openapi_toolset import OpenAPIToolset

# Create auth objects for an API key passed as a query parameter
auth_scheme, auth_credential = token_to_scheme_credential(
    "apikey",      # scheme type
    "query",       # where to send it (query, header, cookie)
    "api_key",     # parameter name
    "sk-abc123"   # the actual key value
)

analytics_toolset = OpenAPIToolset(
    spec_str=analytics_api_spec,
    spec_str_type="json",
    auth_scheme=auth_scheme,
    auth_credential=auth_credential
)
```

The `auth_scheme` and `auth_credential` are applied to every `RestApiTool` generated by the toolset. Each HTTP request made by these tools will automatically include the API key.

### OAuth2 authentication

OAuth2 is more complex because it requires user interaction. The user must log in and grant your application permission to access their data. ADK handles this through an interactive flow involving your agent and the client application.

Here is how you configure an `OpenAPIToolset` for OAuth2.

```python
from google.adk.tools.openapi_tool.openapi_spec_parser.openapi_toolset import OpenAPIToolset
from google.adk.auth import AuthCredential, AuthCredentialTypes, OAuth2Auth
from fastapi.openapi.models import OAuth2, OAuthFlows, OAuthFlowAuthorizationCode

auth_scheme = OAuth2(
    flows=OAuthFlows(
        authorizationCode=OAuthFlowAuthorizationCode(
            authorizationUrl="https://accounts.google.com/o/oauth2/auth",
            tokenUrl="https://oauth2.googleapis.com/token",
            scopes={
                "https://www.googleapis.com/auth/calendar.readonly": "Read calendar events"
            },
        )
    )
)

auth_credential = AuthCredential(
    auth_type=AuthCredentialTypes.OAUTH2,
    oauth2=OAuth2Auth(
        client_id="YOUR_CLIENT_ID",
        client_secret="YOUR_CLIENT_SECRET"
    )
)

calendar_toolset = OpenAPIToolset(
    spec_str=calendar_api_spec,
    spec_str_type="yaml",
    auth_scheme=auth_scheme,
    auth_credential=auth_credential
)
```

### The interactive OAuth2 flow

When an agent attempts to use an OAuth2-protected tool and no valid token is available, ADK triggers an interactive authentication flow. Here is what happens step by step.

**Step 1: The agent yields an auth request.** Instead of a normal tool response, the runner emits a special event containing a function call named `adk_request_credential`. Your client application must detect this event.

```python
events = runner.run_async(
    session_id=session.id, user_id="user1", new_message=user_query
)

auth_function_call_id = None
auth_config = None

async for event in events:
    if event.content and event.content.parts:
        for part in event.content.parts:
            if (part.function_call 
                and part.function_call.name == "adk_request_credential"
                and event.long_running_tool_ids
                and part.function_call.id in event.long_running_tool_ids):
                auth_function_call_id = part.function_call.id
                auth_config = AuthConfig.model_validate(
                    part.function_call.args.get("auth_config")
                )
                break
```

**Step 2: Redirect the user to the authorization URL.** Extract the `auth_uri` from the `auth_config` and append your application's `redirect_uri`.

```python
base_auth_uri = auth_config.exchanged_auth_credential.oauth2.auth_uri
redirect_uri = "http://localhost:8000/callback"
full_auth_url = f"{base_auth_uri}&redirect_uri={redirect_uri}"

# In a web app: redirect the user to full_auth_url
# In a CLI: print the URL and ask the user to visit it
print(f"Please visit: {full_auth_url}")
```

**Step 3: Capture the callback.** After the user logs in and grants permission, the OAuth provider redirects them to your `redirect_uri` with an authorization code in the URL. Your application captures this full callback URL.

**Step 4: Send the auth response back to ADK.** Update the `auth_config` with the callback URL and send it back to the runner as a `FunctionResponse`.

```python
# Update auth_config with the callback details
auth_config.exchanged_auth_credential.oauth2.auth_response_uri = callback_url
auth_config.exchanged_auth_credential.oauth2.redirect_uri = redirect_uri

# Build the response message
auth_response = types.Content(
    role="user",
    parts=[
        types.Part(
            function_response=types.FunctionResponse(
                id=auth_function_call_id,
                name="adk_request_credential",
                response=auth_config.model_dump()
            )
        )
    ]
)

# Resume the agent with the auth response
async for event in runner.run_async(
    session_id=session.id,
    user_id="user1",
    new_message=auth_response
):
    if event.is_final_response() and event.content:
        print(event.content.parts[0].text)
```

**Step 5: ADK completes the flow.** ADK exchanges the authorization code for tokens, stores them, and retries the original tool call, this time with a valid access token. The agent gets the real API response and generates its final answer.

### Building custom authenticated tools

When building your own `FunctionTool` that requires OAuth2, implement the authentication logic within the tool function using `ToolContext`. The pattern follows three phases: check for cached credentials, check for an auth response from a previous redirect, or initiate a new auth request.

```python
from google.adk.tools import FunctionTool, ToolContext
from google.adk.auth import AuthConfig, AuthCredential, AuthCredentialTypes, OAuth2Auth
from google.adk.auth.auth_schemes import OpenIdConnectWithConfig

# Define the auth configuration
auth_scheme = OpenIdConnectWithConfig(
    authorization_endpoint="https://your-idp.com/authorize",
    token_endpoint="https://your-idp.com/token",
    scopes=["openid", "profile", "email"],
)

auth_credential = AuthCredential(
    auth_type=AuthCredentialTypes.OPEN_ID_CONNECT,
    oauth2=OAuth2Auth(
        client_id="YOUR_CLIENT_ID",
        client_secret="YOUR_CLIENT_SECRET",
    ),
)

def fetch_user_profile(tool_context: ToolContext) -> dict:
    """Fetches the authenticated user's profile from the identity provider."""
    
    # Phase 1: Check for cached credentials
    cached_token = tool_context.state.get("user_profile_token")
    if cached_token:
        # Use cached token to make API call
        return call_profile_api(cached_token)
    
    # Phase 2: Check if the client just completed the OAuth flow
    exchanged = tool_context.get_auth_response(
        AuthConfig(
            auth_scheme=auth_scheme,
            raw_auth_credential=auth_credential,
        )
    )
    
    if exchanged:
        # ADK already exchanged the code for tokens
        access_token = exchanged.oauth2.access_token
        # Cache the token for future calls
        tool_context.state["user_profile_token"] = access_token
        return call_profile_api(access_token)
    
    # Phase 3: No credentials at all — initiate the auth flow
    tool_context.request_credential(
        AuthConfig(
            auth_scheme=auth_scheme,
            raw_auth_credential=auth_credential,
        )
    )
    return {"status": "pending", "message": "Waiting for user to authenticate."}

my_auth_tool = FunctionTool(func=fetch_user_profile)
```

The three-phase pattern ensures your tool works correctly regardless of where it is in the authentication lifecycle. On the first call, the flow begins. After the user authenticates, it receives the tokens. On subsequent calls within the same session, it reuses the cached token.

### Security considerations for token storage

Storing tokens in session state works well for `InMemorySessionService` during development, since the data is transient. For persistent session backends in production, consider encrypting token data before storing it. For the most sensitive environments, use a dedicated secret manager, such as Google Cloud Secret Manager, to store refresh tokens, and store only short-lived access tokens in session state.

## Long-running function tools

Standard tool functions are synchronous: the agent calls the function, the function executes, and the result comes back in the same event loop iteration. But what about operations that take minutes or hours? Generating a compliance report, processing a large dataset, or waiting for a human to approve a request. None of these can block the agent's event loop.

`LongRunningFunctionTool` addresses this by splitting a tool invocation into two phases: initiation and completion. The tool function starts the operation and returns an initial status. ADK pauses the agent run. The client application monitors the external process and, when it receives an update, sends the result back to the agent. The agent then resumes with the new information.

### How it differs from regular tools

With a regular `FunctionTool`, the sequence is: agent calls → function executes → result returns → agent continues. The entire cycle happens within a single agent run.

With a `LongRunningFunctionTool`, the sequence is:

1. **First agent run:** Agent calls the tool → function starts the operation and returns an initial status (like a ticket ID or "pending") → ADK pauses the run.
2. **Client waits:** The client application monitors the external operation outside the agent runtime.
3. **Second agent run:** Client sends the final (or intermediate) result back → agent resumes and generates a response.

This is fundamentally about decoupling *starting* a task from *completing* it.

### Creating a long-running tool

You define a regular Python function and wrap it with `LongRunningFunctionTool` instead of `FunctionTool`.

```python
from google.adk.agents import LlmAgent
from google.adk.tools import LongRunningFunctionTool, FunctionTool

def request_expense_approval(
    description: str, amount: float, category: str
) -> dict:
    """Submits an expense report for manager approval."""
    ticket_id = create_approval_ticket(description, amount, category)
    return {
        "status": "pending_approval",
        "ticket_id": ticket_id,
        "message": f"Expense report for ${amount:.2f} submitted. Awaiting manager review."
    }

def check_policy_compliance(
    category: str, amount: float
) -> dict:
    """Checks if an expense is within company policy limits."""
    limits = {"travel": 5000, "equipment": 2000, "training": 1500}
    limit = limits.get(category, 500)
    return {
        "compliant": amount <= limit,
        "limit": limit,
        "category": category
    }

expense_agent = LlmAgent(
    name="ExpenseAssistant",
    model="gemini-2.0-flash",
    instruction="""You help employees submit expense reports.
1. First check if the expense is within policy using check_policy_compliance.
2. If compliant, submit it for approval using request_expense_approval.
3. Once the manager responds, inform the employee of the decision.""",
    tools=[
        FunctionTool(func=check_policy_compliance),
        LongRunningFunctionTool(func=request_expense_approval),
    ]
)
```

The `check_policy_compliance` tool runs synchronously. It checks the policy and returns immediately. The `request_expense_approval` tool, wrapped in `LongRunningFunctionTool`, creates a ticket and returns a pending status. The agent pauses at this point.

### Handling the client-side flow

After the agent run pauses, the client application is responsible for monitoring the external process and sending results back. Here is the full client-side flow.

```python
import asyncio
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

async def run_expense_workflow():
    session_service = InMemorySessionService()
    runner = Runner(
        agent=expense_agent,
        app_name="expense_app",
        session_service=session_service
    )
    
    session = await session_service.create_session(
        app_name="expense_app", user_id="user1"
    )
    
    # Step 1: User submits an expense
    msg = types.Content(
        parts=[types.Part(text="I need to submit a $450 training expense for the Python conference.")],
        role="user"
    )
    
    pending_response = None
    async for event in runner.run_async(
        user_id="user1", session_id=session.id, new_message=msg
    ):
        # Detect the long-running tool's pending response
        if event.long_running_tool_ids and event.content and event.content.parts:
            for part in event.content.parts:
                if (part.function_response 
                    and part.function_response.id in event.long_running_tool_ids):
                    pending_response = part.function_response
                    print(f"Tool paused: {pending_response.response}")
        
        if event.is_final_response() and event.content and event.content.parts:
            print(f"Agent: {event.content.parts[0].text}")
    
    if not pending_response:
        return
    
    # Step 2: Simulate waiting for manager approval
    print("Waiting for manager decision...")
    await asyncio.sleep(2)  # In production, poll an external system
    
    # Step 3: Send the approval result back
    approval_result = pending_response.model_copy(deep=True)
    approval_result.response = {
        "status": "approved",
        "approved_by": "Manager Sarah",
        "notes": "Approved. Great initiative on continuing education."
    }
    
    async for event in runner.run_async(
        user_id="user1",
        session_id=session.id,
        new_message=types.Content(
            role="user",
            parts=[types.Part(function_response=approval_result)]
        )
    ):
        if event.is_final_response() and event.content and event.content.parts:
            print(f"Agent: {event.content.parts[0].text}")

asyncio.run(run_expense_workflow())
```

When you run this, the flow looks like:

```shell
> python.exe .\expense-approval.py
Tool paused: {'status': 'pending_approval', 'ticket_id': 'EXP-001', 'message': 'Expense report for $450.00 submitted. Awaiting manager review.'}
Agent: Your expense report for $450 for the Python conference has been submitted for approval. I will let you know once your manager responds.
Waiting for manager decision...
Agent: Great news! Your expense report has been approved by Manager Sarah. She noted: "Great initiative on continuing education."
```

### Sending intermediate progress updates

You are not limited to a single final result. The client can send multiple intermediate updates to keep the user informed about progress.

```python
# Send a progress update (not the final result)
progress = pending_response.model_copy(deep=True)
progress.response = {
    "status": "in_progress",
    "progress": "75%",
    "message": "Manager has viewed the request, decision pending..."
}

async for event in runner.run_async(
    session_id=session.id,
    user_id="user1",
    new_message=types.Content(
        role="user",
        parts=[types.Part(function_response=progress)],
    ),
):
    if event.is_final_response() and event.content and event.content.parts:
        print(f"Agent: {event.content.parts[0].text}")
```

Each intermediate update triggers a new agent run, in which the LLM generates a user-friendly status message based on the progress data.

### Human-in-the-loop patterns

One of the most practical applications for `LongRunningFunctionTool` is human-in-the-loop workflows. The agent gathers information, prepares a request, and submits it. A human reviewer makes a decision outside the agent's runtime. The decision flows back, and the agent takes the next action.

This pattern works for approval workflows, content review pipelines, quality assurance checkpoints, and any scenario where a human decision gate sits between agent actions. The key insight is that `LongRunningFunctionTool` does not perform the long-running work itself. It manages the handoff between the agent and the external process. The actual work happens elsewhere, and the tool is just the communication channel.

## Putting it all together

These four capabilities, OpenAPI tools, agents-as-tools, authentication, and long-running operations, rarely exist in isolation. A real-world agent might use `OpenAPIToolset` to integrate with a fleet of internal APIs, `AgentTool` to delegate specialized work to child agents, OAuth2 authentication to access user data on protected services, and `LongRunningFunctionTool` to handle approval workflows that depend on human reviewers.

The key insight is that all of these are composable. You can authenticate an `OpenAPIToolset` with OAuth2 credentials. You can wrap an agent that uses authenticated tools inside an `AgentTool`. You can have a long-running tool inside a child agent that is itself wrapped as an `AgentTool`. ADK's tool system is designed so these patterns stack cleanly.

In the next article in this series, we will look at how to integrate tools from third-party agent frameworks, LangChain and CrewAI adapters, to bring an even wider range of capabilities to your ADK agents.

