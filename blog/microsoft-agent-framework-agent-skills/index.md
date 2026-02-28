# Microsoft Agent Framework - Agent Skills


Seems like a season of [Agent Skills](https://agentskills.io/home) adoption. [Google ADK implemented support for skills](https://ravichaganti.com/blog/google-adk-agent-skills/) a couple of weeks ago, and it's [Microsoft Agent Framework's turn last week](https://github.com/microsoft/agent-framework/pull/4210). In an earlier article in the [Google ADK series](https://ravichaganti.com/series/google-adk/), we implemented an IaC agent that leverages skills for generating Bicep templates that comply with organizational policies. In today's article, we will explore how to implement the same in Microsoft Agent Framework (MAF).

Unlike Google ADK, MAF has no inline skill support, so all skills must be implemented as directory skills. We will equip our agent with two skills:

- Governance Skill: Contains the company's mandatory tagging, naming, and SKU policies.
- Bicep Authoring Skill: Contains best practices for writing clean Bicep code (like parameterization and formatting).

### Creating the Directory Skills

Let's start by creating our directory-based skills. In your project folder, create a structure that looks like this:

```text
maf_agent/
└── skills/
    ├── governance-skill/
    │   ├── SKILL.md
    │   └── references/
    │       └── policies.md
    └── bicep-authoring/
        ├── SKILL.md
        └── references/
            └── example.bicep
```

The [SKILL.md](file:///c:/GitHub/google-adk-101/maf_agent/skills/bicep-authoring/SKILL.md) file serves as the entry point and contains YAML front matter defining the skill's identity, followed by instructions on how the agent should use it.

Here is what the [governance-skill/SKILL.md](file:///c:/GitHub/google-adk-101/maf_agent/skills/governance-skill/SKILL.md) looks like:

```markdown
---
name: governance-skill
description: Provides organizational governance rules and policies for cloud resource deployments. It should be used to ensure any generated infrastructure code complies with company standards.
---

# Instructions

You are helping the user build infrastructure. Review this skill when you need to generate infrastructure or verify if a configuration meets standard practices.

Consider the following steps:
1. Review the `references/policies.md` file to understand the current organizational standards.
2. Structure the infrastructure code (e.g., Bicep, ARM templates, Terraform) to follow the policies listed in the reference.
3. If a user request conflicts with a policy, politely suggest the alternative compliant configuration.
4. Add a comment block at the top indicating the code was cross-checked with organizational policies.
```

Next, in the [references/policies.md](file:///c:/GitHub/google-adk-101/maf_agent/skills/governance-skill/references/policies.md) file, we define our actual organizational rules:

```markdown
# Organizational Governance Policies

All infrastructure deployments must adhere to the following rules:

## 1. Naming Conventions
- All resources must include the prefix `org-xyz-`.
- Example: A storage account named `data` must be deployed as `orgxyzdata` (storage accounts don't allow hyphens) or an app service named `frontend` must be deployed as `org-xyz-frontend`.

## 2. Resource Skus
- **Storage Accounts**: Must use the `Standard_GRS` SKU to ensure geographic redundancy. `Standard_LRS` or other SKUs are not permitted for production use.
- **App Service Plans**: Must use at least the `S1` (Standard) tier. Free or Shared tiers are not allowed.

## 3. Tagging Requirements
Every resource must have the following mandatory tags:
- `Environment`: Must be set to either `Development`, `Staging`, or `Production`.
- `Owner`: Must contain a valid email address or team name.

## 4. Location
- All resources must be deployed to the `eastus` or `westus` regions.
```

The Bicep authoring skills, which is an inline skill in the Google ADK example, must be implemented as a directory skill as well. 

```markdown
---
name: bicep-authoring-skill
description: Provides best practices for writing clean, maintainable Bicep templates.
---

# Instructions

Apply the following best practices when generating or modifying Bicep templates:
1. Start the file with a general comment block explaining the purpose of the template.
2. Define all parameters explicitly with types and standard default values if applicable.
3. Use meaningful resource symbolic names that describe its purpose, rather than generic names.
4. Organize the template logically: Parameters first, then variables, then resources, and finally outputs.
5. The template should be well-formatted Azure Bicep code.
6. Please validate the generated Bicep configuration using the `validate_bicep` tool before returning it to the user. Fix any compilation errors reported.

# Resources

See the example of a good Bicep template structure in `references/example.bicep`.
```

We will also supply a reference example of a Bicep configuration.

```Bicep
// This is an example of a good Bicep template structure.
param location string = resourceGroup().location
param env string

var storagePrefix = 'stg'

resource myStorage 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: '${storagePrefix}${env}'
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
}
```

### Initializing the Agent with Skills

Now, let's wire this up in our [agent.py](file:///c:/GitHub/google-adk-101/maf_agent/agent.py) file. We will use MAF's built-in `FileAgentSkillsProvider` to load all skills from our `skills` directory and inject them into our `Agent`. We will also provide a standard Python function as a tool to help the agent compile the Bicep code locally.

```python
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Ensure the correct framework packages are imported
try:
    from agent_framework import Agent, FileAgentSkillsProvider
    from agent_framework.azure import AzureOpenAIResponsesClient
    from azure.identity import AzureCliCredential
except ImportError as e:
    print(f"ImportError: {e}")
    sys.exit(1)

# Load environment variables
load_dotenv()

def validate_bicep(bicep_content: str) -> str:
    """Validates the provided Bicep template content for compilation errors by running 'bicep lint' and 'bicep build'. Pass the full bicep string."""
    import tempfile
    import subprocess
    
    with tempfile.NamedTemporaryFile(suffix=".bicep", delete=False) as f:
        f.write(bicep_content.encode('utf-8'))
        temp_path = f.name
        
    try:
        # First, run bicep lint
        lint_result = subprocess.run(['bicep', 'lint', temp_path], capture_output=True, text=True)
        if lint_result.returncode != 0:
            return f"Linting failed with issues:\n{lint_result.stderr}\n{lint_result.stdout}"
            
        # If lint passes, run bicep build
        build_result = subprocess.run(['bicep', 'build', temp_path], capture_output=True, text=True)
        if build_result.returncode == 0:
            return "Validation successful. Bicep template passed linting and build."
        else:
            return f"Validation failed during build:\n{build_result.stderr}\n{build_result.stdout}"
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

async def main():
    if not os.environ.get("AZURE_AI_PROJECT_ENDPOINT"):
        print("Please set AZURE_AI_PROJECT_ENDPOINT in your environment or .env file.")
        return

    endpoint = os.environ["AZURE_AI_PROJECT_ENDPOINT"]
    deployment = os.environ.get("AZURE_OPENAI_RESPONSES_DEPLOYMENT_NAME", "gpt-4o-mini")

    try:
        client = AzureOpenAIResponsesClient(
            project_endpoint=endpoint,
            deployment_name=deployment,
            credential=AzureCliCredential(),
        )
    except Exception as e:
        print(f"Failed to initialize MAF Azure Open AI client: {e}")
        return

    # Discover skills
    skills_dir = Path(__file__).parent / "skills"
    skills_provider = FileAgentSkillsProvider(skill_paths=str(skills_dir))

    async with Agent(
        client=client,
        instructions=(
            "You are an assistant helping construct Azure Bicep code."
        ),
        context_providers=[skills_provider],
        tools=[validate_bicep]
    ) as agent:
        print("Agent initialized with MAF.")
        print("User: I need to deploy an Azure Storage Account and an App Service for our new portal. The environment will be Staging.")
        print("-" * 40)
        
        response = await agent.run(
            "I need to deploy an Azure Storage Account and an App Service for our new portal. The environment will be Staging."
        )
        print(f"Agent:\n{response}\n")

if __name__ == "__main__":
    asyncio.run(main())

```

In the code above, we point the `FileAgentSkillsProvider` to our directory. We then pass this provider into the `context_providers` array of our `Agent`. This grants the LLM access to the reference documents and specific behavioral guidelines we defined.

To test our agent, we simply run the Python script.

```powershell
> python.exe .\maf_agent\agent.py
```

The agent loads the available skills and skill references to gain the procedural knowledge and generate the Bicep template.

```markdown
Agent initialized with MAF.
User: I need to deploy an Azure Storage Account and an App Service for our new portal. The environment will be Staging.
----------------------------------------
Agent:
I created a validated Bicep template that deploys an Azure Storage Account and an App Service (with an App Service Plan) configured for the Staging environment and compliant with your org governance rules.

Notes:
- Template is cross-checked with organizational policies: resource name prefixes, Storage SKU = Standard_GRS, App Service Plan tier = S1, mandatory tags (Environment, Owner), and allowed locations (eastus | westus).
- The environment defaults to Staging. You must provide the Owner tag value (email or team name) when deploying.
- Storage account name uses the storage-safe prefix orgxyz (no hyphens) per governance rules.

Bicep template:

/*
Cross-checked with organizational policies: uses org-xyz prefix (storage accounts use orgxyz prefix as storage account names cannot contain hyphens), Storage Account SKU set to Standard_GRS, App Service Plan tier set to S1, mandatory tags (Environment, Owner) applied, and allowed locations restricted to eastus or westus.
Purpose: Deploy an Azure Storage Account and an App Service for the portal in the specified environment.
*/

@allowed([
  'eastus'
  'westus'
])
param location string = 'eastus'

@allowed([
  'Development'
  'Staging'
  'Production'
])
param environment string = 'Staging'

param owner string

var envShort = environment == 'Production' ? 'prod' : (environment == 'Staging' ? 'stg' : 'dev')

// Storage account names must be lowercase, alphanumeric, and between 3 and 24 characters. Hyphens are not allowed.
var storageAccountName = toLower('orgxyzportal${envShort}')
var appServicePlanName = 'org-xyz-asp-${envShort}'
var appServiceName = 'org-xyz-portal-${envShort}'

resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_GRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
  }
  tags: {
    Environment: environment
    Owner: owner
  }
}

resource appServicePlan 'Microsoft.Web/serverfarms@2021-02-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'S1'
    tier: 'Standard'
    capacity: 1
  }
  kind: 'app'
  properties: {
    reserved: false
  }
  tags: {
    Environment: environment
    Owner: owner
  }
}

resource appService 'Microsoft.Web/sites@2021-02-01' = {
  name: appServiceName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'STORAGE_ACCOUNT_NAME'
          value: storageAccount.name
        }
      ]
    }
  }
  tags: {
    Environment: environment
    Owner: owner
  }
}

output storageAccountName string = storageAccount.name
output appServiceName string = appService.name
output storageAccountId string = storageAccount.id
output appServiceId string = appService.id

Deployment example (resource group scope):
- az deployment group create --resource-group <rg-name> --template-file portal-staging.bicep --parameters owner='team@example.com'

I validated the Bicep file (lint/build) and it passed. If you want, I can:
- Add a parameter for application runtime settings or Docker image,
- Add Managed Identity and key/vault integration,
- Or change naming conventions or include unique suffixes if you need globally unique storage account names. Which would you like next?
```

As you can see, the agent successfully navigated our organizational requirements. It forcefully set the App Service Plan to S1, deployed to eastus, utilized the org-xyz- prefix, applied the required tags, and perfectly structured the document with parameters and comments!

Both Google's Agent Development Kit (ADK) and the Microsoft Agent Framework (MAF) embrace the concept of "Agent Skills" to inject modular, domain-specific behavior into LLMs. While they share the underlying philosophy, there are notable differences in how they structure and execute these skills.

### Skill Discovery and Registration
- **MAF**: Uses the `FileAgentSkillsProvider` class. You simply point this provider to a root `skills/` directory, and it automatically discovers and indexes all sub-directories containing a SKILL.md file. It's a highly declarative, "drop-in" approach.
- **ADK**: Uses direct loading mechanisms like `load_skill_from_dir()`. You explicitly load each skill directory into a variable, then bundle them together using a `SkillToolset` wrapper before passing them to the agent. ADK also natively supports initializing "Inline Skills" directly from Python code, without requiring a directory structure.

### Progressive Disclosure
- **MAF**: Strictly follows the Agent Skills specification's progressive disclosure pattern. It "advertises" the skill's name and description (from the YAML frontmatter) in the system prompt. The agent must then consciously choose to read the full SKILL.md and subsequent `references/` files using specific tools provided automatically by the `FileAgentSkillsProvider`.
- **ADK**: Inherently more aggressive with its context window. When an ADK agent determines it needs a skill based on the `SkillToolset`, it is more likely to eagerly load the primary instruction set into the context, reducing the multi-tool-call overhead but consuming more token budget upfront.

### Integration with Core Tools
- **MAF**: Merges skills via `context_providers`. The skills layer is a system that provides context and tools on demand, cleanly separating standard Python functional tools (like our `validate_bicep function) from domain-knowledge skills.
- **ADK**: Treats skills identically to functional tools. Both skills and Python functions are grouped together inside the `tools=[]` array when initializing the `LlmAgent`.

Ultimately, both frameworks provide an excellent way to organize agent logic, avoiding the anti-pattern of maintaining a monolithic 5,000-line system prompts.

