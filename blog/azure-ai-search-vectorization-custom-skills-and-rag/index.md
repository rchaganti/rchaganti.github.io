# Azure AI Search - Vectorization, Custom Skills, and RAG


In the previous article, we built enrichment pipelines that extract structured metadata from raw content using built-in cognitive skills. Language codes, key phrases, and entity names made our documents more searchable and filterable, but they still operated in the full-text search world.

In this article, we cross into vector territory. We will chunk documents using the Text Split skill, generate embeddings with Azure OpenAI, store them in a vector-enabled index, and run both vector and hybrid queries. We will also build a custom skill backed by an Azure Function and close with a Python SDK teaser. By the end, you will have a working chunk-and-embed pipeline, which is the foundation for RAG with Azure AI Search.

## Setting Up the Environment

We will reuse the search service and storage account from the previous articles, and add Azure OpenAI variables for the embedding skill.

```powershell
# Search service details (from previous articles)
$searchServiceName = "rc-srch-demo"
$resourceGroup = "ai-search-demo"
$searchEndpoint = "https://$searchServiceName.search.windows.net"

$apiKey = (az search admin-key show `
    --service-name $searchServiceName `
    --resource-group $resourceGroup `
    --query primaryKey -o tsv)

$apiVersion = "2024-07-01"
$headers = @{
    "Content-Type" = "application/json"
    "api-key"      = $apiKey
}

# Azure OpenAI details
$openAIEndpoint = "https://rc-openai-demo.openai.azure.com"
$openAIDeployment = "text-embedding-3-small"
$openAIModelName = "text-embedding-3-small"
$openAIKey = "<your-azure-openai-key>"

