# Azure AI Search - AI Enrichment with Skillsets


In this series so far, we provisioned an Azure AI Search service and worked with indexes, documents, and queries. Everything we loaded was structured JSON, with the fields mapping neatly to the index schema. That is the happy path, but it is not reality.

In the real world, your data is messy. You have PDFs with embedded images, scanned documents with no machine-readable text, and text in multiple languages. This is where AI enrichment comes in. Azure AI Search lets you attach an AI pipeline to your indexer that transforms raw content during indexing, extracting structure and meaning from your documents before they land in the index.

In this article, we will build enrichment pipelines using built-in cognitive skills. We will chain together Language Detection, Key Phrase Extraction, and Entity Recognition, then add OCR and text merging for real PDF documents. By the end, you will have structured, searchable metadata extracted automatically from raw content, and you will see exactly how that metadata shows up in your search results. In the next article, we will build on this foundation with text chunking, vector embeddings, and custom skills for RAG scenarios.

Before we start building, it is worth understanding the architecture. An AI enrichment pipeline extends the indexer with a skill set, an ordered collection of skills that transform content during indexing.

The data flow looks like this:

1. The indexer connects to a data source and extracts documents (extracts text and images from PDFs, Office documents, etc.).
2. The extracted content is added to the enriched document tree, an in-memory data structure rooted at `/document`. The raw text is at `/document/content,` and extracted images are at `/document/normalized_images`.
3. Each skill in the skillset reads from one or more nodes in this tree, performs a transformation, and writes its output as a new node.
4. After all skills are executed, the indexer routes the enriched content to the search index.

The enriched document tree is the key concept. Every skill reads from and writes to this tree using path expressions. For example, the Language Detection skill reads from `/document/content` and writes a language code to a new node. A downstream skill, such as Key Phrase Extraction, can then read from `/document/content` and reference the detected language.

There is an important distinction between field mappings and output field mappings in the indexer. Field mappings move raw source data directly into index fields (like mapping `metadata_storage_name` to a `fileName` field). Output field mappings move enriched content, which is the skill outputs from the enriched document tree, into index fields. If you forget to add output field mappings for your skill outputs, the enriched data never reaches the index. This is the most common mistake when getting started with skillsets.

For examples in this article, we will reuse the search service from the previous articles.

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

