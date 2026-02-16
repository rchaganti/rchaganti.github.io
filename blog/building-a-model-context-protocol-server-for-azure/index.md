# Building a Model Context Protocol server for Azure


The [earlier article](https://ravichaganti.com/blog/anthropic-model-context-protocol/) in this [series](https://ravichaganti.com/series/mcp/) introduced Anthropic's Model Context Protocol. It presented an example of building a simple MCP server for use with the Claude desktop application. The [hello-world example](https://github.com/rchaganti/mcp-servers/tree/main/hello-world) was a very basic implementation of an MCP server. In today's article, we shall extend our knowledge of creating MCP servers to achieve more practical applications. We will build an MCP server to interact with Microsoft Azure resources.

Anthropic made bootstrap MCP server development easy by providing the `create-mcp-server` package. To get started, you need to install this locally as a tool.

```shell
# Using uvx (recommended)
uvx create-mcp-server

# Or using pip
pip install create-mcp-server
create-mcp-server
```

To create a new MCP server, run the `uvx create-mcp-server` command and follow the prompts on the screen.

```shell
PS C:\GitHub> uvx create-mcp-server
Creating a new MCP server project using uv.                                                                                                                                                                                              
This will set up a Python project with MCP dependency.

Let's begin!

Project name (required): azure-mcp-server
Project description [A MCP server project]: An MCP server to interact with Azure resources
Project version [0.1.0]: 
Project will be created at: C:\GitHub\azure-mcp-server
Is this correct? [Y/n]: Y
Using CPython 3.13.1 interpreter at: C:\Program Files\Python313\python.exe
Creating virtual environment at: .venv
Resolved 21 packages in 466ms
      Built azure-mcp-server @ file:///C:/GitHub/azure-mcp-server
Prepared 2 packages in 2.02s
Installed 21 packages in 207ms
 + annotated-types==0.7.0
 + anyio==4.8.0
 + azure-mcp-server==0.1.0 (from file:///C:/GitHub/azure-mcp-server)
 + certifi==2025.1.31
 + click==8.1.8
 + colorama==0.4.6
 + h11==0.14.0
 + httpcore==1.0.7
 + httpx==0.28.1
 + httpx-sse==0.4.0
 + idna==3.10
 + mcp==1.3.0
 + pydantic==2.10.6
 + pydantic-core==2.27.2
 + pydantic-settings==2.8.1
 + python-dotenv==1.0.1
 + sniffio==1.3.1
 + sse-starlette==2.2.1
 + starlette==0.46.0
 + typing-extensions==4.12.2
 + uvicorn==0.34.0

Claude.app detected. Would you like to install the server into Claude.app now? [Y/n]: Y
Settings file location: C:\Users\ravik\AppData\Roaming\Claude\claude_desktop_config.json
✅ Created project azure-mcp-server in azure-mcp-server
ℹ️ To install dependencies run:
   cd azure-mcp-server
   uv sync --dev --all-extras
```

This command sets up all the dependencies needed to build an MCP server. Depending on your choice, it will also add the MCP server to the Claude Desktop configuration. The folder structure will be as follows.

```shell
PS C:\GitHub\azure-mcp-server> ls

    Directory: C:\GitHub\azure-mcp-server

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----        23-02-2025     16:26                .venv
d-----        23-02-2025     16:26                src
-a----        23-02-2025     19:04             66 .gitattributes
-a----        23-02-2025     19:04           3238 .gitignore
-a----        23-02-2025     16:26              5 .python-version
-a----        23-02-2025     19:04           1088 LICENSE
-a----        23-02-2025     17:31            553 pyproject.toml
-a----        23-02-2025     19:04            146 README.md
-a----        23-02-2025     17:31          46157 uv.lock
```

The `src\azure_mcp_server` should contain all the business logic you need to enable Azure resource management integration. By default, it contains a sample MCP Server used to manage notes. 

```she
PS C:\GitHub\azure-mcp-server\src\azure_mcp_server> ls

    Directory: C:\GitHub\azure-mcp-server\src\azure_mcp_server

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----        04-03-2025     08:27                __pycache__
-a----        23-02-2025     17:53            228 .env
-a----        04-03-2025     08:27           6561 server.py
-a----        23-02-2025     16:26            220 __init__.py
```

This sample server implementation is a great start to learning how to implement different capabilities of an MCP server. We shall implement the tools' capability and, in the future, look at implementing prompts and resources as well.

You must decide how to authenticate to interact with the Azure resource management API. For the purpose of the demonstration, I have used client secret-based authentication. I documented these [requirements in an earlier article](https://ravichaganti.com/blog/azure-sdk-for-go-authentication-methods-environmental-credential/). The client secret credential is better created by adding the keys and secrets as environment variables. We can use the .env file in the Python project to make this easy. You need to add the following key-value pairs to this file.

```ini
AZURE_SUBSCRIPTION_ID=Sub-ID
AZURE_TENANT_ID=Tenant-ID
AZURE_CLIENT_ID=Client-ID
AZURE_CLIENT_SECRET=Secret
```

A .env file requires the load_dotenv function from the python-dotenv package, so add that as a dependency.

```she
uv add python-dotenv
```

We will also need the Azure resource management packages.

```shell
uv add azure.identity
uv add azure-mgmt-resource
uv add azure-mgmt-subscription
```

With all the package dependencies added to the project, we can move toward adding the necessary tools. This is done in `server.py`. Before adding the code related to the tools, let us first add the functions needed to talk to the Azure resource management API.

```python
async def list_subscriptions() -> list[dict[str, Any]]:
    """List all subscriptions in the account.
    
    Args:
        None
    """
    credential = EnvironmentCredential()
    subscription_client = SubscriptionClient(credential)
    subscriptions = subscription_client.subscriptions.list()

    subscription_list = []
    for subscription in list(subscriptions):
        subscription_info = {
            "id": subscription.subscription_id,
            "name": subscription.display_name,
        }
        subscription_list.append(subscription_info)

    return subscription_list

async def list_resource_groups(subscription_id=None) -> list[dict[str, Any]]:
    """List all resource groups in the subscription.
    
    Args:
        subscription_id (str): The subscription ID. This is an optional parameter.
    """
    credential = EnvironmentCredential()
    if subscription_id is None:
        if "AZURE_SUBSCRIPTION_ID" not in os.environ:
            raise ValueError("subscription_id must be provided or set as an environment variable.")
        else:
            subscription_id = os.environ["AZURE_SUBSCRIPTION_ID"]

    resource_client = ResourceManagementClient(credential, subscription_id)
    group_list = resource_client.resource_groups.list()

    resource_groups = []
    for group in list(group_list):
        resource = {
            "name": group.name,
            "location": group.location,
        }
        resource_groups.append(resource)

    return resource_groups

async def list_resources(resource_group, subscription_id) -> list[dict[str, Any]]:
    """List all resources in the resource group.
    
    Args:
        resource_group (str): The resource group name.
        subscription_id (str): The subscription ID. This is an optional parameter.
    """
    credential = EnvironmentCredential()
    if subscription_id is None:
        if "AZURE_SUBSCRIPTION_ID" not in os.environ:
            raise ValueError("subscription_id must be provided or set as an environment variable.")
        else:
            subscription_id = os.environ["AZURE_SUBSCRIPTION_ID"]

    resource_client = ResourceManagementClient(credential, subscription_id)
    resources = resource_client.resources.list_by_resource_group(resource_group)

    resource_list = []
    for resource in list(resources):
        resource_info = {
            "name": resource.name,
            "type": resource.type,
            "location": resource.location,
        }
        resource_list.append(resource_info)

    return resource_list
```

These three functions are a basic implementation for getting a list of subscriptions, all resource groups in a subscription, and all resources within a resource group. You must have the docstring inside each function to describe what the function is about and its arguments, and outputs. The code within these functions is self-explanatory. If you need a quick tour of Azure resource management in Python, look at the [Azure Python SDK](https://learn.microsoft.com/en-us/azure/developer/python/sdk/azure-sdk-overview).

An MCP server is a JSON RPC server. Every MCP server exposes the list and call tool endpoints. These are defined using the `handle_list_tools()` and `handle_call_tool()` functions.

```python
@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """
    List available tools.
    Each tool specifies its arguments using JSON Schema validation.
    """
    return [
        types.Tool(
            name="list-subscriptions",
            description="List all Azure subscriptions for the authenticated user.",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": [],
            },
        ),
        types.Tool(
            name="list-resource-groups",
            description="List all resource groups in an Azure subscription.",
            inputSchema={
                "type": "object",
                "properties": {
                    "subscription_id": {"type": "string"},
                },
                "required": [],
            },
        ),
        types.Tool(
            name="list-resources",
            description="List all resources in a resource group.",
            inputSchema={
                "type": "object",
                "properties": {
                    "subscription_id": {"type": "string"},
                    "resource_group": {"type": "string"}
                },
                "required": ["resource_group"],
            },
        )                
    ]

@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict | None
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """
    Handle tool execution requests.
    Tools can modify server state and notify clients of changes.
    """
    if name == "list-subscriptions":
        response = await list_subscriptions()
        respText = "Subscriptions:\n"
        
        for subscription in response:
            respText += f"ID: {subscription['id']}, Name: {subscription['name']}\n"
    
    elif name == "list-resource-groups":
        subscription_id = arguments.get("subscription_id", None)
        response = await list_resource_groups(subscription_id)
        respText = f"Resource Groups in {subscription_id}:\n"
        
        for group in response:
            respText += f"Name: {group['name']}, Location: {group['location']}\n"
    
    elif name == "list-resources":
        subscription_id = arguments.get("subscription_id", None)
        resource_group = arguments.get("resource_group")
        result = await list_resources(resource_group, subscription_id)
        respText = f"Resources in {resource_group} in the {subscription_id}:\n"

        for resource in result:
            respText += f"Name: {resource['name']}, Type: {resource['type']}, Location: {resource['location']}\n"
    
    else:
        respText = "Invalid tool name."
    
    return [
            types.TextContent(
                type="text",
                text=respText
            )
        ]
```

These list and call functions are decorated using the `list_tools()` and `call_tools()` decorators respectively. The `handle_list_tools()`  returns a list of tools where each element is of type `types.Tool`. The `handle_call_tool()` returns the output from the tool call as one of the return types specified in the function signature. Depending on the return type, you must construct the value. In this example, all tools call will respond with a dictionary. This response then gets converted to text content and is returned as `types.TextContent` type. This type requires `type` and `text` properties.

As the `create-mcp-server` command added the tool to the Claude Desktop application, you must be able to see the tools ready for use.

{{< figure src="/images/azure-mcp-01.png" width="450px">}} {{< load-photoswipe >}}

Once you confirm the available tools, you can try the following prompts.

- List all subscriptions I have access to in my Azure account
- Do I have any resource groups in the east-us region?
- List all virtual machines provisioned in my Research subscription.

{{< figure src="/images/azure-mcp-02.png" width="450px">}} {{< load-photoswipe >}}

When you prompt, Claude will ask permission to use the available tools. If allowed, it can call the tools and get you the response.

With MCP, the possibilities are endless. I am developing the [Azure MCP server](https://github.com/rchaganti/azure-mcp-server) as an open-source project, and I will continue to add more tools, prompts, and resources to it. Do check it out and leave a comment.