# Storage account (from Part 2)
$storageAccount = "rcaisearchdemo"
$storageConnection = (az storage account show-connection-string `
    --name $storageAccount `
    --resource-group $resourceGroup `
    --query connectionString -o tsv)
```

This article assumes you have an Azure OpenAI resource provisioned with a `text-embedding-3-small` model deployed. Update the variables above with your endpoint, deployment name, and key.

## Text Chunking for RAG

When you use a large language model to answer questions, you need to provide relevant context. But LLMs have token limits, and embedding models have even tighter ones (typically 8,192 tokens for `text-embedding-3-small`). You cannot just throw an entire document at an embedding model. You need to break it into smaller, semantically meaningful chunks.

Azure AI Search provides the **Text Split** skill for this purpose. It is a utility skill (non-billable) that splits text into pages of a configurable length.

### Understanding Chunking Parameters

The Text Split skill has several important parameters:

- **textSplitMode**: Either `pages` (split by character count) or `sentences` (split by sentence boundaries). Use `pages` for embedding scenarios.
- **maximumPageLength**: The maximum number of characters per chunk. The default is 5,000.
- **pageOverlapLength**: The number of characters from the end of one chunk that are repeated at the beginning of the next. This overlap preserves context at chunk boundaries.
- **maximumPagesToTake**: Limits how many chunks are generated per document. Useful for staying within embedding model quotas.

A common configuration for RAG is `maximumPageLength` of 2,000 characters with a `pageOverlapLength` of 500. This produces chunks that are roughly 500 tokens, well within the limits of most embedding models, while the overlap ensures that information spanning chunk boundaries is not lost.

## Creating the Vector Index

The index for chunked and vectorized content looks different from what we have built so far. Each chunk becomes its own document in the index, with a `parent_id` field linking it back to the source document. The index also includes a vector field and a `vectorSearch` configuration.

```powershell
$vectorIndex = @"
{
    "name": "articles-vector",
    "fields": [
        {
            "name": "chunk_id",
            "type": "Edm.String",
            "key": true,
            "searchable": false,
            "filterable": true
        },
        {
            "name": "parent_id",
            "type": "Edm.String",
            "searchable": false,
            "filterable": true
        },
        {
            "name": "title",
            "type": "Edm.String",
            "searchable": true,
            "filterable": false,
            "sortable": true
        },
        {
            "name": "chunk",
            "type": "Edm.String",
            "searchable": true,
            "analyzer": "en.lucene"
        },
        {
            "name": "chunk_vector",
            "type": "Collection(Edm.Single)",
            "searchable": true,
            "dimensions": 1536,
            "vectorSearchProfile": "default-vector-profile"
        }
    ],
    "vectorSearch": {
        "algorithms": [
            {
                "name": "default-hnsw",
                "kind": "hnsw",
                "hnswParameters": {
                    "m": 4,
                    "efConstruction": 400,
                    "efSearch": 500,
                    "metric": "cosine"
                }
            }
        ],
        "profiles": [
            {
                "name": "default-vector-profile",
                "algorithm": "default-hnsw"
            }
        ]
    }
}
"@

Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $vectorIndex | ConvertTo-Json -Depth 10
```

There are several new concepts in this index definition.

The `chunk_vector` field is of type `Collection(Edm.Single)`, which stores an array of single-precision floating-point numbers. This is the vector embedding. The `dimensions` property must match the output dimensions of your embedding model (`text-embedding-3-small` produces 1,536-dimensional vectors by default). The `vectorSearchProfile` links this field to a vector search configuration.

The `vectorSearch` section defines the algorithm and profile. We use **HNSW** (Hierarchical Navigable Small World), which is the most common algorithm for approximate nearest neighbor search. The parameters control the index build quality (`m` is the number of bi-directional links, `efConstruction` controls index quality during build, `efSearch` controls query-time accuracy). The `cosine` metric is standard for text embeddings.

The `chunk_id` is the document key for each chunk. When we use index projections, Azure AI Search generates these keys automatically by combining a hash, the parent document key, and the chunk index.

## Creating the Chunking and Embedding Skillset

This skillset chains two operations: text splitting and embedding generation. Index projections defined within the skillset handle the one-to-many mapping from source documents to chunk documents.

```powershell
$vectorSkillset = @"
{
    "name": "articles-vector-skillset",
    "description": "Chunks text and generates vector embeddings",
    "skills": [
        {
            "@odata.type": "#Microsoft.Skills.Text.SplitSkill",
            "name": "text-split",
            "context": "/document",
            "inputs": [
                { "name": "text", "source": "/document/content" }
            ],
            "outputs": [
                { "name": "textItems", "targetName": "pages" }
            ],
            "textSplitMode": "pages",
            "maximumPageLength": 2000,
            "pageOverlapLength": 500
        },
        {
            "@odata.type": "#Microsoft.Skills.Text.AzureOpenAIEmbeddingSkill",
            "name": "embedding",
            "context": "/document/pages/*",
            "inputs": [
                { "name": "text", "source": "/document/pages/*" }
            ],
            "outputs": [
                { "name": "embedding", "targetName": "chunk_vector" }
            ],
            "resourceUri": "$openAIEndpoint",
            "deploymentId": "$openAIDeployment",
            "modelName": "$openAIModelName",
            "apiKey": "$openAIKey"
        }
    ],
    "indexProjections": {
        "selectors": [
            {
                "targetIndexName": "articles-vector",
                "parentKeyFieldName": "parent_id",
                "sourceContext": "/document/pages/*",
                "mappings": [
                    { "name": "chunk", "source": "/document/pages/*" },
                    { "name": "chunk_vector", "source": "/document/pages/*/chunk_vector" },
                    { "name": "title", "source": "/document/title" }
                ]
            }
        ],
        "parameters": {
            "projectionMode": "generatedKeyAsId"
        }
    }
}
"@

Invoke-RestMethod `
    -Uri "$searchEndpoint/skillsets?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $vectorSkillset | ConvertTo-Json -Depth 10
```

This skillset introduces several important concepts.

The **Text Split skill** runs at the `/document` context and produces an array of text chunks at `/document/pages/*`. Each chunk is up to 2,000 characters, with 500 characters of overlap with the previous chunk.

The **Azure OpenAI Embedding skill** runs at the `/document/pages/*` context, which means it executes once per chunk. For each chunk, it sends the text to your Azure OpenAI deployment and writes the resulting vector to `/document/pages/*/chunk_vector`.

The **index projections** section is how Azure AI Search handles the one-to-many pattern. A single source document produces multiple chunks, and each chunk needs to be its own document in the search index. The `selectors` array defines where and how to project the chunks:

- `targetIndexName`: The index to write chunks to.
- `parentKeyFieldName`: The field in the target index that stores the parent document's key, linking each chunk back to its source.
- `sourceContext`: The path in the enriched document tree that defines each "child" document. Here, `/document/pages/*` means each page becomes a separate document.
- `mappings`: The field-level mappings from enrichment tree nodes to index fields. Notice how `title` comes from `/document/title` (the parent level), while `chunk` and `chunk_vector` come from `/document/pages/*` (the chunk level). This is how parent fields get repeated for each chunk.

The `projectionMode` of `generatedKeyAsId` tells Azure AI Search to auto-generate the `chunk_id` for each projected document.

## Creating the Indexer for Vectorization

The indexer for this pipeline is simpler than you might expect, as the index projections handle field routing. We do not need output field mappings when using projections.

```powershell
# Create the data source (reusing the articles container from Part 2)
$dataSource = @"
{
    "name": "articles-vector-ds",
    "type": "azureblob",
    "credentials": {
        "connectionString": "$storageConnection"
    },
    "container": {
        "name": "articles"
    }
}
"@

Invoke-RestMethod `
    -Uri "$searchEndpoint/datasources?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $dataSource | ConvertTo-Json -Depth 5

# Create the indexer
$vectorIndexer = @"
{
    "name": "articles-vector-indexer",
    "dataSourceName": "articles-vector-ds",
    "targetIndexName": "articles-vector",
    "skillsetName": "articles-vector-skillset",
    "parameters": {
        "configuration": {
            "parsingMode": "json",
            "dataToExtract": "contentAndMetadata"
        }
    },
    "fieldMappings": [],
    "outputFieldMappings": []
}
"@

Invoke-RestMethod `
    -Uri "$searchEndpoint/indexers?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $vectorIndexer | ConvertTo-Json -Depth 5
```

Check the status and wait for it to complete.

```powershell
$status = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexers/articles-vector-indexer/status?api-version=$apiVersion" `
    -Method Get `
    -Headers $headers

$status.lastResult | ConvertTo-Json -Depth 5
```

## Querying with Vectors

With the chunks indexed, we can now run vector and hybrid queries. Let us start with a pure vector search.

```powershell
# First, generate a query vector using Azure OpenAI
$queryText = "How does RAG reduce hallucination?"
$embeddingResponse = Invoke-RestMethod `
    -Uri "$openAIEndpoint/openai/deployments/$openAIDeployment/embeddings?api-version=2024-06-01" `
    -Method Post `
    -Headers @{
        "Content-Type" = "application/json"
        "api-key"      = $openAIKey
    } `
    -Body (@{
        input = $queryText
        model = $openAIModelName
    } | ConvertTo-Json)

$queryVector = $embeddingResponse.data[0].embedding

# Run a vector search
$vectorQuery = @{
    search = ""
    vectorQueries = @(
        @{
            kind = "vector"
            vector = $queryVector
            fields = "chunk_vector"
            k = 3
            exhaustive = $false
        }
    )
    select = "title, chunk, parent_id"
} | ConvertTo-Json -Depth 5

$results = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/articles-vector/docs/search?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $vectorQuery

$results.value | ConvertTo-Json -Depth 5
```

The vector query sends the search as an empty string (because we are not doing full-text search) and instead provides a `vectorQueries` array. The `k` parameter controls how many nearest neighbors to return. The `fields` parameter specifies which vector field to search against.

For **hybrid search** (combining full-text and vector), simply add text to the `search` parameter:

```powershell
$hybridQuery = @{
    search = "RAG hallucination"
    vectorQueries = @(
        @{
            kind = "vector"
            vector = $queryVector
            fields = "chunk_vector"
            k = 3
            exhaustive = $false
        }
    )
    select = "title, chunk, parent_id"
} | ConvertTo-Json -Depth 5

$results = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/articles-vector/docs/search?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $hybridQuery

$results.value | ConvertTo-Json -Depth 5
```

Hybrid search combines the relevance scores from both the full-text and vector search engines using Reciprocal Rank Fusion (RRF). This often produces better results than either method alone because it captures both lexical matches (exact keyword hits) and semantic matches (conceptually related content).

## Custom Skills with Azure Functions

Built-in skills cover many common scenarios, but sometimes you need custom processing logic. Azure AI Search supports custom skills via the **Web API** skill type, which calls an HTTP endpoint that you host. The most common approach is to use an Azure Function.

The custom skill interface follows a strict request-response contract. Azure AI Search sends a batch of records to your endpoint, and your function processes each one and returns the results.

### The Custom Skill Interface

The request body from Azure AI Search looks like this:

```json
{
    "values": [
        {
            "recordId": "0",
            "data": {
                "text": "Some input text from the enrichment tree"
            }
        }
    ]
}
```

Your function must return a response in this format:

```json
{
    "values": [
        {
            "recordId": "0",
            "data": {
                "result": "Your processed output"
            },
            "errors": [],
            "warnings": []
        }
    ]
}
```

The `recordId` must match between the request and the response. Each record is processed independently, and the function must handle all records in the batch.

### Building the Azure Function

Let us create a custom skill that calculates a readability score and word count for each document. This demonstrates the pattern without requiring external dependencies.

Create the function app:

```powershell
$functionApp = "func-aisearch-skills"

az functionapp create `
    --name $functionApp `
    --resource-group $resourceGroup `
    --consumption-plan-location eastus `
    --runtime python `
    --runtime-version 3.11 `
    --functions-version 4 `
    --storage-account $storageAccount `
    --os-type Linux
```

Here is the Python code for the custom skill function. Create a file named `function_app.py`:

```python
import azure.functions as func
import json
import re

app = func.FunctionApp()

@app.route(route="analyze-text", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
def analyze_text(req: func.HttpRequest) -> func.HttpResponse:
    """
    Custom skill that calculates word count and readability metrics.
    Follows the Azure AI Search custom skill interface contract.
    """
    try:
        body = req.get_json()
    except ValueError:
        return func.HttpResponse(
            json.dumps({"values": []}),
            status_code=400,
            mimetype="application/json"
        )

    results = []
    for record in body.get("values", []):
        record_id = record.get("recordId")
        text = record.get("data", {}).get("text", "")

        try:
            words = text.split()
            word_count = len(words)

            sentences = re.split(r'[.!?]+', text)
            sentences = [s.strip() for s in sentences if s.strip()]
            sentence_count = max(len(sentences), 1)

            avg_words_per_sentence = word_count / sentence_count

            if avg_words_per_sentence <= 15:
                readability = "easy"
            elif avg_words_per_sentence <= 25:
                readability = "moderate"
            else:
                readability = "complex"

            results.append({
                "recordId": record_id,
                "data": {
                    "wordCount": word_count,
                    "sentenceCount": sentence_count,
                    "readability": readability
                },
                "errors": [],
                "warnings": []
            })
        except Exception as e:
            results.append({
                "recordId": record_id,
                "data": {},
                "errors": [{"message": str(e)}],
                "warnings": []
            })

    return func.HttpResponse(
        json.dumps({"values": results}),
        mimetype="application/json"
    )
```

The `requirements.txt` for the function:

```
azure-functions
```

Deploy the function to Azure:

```powershell
# Deploy (from the function project directory)
func azure functionapp publish $functionApp
```

After deployment, get the function URL with the key:

```powershell
$functionUrl = "https://$functionApp.azurewebsites.net/api/analyze-text"
$functionKey = (az functionapp keys list `
    --name $functionApp `
    --resource-group $resourceGroup `
    --query functionKeys.default -o tsv)
```

### Wiring the Custom Skill into a Skillset

Now add the custom skill to a skillset using the Web API skill type.

```powershell
$customSkillset = @"
{
    "name": "articles-custom-skillset",
    "description": "Built-in cognitive skills plus custom readability analysis",
    "skills": [
        {
            "@odata.type": "#Microsoft.Skills.Text.LanguageDetectionSkill",
            "name": "language-detection",
            "context": "/document",
            "inputs": [
                { "name": "text", "source": "/document/content" }
            ],
            "outputs": [
                { "name": "languageCode", "targetName": "languageCode" }
            ]
        },
        {
            "@odata.type": "#Microsoft.Skills.Text.KeyPhraseExtractionSkill",
            "name": "key-phrase-extraction",
            "context": "/document",
            "inputs": [
                { "name": "text", "source": "/document/content" },
                { "name": "languageCode", "source": "/document/languageCode" }
            ],
            "outputs": [
                { "name": "keyPhrases", "targetName": "keyPhrases" }
            ]
        },
        {
            "@odata.type": "#Microsoft.Skills.Custom.WebApiSkill",
            "name": "readability-analysis",
            "context": "/document",
            "uri": "$functionUrl?code=$functionKey",
            "httpMethod": "POST",
            "timeout": "PT30S",
            "batchSize": 4,
            "inputs": [
                { "name": "text", "source": "/document/content" }
            ],
            "outputs": [
                { "name": "wordCount", "targetName": "wordCount" },
                { "name": "readability", "targetName": "readability" }
            ]
        }
    ]
}
"@

Invoke-RestMethod `
    -Uri "$searchEndpoint/skillsets?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $customSkillset | ConvertTo-Json -Depth 5
```

The Web API skill has a few parameters specific to custom skills. The `uri` is the full URL including the function key. The `timeout` controls how long Azure AI Search waits for a response (default is 30 seconds). The `batchSize` controls how many records are sent per request (default is 1, maximum is 1,000). Increasing the batch size can improve throughput if your function handles concurrency well.

To use this skillset, you would create an index with `wordCount` (Edm.Int32) and `readability` (Edm.String) fields, and add the corresponding output field mappings to the indexer.

## Python SDK

Throughout this series, we have used PowerShell and the REST API to keep things at the infrastructure level. The Python SDK (`azure-search-documents`) provides a more ergonomic interface for application-level integration. Here is a quick glimpse of how you can build the same cognitive skill set using Python.

```python
from azure.search.documents.indexes import SearchIndexerClient
from azure.search.documents.indexes.models import (
    SearchIndexerSkillset,
    LanguageDetectionSkill,
    KeyPhraseExtractionSkill,
    EntityRecognitionSkill,
    InputFieldMappingEntry,
    OutputFieldMappingEntry,
)
from azure.core.credentials import AzureKeyCredential

client = SearchIndexerClient(
    endpoint="https://rc-srch-demo.search.windows.net",
    credential=AzureKeyCredential("<your-search-api-key>"),
)

skillset = SearchIndexerSkillset(
    name="articles-cognitive-skillset-py",
    description="Same skillset, built with Python",
    skills=[
        LanguageDetectionSkill(
            name="language-detection",
            context="/document",
            inputs=[InputFieldMappingEntry(name="text", source="/document/content")],
            outputs=[OutputFieldMappingEntry(name="languageCode", target_name="languageCode")],
        ),
        KeyPhraseExtractionSkill(
            name="key-phrase-extraction",
            context="/document",
            inputs=[
                InputFieldMappingEntry(name="text", source="/document/content"),
                InputFieldMappingEntry(name="languageCode", source="/document/languageCode"),
            ],
            outputs=[OutputFieldMappingEntry(name="keyPhrases", target_name="keyPhrases")],
        ),
        EntityRecognitionSkill(
            name="entity-recognition",
            context="/document",
            categories=["Organization"],
            inputs=[
                InputFieldMappingEntry(name="text", source="/document/content"),
                InputFieldMappingEntry(name="languageCode", source="/document/languageCode"),
            ],
            outputs=[OutputFieldMappingEntry(name="organizations", target_name="organizations")],
        ),
    ],
)

result = client.create_skillset(skillset)
print(f"Created skillset: {result.name}")
```

The SDK wraps the same REST API we have been using, but with typed classes and IDE autocompletion. We will explore the Python SDK in greater depth in the next article, when we build a complete RAG application.

## Cleaning Up

To remove the resources created in this article:

```powershell
# Delete indexers
Invoke-RestMethod `
    -Uri "$searchEndpoint/indexers/articles-vector-indexer?api-version=$apiVersion" `
    -Method Delete `
    -Headers $headers

# Delete skillsets
foreach ($name in "articles-vector-skillset", "articles-custom-skillset") {
    Invoke-RestMethod `
        -Uri "$searchEndpoint/skillsets/${name}?api-version=$apiVersion" `
        -Method Delete `
        -Headers $headers
}

# Delete data sources
Invoke-RestMethod `
    -Uri "$searchEndpoint/datasources/articles-vector-ds?api-version=$apiVersion" `
    -Method Delete `
    -Headers $headers

# Delete indexes
Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/articles-vector?api-version=$apiVersion" `
    -Method Delete `
    -Headers $headers

# Delete function app (optional)
az functionapp delete `
    --name func-aisearch-skills `
    --resource-group $resourceGroup
```

## Summary

In this article, we moved from full-text enrichment into the vector and RAG world. We covered text chunking with the Text Split skill and why chunk size and overlap matter for embedding quality. We built a complete, integrated vectorization pipeline using the Azure OpenAI Embedding skill and index projections for one-to-many indexing, in which each source document produces multiple chunk documents with their own vector embeddings. We ran both pure-vector and hybrid queries against the chunked content to see how Reciprocal Rank Fusion combines lexical and semantic relevance.

We also built a custom skill using Azure Functions, walking through the request-response contract, the Python function code, and the Web API skill configuration within the skill set. And we got a first look at the Python SDK as an alternative to the REST API.

Across this four-part series, we have gone from provisioning a search service to building a production-ready RAG pipeline. In the next article, we will bring all of this together by building a complete RAG application with the Python SDK and connecting it to an agent framework.

