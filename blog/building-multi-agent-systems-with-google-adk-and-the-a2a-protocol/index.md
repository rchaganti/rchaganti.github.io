# Building multi-agent systems with Google ADK and the A2A protocol


The landscape of AI agents is evolving rapidly, and one of the most significant developments is the emergence of standardized protocols that enable agents to communicate with one another. Google's Agent Development Kit (ADK) natively supports the Agent-to-Agent (A2A) protocol, enabling developers to build sophisticated multi-agent systems where specialized agents can collaborate across network boundaries. In this post, we'll explore what A2A is, why it matters, and walk through a complete implementation that demonstrates how to expose an agent as a remote service and consume it from another agent.

Traditional agent architectures tend to be monolithic. You build an agent, give it tools and capabilities, and it operates as a self-contained unit. This works well for simple use cases, but as AI applications grow more complex, we encounter significant limitations. Consider a scenario where you need an agent that can handle travel planning, currency conversions, flight bookings, hotel reservations, and local recommendations. Building all of this into a single agent becomes unwieldy—the instruction set grows massive, the tools become numerous, and the agent struggles to maintain context across such diverse domains.

The natural solution is decomposition: break the monolith into specialized agents, each focused on a specific domain. A currency agent handles conversions, a booking agent manages reservations, and a travel advisor provides recommendations. But this raises a new challenge: how do these agents communicate? If they're all running in the same process, you can simply wire them together as sub-agents. But what if you want to deploy them as independent services? What if one team builds the currency agent and another team builds the travel planner? What if you want to use a third-party currency agent?