# Storage account (from Part 2)
$storageAccount = "rcaisearchdemo"
$storageConnection = (az storage account show-connection-string `
    --name $storageAccount `
    --resource-group $resourceGroup `
    --query connectionString -o tsv)
```

## Built-in Cognitive Skills

Azure AI Search includes built-in skills that call Foundry Tools (formerly Azure Cognitive Services) behind the scenes. These include Language Detection, Entity Recognition, Key Phrase Extraction, Sentiment Analysis, OCR, PII Detection, and Text Translation. For small workloads (up to 20 transactions per indexer per day), these are free. For larger workloads, you attach a Foundry resource for billing.

Let us build a skillset that enriches our article data from Part 2. We will chain three skills together: Language Detection, Key Phrase Extraction, and Entity Recognition.

### Creating the Enriched Index

First, we need an index with fields to receive the enriched content. This extends the article's index from Part 2 with new fields for the skill outputs.

```powershell
$enrichedIndex = @"
{
    "name": "articles-enriched",
    "fields": [
        {
            "name": "id",
            "type": "Edm.String",
            "key": true,
            "searchable": false,
            "filterable": true
        },
        {
            "name": "title",
            "type": "Edm.String",
            "searchable": true,
            "sortable": true,
            "analyzer": "en.lucene"
        },
        {
            "name": "content",
            "type": "Edm.String",
            "searchable": true,
            "filterable": false,
            "sortable": false,
            "facetable": false,
            "analyzer": "en.lucene"
        },
        {
            "name": "author",
            "type": "Edm.String",
            "filterable": true,
            "sortable": true,
            "facetable": true
        },
        {
            "name": "category",
            "type": "Edm.String",
            "searchable": true,
            "filterable": true,
            "sortable": true,
            "facetable": true
        },
        {
            "name": "publishedDate",
            "type": "Edm.DateTimeOffset",
            "filterable": true,
            "sortable": true
        },
        {
            "name": "language",
            "type": "Edm.String",
            "filterable": true,
            "sortable": true
        },
        {
            "name": "keyPhrases",
            "type": "Collection(Edm.String)",
            "searchable": true,
            "filterable": true,
            "facetable": true
        },
        {
            "name": "organizations",
            "type": "Collection(Edm.String)",
            "searchable": true,
            "filterable": true,
            "facetable": true
        }
    ]
}
"@

Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $enrichedIndex | ConvertTo-Json -Depth 10
```

The new fields are `language` (a simple string), `keyPhrases` (a collection, since a document can have many key phrases), and organizations (also a collection of extracted organization names).

Note that the `content` field explicitly sets `filterable`, `sortable`, and `facetable` to `false`. This is important. When these properties are not specified, Azure AI Search defaults them to `true` for `Edm.String` fields. With filtering or sorting enabled, the service tries to index the entire field value as a single term. For short fields like `author` or `category`, this is fine. For the `content` field, which can contain thousands of words, the term exceeds the 32,766-byte limit, causing the indexer to fail with an error such as "Field 'content' contains a term that is too large to process." The fix is always the same: set `filterable`, `sortable`, and `facetable` to `false` on large text fields and let the analyzer handle tokenization for search.

### Creating the Skillset

Now for the skillset itself. Each skill has a `@odata.type` that identifies it, a `context` that defines the scope (usually `/document` for per-document processing), `inputs` that specify which nodes in the enriched document tree to read from, and `outputs` that define where to write the results.

```powershell
$skillset = @"
{
    "name": "articles-cognitive-skillset",
    "description": "Extracts language, key phrases, and organizations from articles",
    "skills": [
        {
            "@odata.type": "#Microsoft.Skills.Text.LanguageDetectionSkill",
            "name": "language-detection",
            "context": "/document",
            "inputs": [
                {
                    "name": "text",
                    "source": "/document/content"
                }
            ],
            "outputs": [
                {
                    "name": "languageCode",
                    "targetName": "languageCode"
                }
            ]
        },
        {
            "@odata.type": "#Microsoft.Skills.Text.KeyPhraseExtractionSkill",
            "name": "key-phrase-extraction",
            "context": "/document",
            "inputs": [
                {
                    "name": "text",
                    "source": "/document/content"
                },
                {
                    "name": "languageCode",
                    "source": "/document/languageCode"
                }
            ],
            "outputs": [
                {
                    "name": "keyPhrases",
                    "targetName": "keyPhrases"
                }
            ]
        },
        {
            "@odata.type": "#Microsoft.Skills.Text.V3.EntityRecognitionSkill",
            "name": "entity-recognition",
            "context": "/document",
            "categories": ["Organization"],
            "inputs": [
                {
                    "name": "text",
                    "source": "/document/content"
                },
                {
                    "name": "languageCode",
                    "source": "/document/languageCode"
                }
            ],
            "outputs": [
                {
                    "name": "organizations",
                    "targetName": "organizations"
                }
            ]
        }
    ]
}
"@

Invoke-RestMethod `
    -Uri "$searchEndpoint/skillsets?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $skillset | ConvertTo-Json -Depth 5
```

Notice the skill chaining. The Language Detection skill runs first and writes the detected language code to `/document/languageCode`. Both the Key Phrase Extraction and Entity Recognition skills reference this language code as an input. Azure AI Search figures out the execution order based on these input-output dependencies, so the Language Detection skill always runs before the skills that depend on its output.

The Entity Recognition skill uses the `categories` parameter to limit extraction to organizations only. Without this, it would extract all entity types (Person, Location, DateTime, etc.), which would require separate collection fields for each category.

### Creating the Data Source and Indexer

We need a data source pointing to our articles blob container and an indexer that ties everything together. The key addition is the `skillsetName` property on the indexer and the `outputFieldMappings` that route skill outputs to index fields.

```powershell
# Create the data source (reusing the articles container from Part 2)
$dataSource = @"
{
    "name": "articles-enriched-ds",
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

# Create the indexer with skillset
$indexer = @"
{
    "name": "articles-enriched-indexer",
    "dataSourceName": "articles-enriched-ds",
    "targetIndexName": "articles-enriched",
    "skillsetName": "articles-cognitive-skillset",
    "parameters": {
        "configuration": {
            "parsingMode": "json",
            "dataToExtract": "contentAndMetadata"
        }
    },
    "fieldMappings": [
        { "sourceFieldName": "id", "targetFieldName": "id" },
        { "sourceFieldName": "title", "targetFieldName": "title" },
        { "sourceFieldName": "content", "targetFieldName": "content" },
        { "sourceFieldName": "author", "targetFieldName": "author" },
        { "sourceFieldName": "category", "targetFieldName": "category" },
        { "sourceFieldName": "publishedDate", "targetFieldName": "publishedDate" }
    ],
    "outputFieldMappings": [
        { "sourceFieldName": "/document/languageCode", "targetFieldName": "language" },
        { "sourceFieldName": "/document/keyPhrases", "targetFieldName": "keyPhrases" },
        { "sourceFieldName": "/document/organizations", "targetFieldName": "organizations" }
    ]
}
"@

Invoke-RestMethod `
    -Uri "$searchEndpoint/indexers?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $indexer | ConvertTo-Json -Depth 5
```

The `fieldMappings` handle the raw source fields (just like in Part 2), and the `outputFieldMappings` handle the enriched fields produced by the skillset. The `sourceFieldName` in output field mappings uses the enriched document tree path.

Let us check the indexer status.

```powershell
> $status = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexers/articles-enriched-indexer/status?api-version=$apiVersion" `
    -Method Get `
    -Headers $headers

> $status.lastResult | ConvertTo-Json -Depth 5
{
    "status":  "success",
    ....
    "itemsProcessed":  3,
    "itemsFailed":  0,
    "initialTrackingState":  "{\r\n  \"lastFullEnumerationStartTime\": \"0001-01-01T00:00:00Z\",\r\n  \"lastAttemptedEnumerationStartTime\": \"2026-03-11T00:43:31.032Z\",\r\n  \"nameHighWaterMark\": null\r\n}",
    "finalTrackingState":  "{\"LastFullEnumerationStartTime\":\"2026-03-11T00:43:01.0326443+00:00\",\"LastAttemptedEnumerationStartTime\":\"2026-03-11T00:43:01.0326443+00:00\",\"NameHighWaterMark\":null}",
   ....
}
```

### Seeing Enrichment in Search Results

Now let us query the index and see what the enrichment actually produced. This is the payoff. Without enrichment, our articles only had the fields we loaded manually: title, content, author, category, and date. Now each document also has a detected language, extracted key phrases, and recognized organizations, all populated automatically by the skillset.

```powershell
$query = @"
{
    "search": "*",
    "select": "title, language, keyPhrases, organizations",
    "top": 2
}
"@

$results = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/articles-enriched/docs/search?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $query

$results.value | ConvertTo-Json -Depth 5
```

The response shows the enriched fields alongside the original data. Here is what a typical result looks like:

```json
[
    {
        "title": "Getting Started with Retrieval-Augmented Generation",
        "language": "en",
        "keyPhrases": [
            "Retrieval-Augmented Generation",
            "Large Language Models",
            "vector search",
            "knowledge base",
            "hallucination reduction",
            "semantic retrieval"
        ],
        "organizations": [
            "OpenAI",
            "Microsoft",
            "Azure"
        ]
    },
    {
        "title": "Understanding MCP Servers and Agent Tools",
        "language": "en",
        "keyPhrases": [
            "Model Context Protocol",
            "MCP servers",
            "agent tools",
            "client-server architecture",
            "tool integration"
        ],
        "organizations": [
            "Anthropic",
            "GitHub"
        ]
    }
]
```

Notice what happened. The raw `content` field was plain text with no structure. The skillset analyzed it and extracted structured metadata: `language` tells us the content is English, `keyPhrases` pulls out the important concepts, and `organizations` identifies company and product names. None of this data existed in the original documents. The enrichment pipeline created it.

### Querying Enriched Fields

The real power of enrichment shows up when you use these fields in queries. Because we defined `keyPhrases` and `organizations` as filterable and facetable, we can do things that were impossible with the raw content alone.

**Faceted search** gives you an aggregated view of what is in your index, which is perfect for building filter panels in a search UI.

```powershell
$query = @"
{
    "search": "*",
    "facets": ["keyPhrases,count:10", "organizations"],
    "count": true
}
"@

$results = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/articles-enriched/docs/search?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $query

Write-Output "Total documents: $($results.'@odata.count')"
$results.'@search.facets' | ConvertTo-Json -Depth 5
```

The facets response tells you how many documents mention each key phrase and organization:

```json
{
    "keyPhrases": [
        { "value": "Large Language Models", "count": 4 },
        { "value": "vector search", "count": 3 },
        { "value": "Retrieval-Augmented Generation", "count": 3 },
        { "value": "Azure AI Search", "count": 2 },
        { "value": "Model Context Protocol", "count": 2 },
        { "value": "agent tools", "count": 2 },
        { "value": "semantic retrieval", "count": 1 },
        { "value": "prompt engineering", "count": 1 }
    ],
    "organizations": [
        { "value": "Microsoft", "count": 5 },
        { "value": "OpenAI", "count": 3 },
        { "value": "Anthropic", "count": 2 },
        { "value": "GitHub", "count": 2 },
        { "value": "Google", "count": 1 }
    ]
}
```

This is the kind of data that drives a filter sidebar in a search application. A user could click "Anthropic" and see only documents that mention that organization, or narrow results to articles about "vector search."

**Filtering on enriched fields** lets you scope search results using the AI-extracted metadata.

```powershell
# Find all articles that mention Microsoft as an organization
$query = @"
{
    "search": "*",
    "filter": "organizations/any(o: o eq 'Microsoft')",
    "select": "title, organizations, keyPhrases"
}
"@

$results = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/articles-enriched/docs/search?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $query

$results.value | ConvertTo-Json -Depth 5
```

The `organizations/any()` lambda syntax filters on collection fields. This returns only documents where the Entity Recognition skill identified "Microsoft" as an organization in the text. You could not do this with a simple text search for "Microsoft" because that would also match documents where "Microsoft" appears in passing or in a different context (like "Microsoft Word document format").

**Combining full-text search with enriched filters** is where this pattern really shines:

```powershell
# Search for "retrieval" but only in articles that mention OpenAI
$query = @"
{
    "search": "retrieval",
    "filter": "organizations/any(o: o eq 'OpenAI')",
    "select": "title, keyPhrases, organizations",
    "queryType": "simple"
}
"@

$results = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/articles-enriched/docs/search?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $query

$results.value | ConvertTo-Json -Depth 5
```

This gives you the precision of structured filtering (only documents where the AI recognized OpenAI as an entity) combined with the flexibility of full-text search (relevance-ranked results for the query term "retrieval").

## Processing Real PDFs with OCR

So far we have worked with clean JSON documents. Now let us process actual PDF files to demonstrate document cracking and OCR. We will use two research papers: `context-engineering.pdf` and `attention-is-all-you-need.pdf`. These are good test cases because they contain multi-column layouts, figures, tables, and mathematical notation, which is exactly the kind of content that challenges a search pipeline.

### Uploading PDFs to Blob Storage

First, upload the PDFs to a new blob container.

```powershell
$pdfContainer = "research-papers"

az storage container create `
    --name $pdfContainer `
    --connection-string $storageConnection

# Upload the PDF files
foreach ($file in "context-engineering.pdf", "attention-is-all-you-need.pdf") {
    az storage blob upload `
        --container-name $pdfContainer `
        --file "./$file" `
        --name $file `
        --connection-string $storageConnection `
        --overwrite
}
```

### Creating the PDF Index

The index for PDF content differs from the articles index. PDFs do not have predefined fields such as `author` or `category`. Instead, we rely on blob metadata and the enrichment pipeline to populate the index. The `metadata_storage_name` field gives us the file name, and everything else comes from the skillset.

```powershell
$pdfIndex = @"
{
    "name": "research-papers",
    "fields": [
        {
            "name": "id",
            "type": "Edm.String",
            "key": true,
            "searchable": false,
            "filterable": true
        },
        {
            "name": "fileName",
            "type": "Edm.String",
            "searchable": true,
            "filterable": true,
            "sortable": true
        },
        {
            "name": "content",
            "type": "Edm.String",
            "searchable": true,
            "filterable": false,
            "sortable": false,
            "facetable": false,
            "analyzer": "en.lucene"
        },
        {
            "name": "language",
            "type": "Edm.String",
            "filterable": true,
            "sortable": true
        },
        {
            "name": "keyPhrases",
            "type": "Collection(Edm.String)",
            "searchable": true,
            "filterable": true,
            "facetable": true
        },
        {
            "name": "organizations",
            "type": "Collection(Edm.String)",
            "searchable": true,
            "filterable": true,
            "facetable": true
        },
        {
            "name": "persons",
            "type": "Collection(Edm.String)",
            "searchable": true,
            "filterable": true,
            "facetable": true
        }
    ]
}
"@

Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $pdfIndex | ConvertTo-Json -Depth 10
```

The `content` field explicitly sets `filterable`, `sortable`, and `facetable` to `false`. This is critical for PDF documents. When Azure AI Search cracks a PDF, the extracted text can be tens of thousands of words. If filtering or sorting is enabled on a string field, the service indexes the entire field value as a single term for those operations. Any term larger than 32,766 bytes causes the indexer to fail with "Field 'content' contains a term that is too large to process." You will frequently see this error when indexing PDFs, Word documents, or other large text. The fix is always the same: disable filtering, sorting, and faceting on large text fields and rely on the full-text search analyzer for tokenization.

### The OCR Skill and Text Merging

When Azure AI Search cracks a PDF, it extracts the machine-readable text and separates out any embedded images. But research papers often have figures, diagrams, and tables rendered as images. The OCR skill processes those extracted images and produces text. The Text Merger skill then combines the OCR output back with the original document text, so downstream skills work with the complete content.

```powershell
$pdfSkillset = @"
{
    "name": "research-papers-skillset",
    "description": "OCR, text merging, language detection, key phrases, and entity extraction for PDFs",
    "skills": [
        {
            "@odata.type": "#Microsoft.Skills.Vision.OcrSkill",
            "name": "ocr",
            "context": "/document/normalized_images/*",
            "inputs": [
                { "name": "image", "source": "/document/normalized_images/*" }
            ],
            "outputs": [
                { "name": "text", "targetName": "ocrText" }
            ]
        },
        {
            "@odata.type": "#Microsoft.Skills.Text.MergeSkill",
            "name": "merge-text",
            "context": "/document",
            "inputs": [
                { "name": "text", "source": "/document/content" },
                {
                    "name": "itemsToInsert",
                    "source": "/document/normalized_images/*/ocrText"
                }
            ],
            "outputs": [
                { "name": "mergedText", "targetName": "mergedContent" }
            ]
        },
        {
            "@odata.type": "#Microsoft.Skills.Text.LanguageDetectionSkill",
            "name": "language-detection",
            "context": "/document",
            "inputs": [
                { "name": "text", "source": "/document/mergedContent" }
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
                { "name": "text", "source": "/document/mergedContent" },
                { "name": "languageCode", "source": "/document/languageCode" }
            ],
            "outputs": [
                { "name": "keyPhrases", "targetName": "keyPhrases" }
            ]
        },
        {
            "@odata.type": "#Microsoft.Skills.Text.V3.EntityRecognitionSkill",
            "name": "entity-recognition",
            "context": "/document",
            "categories": ["Organization", "Person"],
            "inputs": [
                { "name": "text", "source": "/document/mergedContent" },
                { "name": "languageCode", "source": "/document/languageCode" }
            ],
            "outputs": [
                { "name": "organizations", "targetName": "organizations" },
                { "name": "persons", "targetName": "persons" }
            ]
        }
    ]
}
"@

Invoke-RestMethod `
    -Uri "$searchEndpoint/skillsets?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $pdfSkillset | ConvertTo-Json -Depth 5
```

There are a few things to note about this skillset. The OCR skill has its context set to `/document/normalized_images/*`, which means it executes once for each image in the document. The wildcard `*` acts as a for-each operator. The Text Merger skill then runs at the `/document` context and combines the original `content` with all the OCR text fragments.

After merging, downstream skills like Language Detection and Key Phrase Extraction work with the merged content, which includes both the original text and any text extracted from images. This means your search index captures everything in the document, not just the machine-readable text.

### Creating the Data Source and Indexer for PDFs

The indexer configuration for PDFs requires two specific settings: `dataToExtract` must be set to `contentAndMetadata` so we get the text and file metadata, and `imageAction` must be set to `generateNormalizedImages` to extract images for the OCR skill. Without the `imageAction` setting, images are silently ignored.

```powershell
# Data source for the research papers container
$pdfDataSource = @"
{
    "name": "research-papers-ds",
    "type": "azureblob",
    "credentials": {
        "connectionString": "$storageConnection"
    },
    "container": {
        "name": "research-papers"
    }
}
"@

Invoke-RestMethod `
    -Uri "$searchEndpoint/datasources?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $pdfDataSource | ConvertTo-Json -Depth 5

# Indexer with image extraction enabled
$pdfIndexer = @"
{
    "name": "research-papers-indexer",
    "dataSourceName": "research-papers-ds",
    "targetIndexName": "research-papers",
    "skillsetName": "research-papers-skillset",
    "parameters": {
        "configuration": {
            "dataToExtract": "contentAndMetadata",
            "imageAction": "generateNormalizedImages",
            "parsingMode": "default"
        }
    },
    "fieldMappings": [
        {
            "sourceFieldName": "metadata_storage_path",
            "targetFieldName": "id",
            "mappingFunction": { "name": "base64Encode" }
        },
        {
            "sourceFieldName": "metadata_storage_name",
            "targetFieldName": "fileName"
        }
    ],
    "outputFieldMappings": [
        { "sourceFieldName": "/document/mergedContent", "targetFieldName": "content" },
        { "sourceFieldName": "/document/languageCode", "targetFieldName": "language" },
        { "sourceFieldName": "/document/keyPhrases", "targetFieldName": "keyPhrases" },
        { "sourceFieldName": "/document/organizations", "targetFieldName": "organizations" },
        { "sourceFieldName": "/document/persons", "targetFieldName": "persons" }
    ]
}
"@

Invoke-RestMethod `
    -Uri "$searchEndpoint/indexers?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $pdfIndexer | ConvertTo-Json -Depth 5
```

A few things are different from the articles indexer. The `parsingMode` is `default` instead of `json` because PDFs are not JSON. The `id` field uses `metadata_storage_path` with a `base64Encode` mapping function because blob paths can contain characters that are not valid in document keys. The `content` field is mapped from `/document/mergedContent` (the merged OCR + text output) rather than `/document/content` (the raw cracked text), so our index gets the complete text including anything extracted from images.

Check the indexer status:

```powershell
$status = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexers/research-papers-indexer/status?api-version=$apiVersion" `
    -Method Get `
    -Headers $headers

$status.lastResult | ConvertTo-Json -Depth 5
```

When processing large PDFs, you may see warnings in the indexer status that say "Skill input 'text' was too large. Truncated text to '50000' characters". This is expected. Built-in cognitive skills have a 50,000-character input limit. For documents larger than that, the skill processes the first 50,000 characters and skips the rest. The key phrases and entities you get are still useful because the most important content is usually in the first half of a document. For complete coverage of very large documents, you would use the Text Split skill to chunk the content first; we will cover this in the next article.

### Seeing PDF Enrichment Results

Once the indexer completes, let us see what the enrichment pipeline extracted from our research papers.

```powershell
$query = @"
{
    "search": "*",
    "select": "fileName, language, keyPhrases, organizations, persons",
    "top": 2
}
"@

$results = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/research-papers/docs/search?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $query

$results.value | ConvertTo-Json -Depth 5
```

Here is what you should see:

```json
[
    {
        "fileName": "attention-is-all-you-need.pdf",
        "language": "en",
        "keyPhrases": [
            "attention mechanism",
            "self-attention",
            "Transformer",
            "sequence transduction",
            "encoder-decoder architecture",
            "multi-head attention",
            "positional encoding",
            "machine translation",
            "BLEU score",
            "parallelization"
        ],
        "organizations": [
            "Google",
            "Google Brain",
            "University of Toronto"
        ],
        "persons": [
            "Ashish Vaswani",
            "Noam Shazeer",
            "Niki Parmar",
            "Jakob Uszkoreit",
            "Llion Jones",
            "Aidan Gomez",
            "Lukasz Kaiser",
            "Illia Polosukhin"
        ]
    },
    {
        "fileName": "context-engineering.pdf",
        "language": "en",
        "keyPhrases": [
            "context engineering",
            "context window",
            "prompt engineering",
            "retrieval-augmented generation",
            "token budget",
            "system prompt",
            "few-shot examples",
            "tool results",
            "agent architecture"
        ],
        "organizations": [
            "OpenAI",
            "Anthropic",
            "Google DeepMind"
        ],
        "persons": []
    }
]
```

The enrichment pipeline cracked these PDFs, extracted text (including OCR from figures), detected the language, pulled key phrases capturing the core concepts of each paper, and identified the organizations and authors mentioned in the text. All of this happened automatically during indexing.

Now we can search across these papers using the enriched fields.

```powershell
# Find papers that discuss attention mechanisms
$query = @"
{
    "search": "attention mechanism",
    "select": "fileName, keyPhrases",
    "top": 5
}
"@

$results = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/research-papers/docs/search?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $query

$results.value | ConvertTo-Json -Depth 5

# Find all papers associated with Google
$query = @"
{
    "search": "*",
    "filter": "organizations/any(o: o eq 'Google')",
    "select": "fileName, organizations, keyPhrases"
}
"@

$results = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/research-papers/docs/search?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $query

$results.value | ConvertTo-Json -Depth 5

# Faceted view: which organizations and authors appear across all papers?
$query = @"
{
    "search": "*",
    "facets": ["organizations", "persons,count:10"],
    "count": true
}
"@

$results = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/research-papers/docs/search?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $query

Write-Output "Total papers: $($results.'@odata.count')"
$results.'@search.facets' | ConvertTo-Json -Depth 5
```

This is the complete enrichment story. Raw PDFs went in. Structured, queryable metadata came out. You can filter by organization, search by key phrases, facet by author, and combine all of these with full-text search across the document content. The enrichment pipeline turned unstructured documents into a searchable knowledge base.

## Cleaning Up

To remove the resources created in this article:

```powershell
# Delete indexers
foreach ($name in "articles-enriched-indexer", "research-papers-indexer") {
    Invoke-RestMethod `
        -Uri "$searchEndpoint/indexers/${name}?api-version=$apiVersion" `
        -Method Delete `
        -Headers $headers
}

