# Azure AI Search - Getting Started


I have [written about using the Azure OpenAI API](https://ravichaganti.com/series/azure-openai/) and interacting with it in Python. I have been experimenting with agentic AI systems for a while now, and one thing that keeps coming up often is the need for a robust retrieval layer. Agents are nothing without a proper context. Whether you are building a RAG-based chatbot, an enterprise search application, or an AI agent that needs to ground its responses in your proprietary data, the retrieval component is what separates a prototype from a production system. Azure AI Search (formerly Azure Cognitive Search) is Microsoft's answer to this challenge, and it has evolved significantly to become a core building block in the Microsoft AI ecosystem.

In this article, we will explore why you need Azure AI Search, what it is, the key features it offers, and how to provision it using Bicep and Azure CLI.

## Why Azure AI Search?

If you have worked with Large Language Models (LLMs), you already know that they are remarkably good at generating text but have a fundamental limitation -- they can only work with the knowledge they were trained on. Ask an LLM about your company's internal policies, product catalog, or customer data, and it will either hallucinate an answer or tell you it doesn't have that information. This is where Retrieval-Augmented Generation (RAG) comes in.

RAG is the pattern where you retrieve relevant information from your own data sources and provide it as context to the LLM before it generates a response. The quality of your RAG system is directly proportional to the quality of your retrieval layer. If your retrieval layer returns irrelevant or incomplete information, the LLM will produce poor answers, regardless of its capabilities. I have seen this firsthand while building agentic systems -- the search component is the most critical piece to get right.

Azure AI Search provides a fully managed, cloud-hosted search service that is purpose-built for this scenario. It sits between your raw data sources and your AI applications, providing the retrieval layer that connects your data to AI. Unlike building your own search infrastructure with something like Elasticsearch or OpenSearch, Azure AI Search is a managed service that handles scaling, security, and operations for you. This means you can focus on building your application rather than managing infrastructure.

There are a few specific reasons why Azure AI Search makes sense in the Microsoft AI ecosystem:

- It integrates natively with Microsoft Foundry (formerly Azure AI Foundry), Azure OpenAI Service, and the broader Azure platform. If you are already using Azure for your AI workloads, Azure AI Search slots in seamlessly.
- It supports multiple data sources out of the box, including Azure Blob Storage, Azure Cosmos DB, Microsoft SharePoint, Microsoft OneLake, and others. You don't need to build custom connectors for the most common enterprise data stores.
- It offers both classic search (for traditional search scenarios) and agentic retrieval (for AI agent workflows), making it versatile enough to handle everything from a simple website search to complex multi-agent orchestration.
- Enterprise security, compliance, and governance are built in through Microsoft Entra, Azure Private Link, document-level access control, and role-based access.

## What is Azure AI Search?

As mentioned earlier, Azure AI Search is a fully managed, cloud-hosted information retrieval service. At its core, it unifies access to enterprise and web content, enabling agents and LLMs to use context, chat history, and multi-source signals to produce reliable, grounded answers. The service has had multiple names over the years: Azure Search, then Azure Cognitive Search (October 2019), and was renamed to Azure AI Search in November 2023 to align with the broader Azure AI branding.

When you create an [Azure AI Search](https://azure.microsoft.com/en-us/products/ai-services/ai-search) service, you get access to two primary retrieval engines.

- **Classic Search** is an index-first retrieval model designed for predictable, low-latency queries. Each query targets a single predefined search index and returns ranked documents in a single request-response cycle. There is no LLM-assisted planning or synthesis during retrieval. This is the traditional search model most developers are familiar with, and it works well for scenarios such as website search, product catalogs, and document discovery. Classic search has two primary workloads. Indexing loads content into a search index, making it searchable. Internally, inbound text is tokenized and stored in inverted indexes, while inbound vectors are stored in vector indexes. Azure AI Search can only index JSON documents, so you either push JSON documents directly using the push method or use the pull method with indexers to retrieve and serialize data from supported sources into JSON. Querying then targets the populated index. You send query requests from your client application, and the service returns ranked results.
- **Agentic Retrieval** is the newer addition and is designed for complex agent-to-agent workflows. Instead of targeting a single search index, each query targets a knowledge base that represents a complete domain of knowledge. The knowledge base consists of one or more knowledge sources, an optional LLM for query planning and answer synthesis, and parameters that govern retrieval behavior. When a query comes in, it undergoes planning, decomposition into focused sub-queries, parallel retrieval from knowledge sources, semantic reranking, and results merging. This model is specifically optimized for AI agent consumption and is currently in public preview.

The key difference is this -- classic search gives you raw search results that your application processes, while agentic retrieval gives you an LLM-formulated answer along with source references and an activity log. For agentic AI scenarios, such as those we have been building with frameworks like the Microsoft Agent Framework and Google ADK, agentic retrieval is the natural fit.

## Key Features

Azure AI Search [offers a comprehensive set of features](https://learn.microsoft.com/en-us/azure/search/search-features-list) across indexing, querying, and AI enrichment. Here is a look at the capabilities that matter most when building AI-powered applications.

- **Full-text, Vector, Hybrid, and Multimodal Search**: Azure AI Search supports multiple search modalities. Full-text search uses traditional keyword matching with BM25 ranking. Vector search enables similarity-based retrieval using embeddings, which is essential in RAG scenarios where natural language queries must match semantically similar content. Hybrid search combines both text and vector search in a single request, merging results using Reciprocal Rank Fusion (RRF). This is particularly useful because vector search excels at retrieving information from natural-language queries, while full-text search is better at finding specific data such as names or product codes. Multimodal search extends this further by allowing you to query content containing both text and images in a single pipeline.
- **AI Enrichment**: During indexing, Azure AI Search can apply cognitive skills to enrich your content. This includes chunking large documents into smaller pieces, generating vector embeddings, applying OCR to extract text from images and scanned documents, performing language detection, sentiment analysis, key phrase extraction, and other LLM-assisted transformations. The enrichment pipeline transforms raw, unstructured content into structured, searchable data without you having to build these processing steps yourself. 
- **Semantic Ranker**: The semantic ranker (renamed from semantic search in November 2023) provides an L2 re-ranking layer that uses language understanding models to improve the relevance of search results. It goes beyond keyword matching to understand the intent behind queries and re-rank results accordingly. 
- **Integrated Vectorization**: Azure AI Search provides built-in vectorization capabilities so you don't need to manage a separate embedding pipeline. You can use the import wizard in the Azure portal to automate your RAG pipeline with built-in parsing, chunking, enrichment, and embedding in a single flow.
- **Knowledge Sources and Knowledge Bases**: For agentic retrieval scenarios, you can create knowledge bases that point to one or more knowledge sources. Knowledge sources can be indexed (using the same indexing engine as classic search) or remote (queried live without indexing). This means you can combine pre-indexed content with live data from SharePoint, OneLake, or other sources in a single retrieval operation.
- **Enterprise Security**: Azure AI Search provides encryption at rest and in transit, Microsoft Entra authentication, role-based access control, document-level security trimming, Azure Private Link for network isolation, and customer-managed encryption keys through Azure Key Vault. These are built into the service. 
- **Multiple Data Source Connectors**: The service provides built-in indexers for Azure Blob Storage, Azure Cosmos DB, Azure SQL Database, Microsoft SharePoint, Microsoft OneLake, and other data sources. Indexers can run on a schedule to keep your search index synchronized with the source data.
- **Pricing Tiers**: Azure AI Search offers a range of pricing tiers, from Free (for evaluation and small projects) through Basic, Standard (S1, S2, S3), and Storage Optimized (L1, L2). Each tier provides different storage, index, and throughput limits. The Free tier is useful for prototyping, while production workloads typically require Basic or Standard tiers, depending on the scale and performance requirements.

## Provisioning Azure AI Search

Now that we understand what Azure AI Search is and what it offers, let us provision a search service using infrastructure as code. I prefer Bicep templates to do this.

Before we begin, ensure you have the following:

- An Azure subscription with appropriate permissions to create resources
- Azure CLI is installed and configured on your machine
- Bicep CLI (included with Azure CLI v2.20.0 and later)
- You are logged in using `az login`

### The Bicep Template

Let us create a Bicep template that provisions an Azure AI Search service with commonly needed configurations. Save the following as `main.bicep`.

```bicep
@description('Name of the Azure AI Search service. Must be globally unique, lowercase, and between 2-60 characters.')
@minLength(2)
@maxLength(60)
param serviceName string

@description('Location for the search service.')
param location string = resourceGroup().location

@description('The SKU of the search service.')
@allowed([
  'free'
  'basic'
  'standard'
  'standard2'
  'standard3'
  'storage_optimized_l1'
  'storage_optimized_l2'
])
param skuName string = 'basic'

@description('The number of replicas for the search service. Increase for higher query throughput and availability.')
@minValue(1)
@maxValue(12)
param replicaCount int = 1

@description('The number of partitions for the search service. Increase for higher storage and indexing throughput.')
@minValue(1)
@maxValue(12)
param partitionCount int = 1

@description('Whether to enable semantic search.')
@allowed([
  'disabled'
  'free'
  'standard'
])
param semanticSearch string = 'free'

@description('Set to enabled to allow public network access.')
@allowed([
  'enabled'
  'disabled'
])
param publicNetworkAccess string = 'enabled'

@description('Authentication options for the search service.')
@allowed([
  'aadOrApiKey'
  'apiKeyOnly'
])
param authOption string = 'aadOrApiKey'

@description('Tags to apply to the search service.')
param tags object = {}

resource searchService 'Microsoft.Search/searchServices@2025-05-01' = {
  name: serviceName
  location: location
  sku: {
    name: skuName
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    replicaCount: replicaCount
    partitionCount: partitionCount
    semanticSearch: semanticSearch
    publicNetworkAccess: publicNetworkAccess
    authOptions: authOption == 'aadOrApiKey' ? {
      aadOrApiKey: {
        aadAuthFailureMode: 'http401WithBearerChallenge'
      }
    } : {
      apiKeyOnly: {}
    }
  }
  tags: tags
}

output searchServiceId string = searchService.id
output searchServiceName string = searchService.name
output searchServiceEndpoint string = 'https://${searchService.name}.search.windows.net'
```

Let us look at some important aspects of this template.

The `Microsoft.Search/searchServices@2025-05-01` API version is the latest stable version available. We are using the `SystemAssigned` managed identity, which allows the search service to authenticate with other Azure services, such as Blob Storage or Cosmos DB, using role-based access control instead of connection strings.

The `semanticSearch` parameter enables the semantic ranker. Setting it to `free` gives you up to 1,000 semantic queries per month at no extra cost, which is useful for evaluation. For production workloads, set this to `standard`.

The `authOptions` configuration controls how clients authenticate with the search service. The `aadOrApiKey` option allows both Microsoft Entra authentication and API key authentication, providing flexibility during development while supporting enterprise security requirements. The `aadAuthFailureMode` set to `http401WithBearerChallenge` returns a proper 401 response with a bearer challenge header when Entra authentication fails, which is the recommended setting.

The `replicaCount` and `partitionCount` parameters control the scale of your search service. Replicas increase query throughput and availability (you need at least 2 replicas for read-only high availability and 3 for read-write high availability). Partitions increase storage capacity and indexing throughput.

### Deploying with Azure CLI

First, create a resource group if you don't already have one.

```bash
> az group create `
  --name ai-search-demo `
  --location eastus
```

Now, deploy the Bicep template. The service name must be globally unique and contain only lowercase letters, digits, or dashes.

```bash
> az deployment group create `
  --resource-group ai-search-demo `
  --template-file main.bicep `
  --parameters serviceName='rc-srch-demo' `
                skuName='basic' `
                semanticSearch='free' `
                replicaCount=1 `
                partitionCount=1
```

When the deployment finishes, you should see a message indicating the deployment succeeded. You can verify the deployment by listing the resources in the resource group.

```bash
> az resource list `
  --resource-group ai-search-demo `
  --output table
  Name          ResourceGroup    Location    Type                             Status
------------  ---------------  ----------  -------------------------------  ---------
rc-srch-demo  ai-search-demo   eastus      Microsoft.Search/searchServices  Succeeded
```

You can also retrieve the search service details using the Azure CLI.

```bash
> az search service show `
  --name rc-srch-demo `
  --resource-group ai-search-demo `
  --output json
```

To get the admin keys for the search service (which you will need for indexing operations), use the following command.

```bash
az search admin-key show `
  --service-name rc-srch-demo `
  --resource-group ai-search-demo `
  --output json
```

For query-only operations, you should use query keys instead of admin keys. You can create and list query keys using the following commands.

```bash
az search query-key create `
  --name "my-query-key" `
  --service-name rc-srch-demo `
  --resource-group ai-search-demo

az search query-key list `
  --service-name rc-srch-demo `
  --resource-group ai-search-demo `
  --output table
```

### Validating the Deployment

Once the deployment is complete, you can verify the search service endpoint is reachable by making a simple REST call.

```bash
$env:SEARCH_ENDPOINT="https://rc-srch-demo.search.windows.net"
$env:API_KEY=$(az search admin-key show `
  --service-name rc-srch-demo `
  --resource-group ai-search-demo `
  --query primaryKey -o tsv)

Invoke-RestMethod -Uri "$env:SEARCH_ENDPOINT/indexes?api-version=2024-07-01" `
  -Headers @{
    "api-key" = $env:API_KEY
    "Content-Type" = "application/json"
  }
```

This should return an empty list of indexes since we have not created any yet. In a future article, we will examine how to create indexes, load data, and build RAG pipelines with Azure AI Search.

### Cleaning Up

Azure AI Search is a billable resource even when idle. If you are done experimenting, delete the resource group to avoid charges.

```bash
az group delete `
  --name ai-search-demo `
  --yes --no-wait
```

## Summary

Azure AI Search is a fully managed retrieval service that provides the search infrastructure needed for both traditional search applications and modern AI-powered scenarios like RAG and agentic retrieval. It supports full-text, vector, hybrid, and multimodal search, integrates with the broader Microsoft AI ecosystem, and offers enterprise-grade security and compliance. Provisioning the service using Bicep and Azure CLI gives you repeatable, version-controlled infrastructure that can be integrated into your CI/CD pipelines.

In the next article in this series, we will dive into creating search indexes, loading documents, and building a complete RAG pipeline that connects Azure AI Search with Azure OpenAI to create a grounded chatbot experience.