This is where the [A2A protocol](https://a2a-protocol.org/latest/) comes into play. It provides a standardized way for agents to discover each other, understand each other's capabilities, and exchange messages—regardless of where they're deployed or who built them.

> Code sample for this article is available at [a2a-samples/01-basics at main · rchaganti/a2a-samples](https://github.com/rchaganti/a2a-samples/tree/main/01-basics)

### Understanding A2A protocol

Almost a year ago, Google [announced the release](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/) of an open protocol called agent-to-agent. This is an open standard designed to enable interoperability between AI agents. At its core, A2A defines three key concepts: agent cards, message formats, and communication patterns.

An [agent card](https://a2a-protocol.org/latest/specification/#5-agent-discovery-the-agent-card) is a JSON document that describes an agent's identity and capabilities. Think of it as a machine-readable resume that tells other agents what this agent can do. The agent card includes the agent's name, a description of its purpose, the skills it offers, and the URL where it can be reached. When one agent wants to use another, it first fetches the agent card to understand what services are available. The agent card is served at a well-known URL path (`/.well-known/agent-card.json`), making agent discovery straightforward and predictable.

The [message format](https://a2a-protocol.org/latest/definitions/#json) standardizes how agents exchange information. A2A uses a request-response model built on HTTP and JSON, making it compatible with existing web infrastructure. Messages contain the user's input, conversation context, and request metadata. Responses include the agent's output along with any artifacts or structured data it produces. This standardization means that an agent built with Google ADK can communicate with an agent built using a completely different framework, as long as both implement the A2A protocol.

Communication patterns in A2A support both synchronous request-response interactions and streaming responses. For simple queries like "what's the exchange rate?", a synchronous call works perfectly. For more complex interactions that might take time or produce incremental results, [streaming](https://a2a-protocol.org/latest/topics/streaming-and-async/) allows the consuming agent to receive partial responses as they're generated.

Let us understand this in-depth with an example.

## A travel agent system

To demonstrate these concepts concretely, we will look at a travel assistant system with two distinct agents. The first is a currency conversion agent that runs as a standalone A2A server. It knows nothing about travel. Its sole expertise is converting amounts between currencies and providing exchange rate information. The second is a travel assistant agent that operates locally and provides destination information, budget calculations, and trip-planning advice. When the travel assistant needs currency conversion capabilities, it doesn't implement them itself; instead, it delegates to the remote currency agent via A2A.

This architecture mirrors real-world scenarios where specialized services are deployed independently. The currency agent could be maintained by an external fintech team, updated with real-time exchange rates from market feeds, and scaled independently based on demand. The travel assistant could be developed by a completely separate team, consuming the currency service without needing to understand its internal implementation. The A2A protocol serves as the contract between them, ensuring they can communicate reliably even as their internal implementations evolve.

{{< figure src="/images/a2a-ex1.png" >}}  {{< load-photoswipe >}}

### The currency agent

Let's examine how the currency agent is built and exposed via A2A. The agent itself is a standard Google ADK agent with tools for currency operations. The key difference from a typical agent is the final step: wrapping it with the `to_a2a()` function to make it A2A-compatible.

The currency agent defines three tools that encapsulate its domain expertise. The `convert_currency` function takes an amount, a source currency, and a target currency, then returns the converted amount along with the exchange rate used. The `get_exchange_rate` function returns just the rate between two currencies without performing a conversion. The `list_supported_currencies` function returns all currency codes the agent can work with. Each tool returns a structured dictionary with a success flag, the requested data, and a human-readable message. This structured approach makes it easy for the consuming agent to parse the results programmatically while also providing natural-language output for the user.

```python
def convert_currency(amount: float, from_currency: str, to_currency: str) -> dict:
    """Convert an amount from one currency to another."""
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()
    
    if from_currency == to_currency:
        return {
            "success": True,
            "original_amount": amount,
            "from_currency": from_currency,
            "to_currency": to_currency,
            "converted_amount": amount,
            "exchange_rate": 1.0,
            "message": f"{amount} {from_currency} = {amount} {to_currency}"
        }
    
    rate_key = (from_currency, to_currency)
    if rate_key in EXCHANGE_RATES:
        rate = EXCHANGE_RATES[rate_key]
        converted = round(amount * rate, 2)
        return {
            "success": True,
            "original_amount": amount,
            "from_currency": from_currency,
            "to_currency": to_currency,
            "converted_amount": converted,
            "exchange_rate": rate,
            "message": f"{amount} {from_currency} = {converted} {to_currency}"
        }
    
    # Handle conversion through USD as intermediate when direct rate unavailable
    # ... implementation continues
```

The agent definition follows the standard ADK pattern. We specify the model (Gemini 2.0 Flash in this case), give the agent a name and description, provide detailed instructions about its capabilities, and attach the tools it can use. The description is particularly important in an A2A context because it becomes part of the agent card and helps consuming agents understand when to delegate tasks to this agent.

```python
root_agent = Agent(
    model="gemini-2.0-flash",
    name="currency_agent",
    description="A currency conversion agent that can convert amounts between "
                "different currencies and provide exchange rate information.",
    instruction="""You are a helpful currency conversion assistant.

Your capabilities:
1. Convert amounts from one currency to another using the convert_currency tool
2. Get exchange rates between currencies using the get_exchange_rate tool  
3. List all supported currencies using the list_supported_currencies tool

When users ask about currency conversions:
- Always confirm the currencies and amount before converting
- Provide clear, formatted results
- If a currency is not supported, let the user know and suggest alternatives
""",
    tools=[convert_currency, get_exchange_rate, list_supported_currencies],
)
```

The single line of code below transforms this standard ADK agent into an A2A-compatible service:

```python
from google.adk.a2a.utils.agent_to_a2a import to_a2a

a2a_app = to_a2a(root_agent, port=8001)
```

The `to_a2a()` function performs several important tasks behind the scenes. First, it creates a FastAPI application that implements the A2A protocol endpoints. Second, it analyzes the agent's configuration—its name, description, instructions, and tools—and automatically generates an agent card that describes these capabilities in the A2A format. Third, it sets up the message handling pipeline that receives A2A requests, translates them into ADK's internal format, runs the agent, and translates the responses back to A2A format.

The resulting `a2a_app` is a standard ASGI application that can be served using any ASGI server. We use `uvicorn` in our example:

```shell
uvicorn "07-a2a-protocol.remote_a2a.currency_agent.agent:a2a_app" --host localhost --port 8001
```

Once running, the agent card becomes available at `http://localhost:8001/.well-known/agent-card.json`. This auto-generated card includes the agent's name, description, supported input and output modes, and a skills array derived from the agent's tools and instructions. Other agents can fetch this card to discover what the currency agent can do.

### Consuming the remote agent

On the consuming side, we have the travel assistant agent that needs to use the currency agent's capabilities. The ADK provides the `RemoteA2aAgent` class specifically for this purpose. Unlike a regular sub-agent that runs in the same process, a `RemoteA2aAgent` represents a remote service that communicates over the network.

```python
from google.adk.agents.remote_a2a_agent import RemoteA2aAgent, AGENT_CARD_WELL_KNOWN_PATH

currency_agent = RemoteA2aAgent(
    name="currency_agent",
    description="""Remote agent specialized in currency conversions and exchange rates.
    Use this agent when you need to:
    - Convert amounts from one currency to another
    - Get current exchange rates between currencies
    - List supported currencies for conversion
    """,
    agent_card=f"http://localhost:8001{AGENT_CARD_WELL_KNOWN_PATH}",
)
```

The `RemoteA2aAgent` requires three pieces of information: a name to identify it within the local agent system, a description that helps the root agent understand when to delegate to it, and the URL of the agent card. The `AGENT_CARD_WELL_KNOWN_PATH` constant provides the standard path (`/.well-known/agent-card.json`), ensuring consistency with the A2A specification.

When the travel assistant is initialized, it doesn't connect to the remote agent immediately. Instead, it stores the agent card URL and fetches the card lazily when needed. This design allows the local agent to start even if the remote service is temporarily unavailable, and ensures the agent card information is always up to date.

The travel assistant also has a local sub-agent for travel information. This demonstrates the hybrid nature of real-world systems—some capabilities are local, some are remote, and the root agent orchestrates between them:

```python
travel_info_agent = Agent(
    model="gemini-2.0-flash",
    name="travel_info_agent",
    description="Local agent that provides travel destination information and budget calculations.",
    instruction="""You are a travel information specialist.
    
Your capabilities:
1. Get detailed information about travel destinations using get_destination_info
2. Calculate trip budgets using calculate_trip_budget  
3. List all available destinations using list_destinations
""",
    tools=[get_destination_info, calculate_trip_budget, list_destinations],
)
```

The root agent brings everything together. Its instruction set explains the available sub-agents and provides guidance on when to use each one. The `sub_agents` array includes both the local `travel_info_agent` and the remote `currency_agent`, and from the root agent's perspective, they're used in exactly the same way:

```python
root_agent = Agent(
    model="gemini-2.0-flash",
    name="travel_assistant",
    description="A comprehensive travel assistant that can provide destination "
                "information and handle currency conversions.",
    instruction="""You are a helpful travel assistant that helps users plan their trips.

You have access to two specialized agents:
1. **travel_info_agent** (local): For destination information, trip budgets, and travel tips
2. **currency_agent** (remote via A2A): For currency conversions and exchange rates

When a user asks about:
- Destination information, attractions, best time to visit → delegate to travel_info_agent
- Trip budget estimates → delegate to travel_info_agent, then optionally convert 
  to local currency via currency_agent
- Currency conversions or exchange rates → delegate to currency_agent
- Combined queries (e.g., "How much is the Paris trip in Euros?") → coordinate 
  between both agents

Workflow for budget with currency conversion:
1. First get the budget in USD from travel_info_agent
2. Then convert the USD amount to the destination's local currency using currency_agent
3. Present both values to the user
""",
    sub_agents=[travel_info_agent, currency_agent],
)
```

When a user asks, "What's the exchange rate from USD to EUR?", the root agent recognizes this as a currency-related query and delegates to the `currency_agent`. Behind the scenes, the ADK framework handles A2A communication: it formats the request per the A2A protocol, sends it to the remote server, waits for the response, and returns the result via the root agent. The user sees a seamless interaction, unaware that part of the processing happened on a different server.

### Communication flow

Let's trace through what happens when a user asks the travel assistant to "Calculate a 5-day budget for Tokyo and convert it to Japanese Yen." This query requires coordination between both agents and illustrates the full power of the A2A architecture.

{{< figure src="/images/a2a-seq.png" >}}

Throughout this process, the user experiences a single, unified conversation with the travel assistant. The complexity of multi-agent coordination and network communication is completely hidden.

## Error handling

Production systems must handle failures gracefully, and A2A introduces new failure modes that don't exist in monolithic agents. The remote service might be unavailable, the network might be slow, or the remote agent might return an error. The ADK framework and A2A protocol include mechanisms to handle these scenarios.

When a `RemoteA2aAgent` cannot reach its target service, the framework raises an exception that the root agent can handle. In our travel assistant, this might manifest as the root agent telling the user: "I'm currently unable to perform currency conversions. I can still help you with destination information and budget estimates in USD." The key is that a failure in one agent doesn't crash the entire system, making the local capabilities remain available.

Timeout handling is also important for remote services. A2A requests include timeout parameters, and the ADK framework respects these when making remote calls. If a currency conversion takes too long (perhaps because the remote agent is overloaded), the request times out, and the root agent can decide how to proceed. It may retry, skip the conversion, or ask the user to try again later.

The agent card mechanism also provides resilience benefits. Because the consuming agent fetches the agent card dynamically, the remote agent can update its capabilities without requiring changes to the consumer. If the currency agent adds support for cryptocurrency conversions, this new capability appears on the agent card, and sophisticated consuming agents could automatically discover and use it.

## Deploying A2A agents

Deploying A2A agents in production requires thinking about several architectural concerns. First, consider where each agent runs. The currency agent in our example runs on localhost, but in production it might run on a cloud server, in a Kubernetes cluster, or as a serverless function. The A2A protocol's HTTP-based design allows agents to be deployed on any standard web infrastructure.

Authentication and authorization become important when agents communicate over networks. The A2A protocol supports various authentication mechanisms, and the ADK's `to_a2a()` function can be configured with authentication middleware. You might need API keys to access your currency agent, or use OAuth tokens for more sophisticated access control.

Observability is another crucial concern. When a request traverses multiple agents, you need distributed tracing to understand the full request flow. The ADK integrates with standard observability tools, and A2A requests propagate trace context headers, allowing you to correlate logs and traces across agent boundaries.

Scaling considerations differ between agent types. A computationally lightweight agent that primarily orchestrates other agents (such as our travel assistant) might require different scaling characteristics than an agent that performs heavy processing. The A2A architecture naturally supports independent scaling. You can run multiple instances of the currency agent behind a load balancer without changing anything about how the travel assistant consumes it.

## Beyond basics

Our travel assistant example demonstrates the fundamental A2A patterns, but the protocol supports more sophisticated scenarios. Streaming responses allow remote agents to send partial results as they're generated, which is valuable for long-running operations or when you want to provide progressive feedback to users. The ADK supports streaming through A2A, and configuring it requires only minor changes to the agent setup.

Agent discovery services can maintain registries of available agents and their capabilities. Instead of hardcoding the currency agent's URL, a production system might query a discovery service to find agents capable of performing currency conversions. This enables dynamic agent selection based on capabilities, availability, or other criteria.

Multi-hop agent chains are also possible, where Agent A calls Agent B, who then calls Agent C. The A2A protocol handles this naturally—each agent simply sees requests from its immediate caller, regardless of how deep the chain goes. However, designing such systems requires careful attention to latency accumulation and error propagation.

## Summary

The A2A protocol represents a significant step forward in building modular, scalable AI agent systems. By providing a standardized way for agents to communicate across network boundaries, it enables architectures that were previously difficult or impossible to build. Specialized agents can be developed, deployed, and maintained independently, then composed into larger systems that leverage their combined capabilities.

Google ADK's support for A2A makes implementing these patterns straightforward. The `to_a2a()` function handles the complexity of exposing an agent as an A2A service, automatically generating agent cards and managing the protocol details. The `RemoteA2aAgent` class provides a clean abstraction for consuming remote agents, making them appear as natural sub-agents within the local agent hierarchy.

As AI agents become more prevalent in production systems, protocols like A2A will become essential infrastructure. The ability to build, share, and compose specialized agents—treating them as interoperable services rather than monolithic applications—unlocks new possibilities for AI system architecture. The example we've built here is just the beginning; the patterns and principles apply to systems of any scale and complexity.