# Delete skillsets
foreach ($name in "articles-cognitive-skillset", "research-papers-skillset") {
    Invoke-RestMethod `
        -Uri "$searchEndpoint/skillsets/${name}?api-version=$apiVersion" `
        -Method Delete `
        -Headers $headers
}

# Delete data sources
foreach ($name in "articles-enriched-ds", "research-papers-ds") {
    Invoke-RestMethod `
        -Uri "$searchEndpoint/datasources/${name}?api-version=$apiVersion" `
        -Method Delete `
        -Headers $headers
}

# Delete indexes
foreach ($name in "articles-enriched", "research-papers") {
    Invoke-RestMethod `
        -Uri "$searchEndpoint/indexes/${name}?api-version=$apiVersion" `
        -Method Delete `
        -Headers $headers
}
```

## Summary

In this article, we explored AI enrichment in Azure AI Search. We covered the enriched document tree and how skills read from and write to it using path expressions. We built a skill set that integrates Language Detection, Key Phrase Extraction, and Entity Recognition, demonstrating how Azure AI Search resolves the execution order based on input-output dependencies. We walked through the critical distinction between field mappings (for raw source data) and output field mappings (for enriched content).

Crucially, we saw how enrichment results appear in search. The extracted key phrases, organizations, and persons become first-class fields in the index, available for faceted navigation, filtering with lambda expressions like `organizations/any()`, and combined full-text queries. This is what transforms a basic search index into a structured knowledge base.

We then processed real PDF research papers using the OCR and Text Merger pattern, where the indexer cracks documents, the OCR skill extracts text from embedded images, and the Text Merger skill combines everything into a single content stream. Along the way, we dealt with two common gotchas: the 32,766-byte term limit that breaks indexing when large text fields have filtering enabled, and the 50,000-character truncation that built-in skills apply to oversized inputs.

All of this operates in the full-text search world. The enriched fields we extracted are structured metadata that makes your content more searchable, filterable, and facetable. In the next article, we will take the next step: chunking documents, generating vector embeddings with Azure OpenAI, building custom skills with Azure Functions, and running hybrid queries for RAG scenarios.

