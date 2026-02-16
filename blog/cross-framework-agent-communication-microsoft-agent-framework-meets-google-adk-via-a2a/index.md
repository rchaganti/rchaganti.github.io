# Cross-Framework Agent Communication: Microsoft Agent Framework meets Google ADK via A2A


In the [previous article](https://ravichaganti.com/blog/building-multi-agent-systems-with-google-adk-and-the-a2a-protocol/), we explored how to build multi-agent systems using Google's Agent Development Kit (ADK) and the A2A (Agent-to-Agent) protocol. We built a currency conversion agent and exposed it via A2A, then created a travel assistant that consumed it—all within the ADK ecosystem.

But here's where A2A truly shines: framework interoperability. The A2A protocol isn't tied to any specific agent framework. Any A2A-compliant agent can communicate with any other, regardless of whether it was built with Google ADK, Microsoft Agent Framework, LangChain, or a custom implementation.

In today's article, I'll demonstrate this by building a Microsoft Agent Framework (MAF) agent that consumes the ADK currency agent we created earlier. This proves the real value of A2A—true framework-agnostic agent communication.

> Complete code for this article is available at [rchaganti/a2a-samples](https://github.com/rchaganti/a2a-samples/tree/main/02_maf)

## Prerequisites

Before diving in, make sure you have:

1. The ADK currency agent from the previous article is running on port 8001
2. Microsoft Agent Framework installed:

```bash
pip install agent-framework --pre httpx a2a
```

When a MAF agent wants to communicate with an A2A server (our ADK agent), it needs to:

1. **Discover the agent** by fetching its agent card from the well-known endpoint.
2. **Create a task** by sending a message to the agent.
3. **Receive the response,** which may include the agent's reply or artifacts.

The A2A protocol handles all the complexity of message formatting, task management, and response handling through a standard HTTP/JSON interface.

### The A2A Client Components in MAF

Microsoft Agent Framework provides first-class support for A2A through two key components:

#### 1. A2ACardResolver

The `A2ACardResolver` class from the `a2a.client` package handles agent discovery:

```python
from a2a.client import A2ACardResolver
import httpx

async with httpx.AsyncClient(timeout=60.0) as http_client:
    resolver = A2ACardResolver(
        httpx_client=http_client,
        base_url="http://localhost:8001"
    )
    
    agent_card = await resolver.get_agent_card()
```

This fetches the Agent Card from `http://localhost:8001/.well-known/agent.json`, which contains:

- Agent name and description
- Supported capabilities and skills
- Authentication requirements
- Protocol version information

#### 2. A2AAgent

The `A2AAgent` class wraps a remote A2A agent as a local MAF agent:

```python
from agent_framework.a2a import A2AAgent

currency_agent = A2AAgent(
    name="currency_converter",
    description="Remote agent for currency conversions",
    agent_card=agent_card,
    url="http://localhost:8001",
)
```

Once wrapped, you can interact with the remote agent using the standard MAF interface:

```python
response = await currency_agent.run("Convert 100 USD to EUR")
for message in response.messages:
    print(message.text)
```

### Building a MAF Shopping Assistant

Let's build a practical example: a shopping assistant that uses local tools for product management and delegates currency conversions to the remote ADK agent.

#### Local Shopping Tools

First, we define our local capabilities:

```python
PRODUCTS = {
    "laptop": {"price": 1299.99, "category": "Electronics"},
    "headphones": {"price": 199.99, "category": "Electronics"},
    "keyboard": {"price": 89.99, "category": "Electronics"},
    "backpack": {"price": 79.99, "category": "Accessories"},
}

def get_product_price(product_name: str) -> dict:
    """Get the price of a product in USD."""
    product_lower = product_name.lower().strip()
    
    if product_lower in PRODUCTS:
        product = PRODUCTS[product_lower]
        return {
            "success": True,
            "product": product_name.title(),
            "price_usd": product["price"],
            "category": product["category"],
            "message": f"{product_name.title()}: ${product['price']:.2f} USD"
        }
    
    return {
        "success": False,
        "message": f"Product '{product_name}' not found."
    }

def calculate_cart_total(items: list[dict]) -> dict:
    """Calculate the total price for a shopping cart."""
    subtotal = 0.0
    cart_items = []
    
    for item in items:
        product_name = item.get("product", "").lower().strip()
        quantity = item.get("quantity", 1)
        
        if product_name in PRODUCTS:
            product = PRODUCTS[product_name]
            item_total = product["price"] * quantity
            subtotal += item_total
            cart_items.append({
                "product": product_name.title(),
                "unit_price": product["price"],
                "quantity": quantity,
                "item_total": round(item_total, 2)
            })
    
    # Apply tax (8.5%)
    tax = round(subtotal * 0.085, 2)
    total = round(subtotal + tax, 2)
    
    return {
        "success": True,
        "items": cart_items,
        "subtotal_usd": round(subtotal, 2),
        "tax_usd": tax,
        "total_usd": total,
        "message": f"Cart total: ${total:.2f} USD (including ${tax:.2f} tax)"
    }
```

#### Connecting to the Remote ADK Agent

Now we connect to the ADK Currency Agent:

```python
import asyncio
import httpx
from a2a.client import A2ACardResolver
from agent_framework.a2a import A2AAgent

ADK_CURRENCY_AGENT_URL = "http://localhost:8001"

async def create_currency_agent():
    """Create an A2A agent wrapper for the remote ADK currency agent."""
    async with httpx.AsyncClient(timeout=60.0) as http_client:
        resolver = A2ACardResolver(
            httpx_client=http_client,
            base_url=ADK_CURRENCY_AGENT_URL
        )
        
        agent_card = await resolver.get_agent_card()
        print(f"✅ Connected to: {agent_card.name}")
        print(f"   Description: {agent_card.description}")
        
        return A2AAgent(
            name="currency_converter",
            description="""Remote agent for currency conversions.
            Use for: converting amounts, getting exchange rates,
            listing supported currencies.""",
            agent_card=agent_card,
            url=ADK_CURRENCY_AGENT_URL,
        )
```

We can now orchestrate between local tools and the remote A2A agent:

```python
async def shopping_with_currency_conversion():
    """Demonstrate local tools + remote A2A agent working together."""
    
    async with httpx.AsyncClient(timeout=60.0) as http_client:
        # Connect to the remote ADK agent
        resolver = A2ACardResolver(
            httpx_client=http_client,
            base_url=ADK_CURRENCY_AGENT_URL
        )
        agent_card = await resolver.get_agent_card()
        
        currency_agent = A2AAgent(
            name="currency_converter",
            description="Remote currency conversion agent",
            agent_card=agent_card,
            url=ADK_CURRENCY_AGENT_URL,
        )
        
        # Step 1: Use LOCAL tools to calculate cart
        print("📦 Using LOCAL shopping tools...")
        
        cart_result = calculate_cart_total([
            {"product": "laptop", "quantity": 1},
            {"product": "headphones", "quantity": 2}
        ])
        print(f"   {cart_result['message']}")
        
        total_usd = cart_result["total_usd"]
        
        # Step 2: Use REMOTE A2A agent for currency conversion
        print("\n🌐 Using REMOTE A2A agent for currency conversion...")
        
        response = await currency_agent.run(f"Convert {total_usd} USD to EUR")
        
        for message in response.messages:
            print(f"   {message.text}")
```

Running this produces:

```
📦 Using LOCAL shopping tools...
   Cart total: $1838.46 USD (including $143.50 tax)

🌐 Using REMOTE A2A agent for currency conversion...
   1838.46 USD = 1691.38 EUR
```

Let's trace through exactly what happens when MAF calls the ADK agent:

### Agent Discovery

When `A2ACardResolver.get_agent_card()` is called, it sends:

```http
GET /.well-known/agent.json HTTP/1.1
Host: localhost:8001
```

The ADK agent responds with its Agent Card:

```json
{
  "name": "currency_agent",
  "description": "A currency conversion agent that can convert amounts...",
  "url": "http://localhost:8001",
  "version": "1.0.0",
  "capabilities": {
    "streaming": false,
    "pushNotifications": false
  },
  "defaultInputModes": ["text"],
  "defaultOutputModes": ["text"],
  "skills": [
    {
      "id": "convert_currency",
      "name": "Currency Conversion",
      "description": "Convert amounts between different currencies"
    }
  ]
}
```

### Task Creation

When `currency_agent.run("Convert 100 USD to EUR")` is called, MAF sends:

```http
POST /tasks/send HTTP/1.1
Host: localhost:8001
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tasks/send",
  "id": "unique-request-id",
  "params": {
    "id": "task-uuid",
    "message": {
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "Convert 100 USD to EUR"
        }
      ]
    }
  }
}
```

### Response Handling

The ADK agent processes the request, calls its tools, and returns:

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": {
    "id": "task-uuid",
    "status": {
      "state": "completed"
    },
    "messages": [
      {
        "role": "agent",
        "parts": [
          {
            "type": "text",
            "text": "100 USD = 92 EUR"
          }
        ]
      }
    ]
  }
}
```

MAF's `A2AAgent` handles all this serialization and deserialization, presenting a clean interface.

The A2A protocol represents a significant step toward a future in which AI agents can collaborate regardless of their underlying frameworks. By standardizing the communication layer, we can build best-of-breed systems that leverage specialized agents from different ecosystems. A2A enables true interoperability, allowing agents developed in different frameworks to communicate seamlessly. The well-known endpoint (`/.well-known/agent.json`) provides all the information needed for agent discovery.

In future articles, we'll explore:

- **Exposing MAF agents via A2A** for ADK or other frameworks to consume.
- **Multi-agent orchestration** with agents from different frameworks.
- **Authentication and security** in A2A communications.
- **Streaming responses** for long-running agent tasks.


