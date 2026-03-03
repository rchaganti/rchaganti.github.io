# Azure AI Search - Creating Indexes and Loading Data


In the previous article in [this series](https://ravichaganti.com/series/azure-ai-search/), we looked at what Azure AI Search is, why it matters for AI-powered applications, and how to provision the service using Bicep and Azure CLI. With the search service up and running, the next step is to make it useful by creating an index, loading data into it, and running queries. These are the fundamental building blocks on which everything else in Azure AI Search is built.

In this article, we will explore how to create a search index, load data using both the push and pull methods, and query the index using the REST API. We will use PowerShell and Azure CLI throughout this article to keep things at the infrastructure level. We will get to the Python SDK and agent integrations in later parts of this series.

Before we start creating anything, it is important to understand what a search index actually is. Think of a search index like a database table, but optimized for search. It has a schema that defines the fields, their data types, and their behaviors. Each document in the index is a JSON object that conforms to this schema.

Every field in the index has attributes that control how it participates in search operations. The key attributes are:

- **searchable**: The field is included in full-text search. The content is tokenized and analyzed during indexing.
- **filterable**: The field can be used in filter expressions to narrow results.
- **sortable**: The field can be used to order results.
- **facetable**: The field can be used for faceted navigation, which is the categorized counts you see in e-commerce sites (for example, "Brand: Dell (15), HP (12)").
- **retrievable**: The field is returned in search results. This is true by default.
- **key**: Every index must have exactly one field marked as the key. This uniquely identifies each document.

Azure AI Search supports several data types, including `Edm.String`, `Edm.Int32`, `Edm.Int64`, `Edm.Double`, `Edm.Boolean`, `Edm.DateTimeOffset`, `Edm.GeographyPoint`, and collection types like `Collection(Edm.String)`. For complex structures, you can use `Edm.ComplexType` to represent nested objects.

For all the examples in this article, we will need the search service endpoint and an admin API key. If you followed the first article, you already have a search service provisioned. Let us set up the variables that we will use throughout.

```powershell
# Set your search service details
> $searchServiceName = "rc-srch-demo"
> $resourceGroup = "ai-search-demo"
> $searchEndpoint = "https://$searchServiceName.search.windows.net"

# Retrieve the admin API key
> $apiKey = (az search admin-key show `
  --service-name $searchServiceName `
  --resource-group $resourceGroup `
  --query primaryKey -o tsv)

# Set the API version and common headers
> $apiVersion = "2024-07-01"
> $headers = @{
    "Content-Type" = "application/json"
    "api-key"      = $apiKey
}
```

We are using API version `2024-07-01`, which is the latest stable version that supports all the features we need for this article. There is a newer `2025-09-01` version available as well, but `2024-07-01` is well-tested and sufficient for our purposes here. We also define a `$headers` hash table that we will reuse across all REST calls.

## Creating an Index

Let us create a search index for a simple product catalog. This is a practical scenario that demonstrates the different field types and attributes.

```powershell
> $indexDefinition = @"
{
    "name": "products",
    "fields": [
        {
            "name": "id",
            "type": "Edm.String",
            "key": true,
            "searchable": false,
            "filterable": true
        },
        {
            "name": "name",
            "type": "Edm.String",
            "searchable": true,
            "filterable": false,
            "sortable": true,
            "facetable": false,
            "analyzer": "en.lucene"
        },
        {
            "name": "description",
            "type": "Edm.String",
            "searchable": true,
            "filterable": false,
            "sortable": false,
            "facetable": false,
            "analyzer": "en.lucene"
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
            "name": "price",
            "type": "Edm.Double",
            "searchable": false,
            "filterable": true,
            "sortable": true,
            "facetable": true
        },
        {
            "name": "tags",
            "type": "Collection(Edm.String)",
            "searchable": true,
            "filterable": true,
            "sortable": false,
            "facetable": true
        },
        {
            "name": "inStock",
            "type": "Edm.Boolean",
            "filterable": true,
            "sortable": true,
            "facetable": true
        },
        {
            "name": "lastUpdated",
            "type": "Edm.DateTimeOffset",
            "filterable": true,
            "sortable": true,
            "facetable": false
        }
    ]
}
"@

> Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $indexDefinition | ConvertTo-Json -Depth 10
```

Let us look at some design decisions in this schema.

The `id` field is marked as the key and is not searchable because you typically do not need to search by ID, and you can filter on it directly. The `name` and `description` fields use the `en.lucene` analyzer, the English-language analyzer from Apache Lucene. This provides better search results for English text than the default standard analyzer, which handles stemming, stop words, and other language-specific processing. For example, searching for "running" will also match documents containing "run" or "runs".

The `category` field is both searchable and facetable. This means users can search within category names and also get category-based faceted counts. The `tags` field uses `Collection(Edm.String)` because a product can have multiple tags. Collection fields can be searched and filtered, but cannot be sorted.

You can verify the index was created by listing all indexes.

```powershell
> Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes?api-version=$apiVersion&`$select=name" `
    -Method Get `
    -Headers $headers | ConvertTo-Json
{
    "@odata.context":  "https://rc-srch-demo.search.windows.net/$metadata#indexes(name)",
    "value":  [
                  {
                      "name":  "products"
                  }
              ]
}
```

To see the full schema of the index we just created, use the following.

```powershell
> Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/products?api-version=$apiVersion" `
    -Method Get `
    -Headers $headers | ConvertTo-Json -Depth 10
```

## Loading data - Push

Azure AI Search provides two methods for loading data into an index. The push method lets you upload JSON documents directly to the index. This is the most straightforward approach and works regardless of where your source data resides. You construct JSON documents in your application and POST them to the index.

The push API supports four actions per document:

- **upload**: Inserts the document if it does not exist, or replaces it entirely if it does.
- **merge**: Updates an existing document with the specified fields. Fails if the document does not exist.
- **mergeOrUpload**: Updates the document if it exists, otherwise inserts it.
- **delete**: Removes the document from the index.

Let us load some sample product documents.

```powershell
> $documents = @"
{
    "value": [
        {
            "@search.action": "upload",
            "id": "1",
            "name": "Dell XPS 15 Laptop",
            "description": "A high-performance laptop with a stunning 15.6-inch OLED display, Intel Core i9 processor, 32GB RAM, and 1TB SSD. Perfect for developers and content creators.",
            "category": "Laptops",
            "price": 1899.99,
            "tags": ["laptop", "dell", "oled", "developer"],
            "inStock": true,
            "lastUpdated": "2025-02-15T00:00:00Z"
        },
        {
            "@search.action": "upload",
            "id": "2",
            "name": "Apple MacBook Pro 14",
            "description": "Professional-grade laptop powered by Apple M4 Pro chip with 24GB unified memory and 1TB SSD. Exceptional battery life and a brilliant Liquid Retina XDR display.",
            "category": "Laptops",
            "price": 2399.99,
            "tags": ["laptop", "apple", "macbook", "professional"],
            "inStock": true,
            "lastUpdated": "2025-01-20T00:00:00Z"
        },
        {
            "@search.action": "upload",
            "id": "3",
            "name": "Samsung 49-inch Ultrawide Monitor",
            "description": "A massive curved ultrawide monitor with 5120x1440 resolution, 120Hz refresh rate, and USB-C connectivity. Ideal for productivity and multitasking.",
            "category": "Monitors",
            "price": 1299.99,
            "tags": ["monitor", "ultrawide", "curved", "usb-c"],
            "inStock": true,
            "lastUpdated": "2025-02-01T00:00:00Z"
        },
        {
            "@search.action": "upload",
            "id": "4",
            "name": "Logitech MX Master 3S Mouse",
            "description": "An ergonomic wireless mouse with MagSpeed electromagnetic scrolling, USB-C charging, and multi-device connectivity via Bluetooth.",
            "category": "Accessories",
            "price": 99.99,
            "tags": ["mouse", "wireless", "ergonomic", "bluetooth"],
            "inStock": true,
            "lastUpdated": "2025-01-10T00:00:00Z"
        },
        {
            "@search.action": "upload",
            "id": "5",
            "name": "Keychron Q1 Pro Mechanical Keyboard",
            "description": "A premium wireless mechanical keyboard with hot-swappable switches, QMK/VIA programmability, and a solid aluminum frame. Available in multiple colorways.",
            "category": "Accessories",
            "price": 199.99,
            "tags": ["keyboard", "mechanical", "wireless", "hot-swappable"],
            "inStock": false,
            "lastUpdated": "2025-02-20T00:00:00Z"
        }
    ]
}
"@

> Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/products/docs/index?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $documents | ConvertTo-Json -Depth 5
```

The response includes a status for each document. A `statusCode` of 200 indicates the document was updated successfully, while 201 means it was created. If any document fails, you will see the error details in the response. This is an important detail for production systems -- the push API can partially succeed, so you should always inspect the per-document status.

You can push up to 1,000 documents or 16 MB per batch, whichever limit is reached first. For large data sets, you should batch your uploads accordingly.

Let us verify that the documents were indexed by checking the index statistics.

```powershell
> Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/products/stats?api-version=$apiVersion" `
    -Method Get `
    -Headers $headers | ConvertTo-Json
{
    "@odata.context":  "https://rc-srch-demo.search.windows.net/$metadata#Microsoft.Azure.Search.V2024_07_01.IndexStatistics",
    "documentCount":  5,
    "storageSize":  0,
    "vectorIndexSize":  0
}
```

You should see `documentCount` as 5 in the response.

## Loading data - Pull

The push method works well when you have control over the data pipeline and can construct JSON documents in your application. But what about scenarios where your data is sitting in Azure Blob Storage, Cosmos DB, or SQL Database? This is where the pull method using indexers comes in.

An indexer is a crawler that reads data from a supported data source, serializes it into JSON, and pushes it into your search index. The indexer-based pipeline involves three components:

1. **Data source**: A connection definition that points to your external data store.
2. **Index**: The target search index where the data will be loaded (we already know how to create one).
3. **Indexer**: The component that orchestrates the data flow from source to index.

The key advantage of the pull method is automation. Indexers can run on a schedule, detect new and changed data using built-in change detection, and handle deletion detection. This means your search index stays in sync with the source data without you writing custom synchronization logic.

Let us walk through setting up an indexer that pulls data from Azure Blob Storage. First, we need a storage account and a container with some JSON data.

### Preparing the Data Source

Create a storage account and a blob container using Azure CLI.

```powershell
> $storageAccount = "rcaisearchdemo"
> $storageContainer = "articles"

# Create the storage account
> az storage account create `
    --name $storageAccount `
    --resource-group $resourceGroup `
    --location eastus `
    --sku Standard_LRS

# Get the storage connection string
> $storageConnection = (az storage account show-connection-string `
    --name $storageAccount `
    --resource-group $resourceGroup `
    --query connectionString -o tsv)

# Create a blob container
> az storage container create `
    --name $storageContainer `
    --connection-string $storageConnection
```

Now, let us upload some sample JSON documents to the container. We will use a simple dataset of a few articles. Create a few JSON files locally and upload them.

```powershell
# Create sample article documents
> @"
{
    "id": "article-001",
    "title": "Introduction to Retrieval-Augmented Generation",
    "content": "Retrieval-Augmented Generation (RAG) is a technique that enhances Large Language Model responses by grounding them in external knowledge sources. Instead of relying solely on the model's training data, RAG retrieves relevant documents from a search index and includes them as context in the prompt. This approach significantly reduces hallucination and improves the accuracy of generated responses for domain-specific queries.",
    "author": "Ravi",
    "category": "AI",
    "publishedDate": "2025-01-15T10:00:00Z"
}
"@ | Set-Content -Path "$env:TEMP\article1.json" -Encoding UTF8

@"
{
    "id": "article-002",
    "title": "Building Multi-Agent Systems with MCP",
    "content": "The Model Context Protocol (MCP) provides a standardized way for AI agents to access tools and data sources. When building multi-agent systems, MCP servers act as the bridge between agents and external capabilities. Each agent can discover and invoke tools exposed by MCP servers, enabling complex workflows where specialized agents collaborate to solve problems that no single agent could handle alone.",
    "author": "Ravi",
    "category": "Agents",
    "publishedDate": "2025-02-01T10:00:00Z"
}
"@ | Set-Content -Path "$env:TEMP\article2.json" -Encoding UTF8

@"
{
    "id": "article-003",
    "title": "Infrastructure as Code for AI Workloads",
    "content": "Deploying AI workloads in production requires reliable, repeatable infrastructure. Bicep and Terraform are the two dominant infrastructure-as-code tools in the Azure ecosystem. Bicep offers a first-class authoring experience for Azure resources with type safety and IntelliSense support. For AI-specific workloads, you need to provision search services, OpenAI endpoints, storage accounts, and networking components as a single coordinated deployment.",
    "author": "Ravi",
    "category": "Infrastructure",
    "publishedDate": "2025-02-20T10:00:00Z"
}
"@ | Set-Content -Path "$env:TEMP\article3.json" -Encoding UTF8

# Upload documents to blob storage
> foreach ($file in "article1.json", "article2.json", "article3.json") {
    az storage blob upload `
        --container-name $storageContainer `
        --file "$env:TEMP\$file" `
        --name $file `
        --connection-string $storageConnection `
        --overwrite
}
```

### Creating the Index

We need a new index that matches the structure of our article documents.

```powershell
> $articlesIndex = @"
{
    "name": "articles",
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
            "filterable": false,
            "sortable": true,
            "analyzer": "en.lucene"
        },
        {
            "name": "content",
            "type": "Edm.String",
            "searchable": true,
            "filterable": false,
            "sortable": false,
            "analyzer": "en.lucene"
        },
        {
            "name": "author",
            "type": "Edm.String",
            "searchable": false,
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
            "sortable": true,
            "facetable": false
        }
    ]
}
"@

> Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $articlesIndex | ConvertTo-Json -Depth 10
```

### Creating the Data Source Connection

The data source tells Azure AI Search how to connect to your blob storage.

```powershell
> $dataSource = @"
{
    "name": "articles-blob-ds",
    "type": "azureblob",
    "credentials": {
        "connectionString": "$storageConnection"
    },
    "container": {
        "name": "articles",
        "query": null
    }
}
"@

> Invoke-RestMethod `
    -Uri "$searchEndpoint/datasources?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $dataSource | ConvertTo-Json -Depth 5
```

The `type` field specifies the data source type. Azure AI Search supports several types, including `azureblob`, `azuretable`, `azuresql`, `cosmosdb`, `adlsgen2`, and `onelake`. The `container` object specifies the blob container name. You can optionally set a `query` to filter the indexer to a specific folder path within the container.

Note that in a production environment, you would want to use managed identity authentication instead of connection strings. The search service's system-assigned managed identity can be granted the Storage Blob Data Reader role on the storage account, eliminating the need to store connection strings.

### Creating the Indexer

The indexer ties everything together. It reads data from the data source and populates the target index.

```powershell
> $indexer = @"
{
    "name": "articles-blob-indexer",
    "dataSourceName": "articles-blob-ds",
    "targetIndexName": "articles",
    "parameters": {
        "configuration": {
            "parsingMode": "json",
            "dataToExtract": "contentAndMetadata"
        }
    },
    "fieldMappings": [],
    "schedule": {
        "interval": "PT1H"
    }
}
"@

> Invoke-RestMethod `
    -Uri "$searchEndpoint/indexers?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $indexer | ConvertTo-Json -Depth 5
```

A few important things to note here.

The `parsingMode` is set to `json` because our blobs contain individual JSON documents. Other parsing modes include `jsonArray` (for blobs containing a JSON array of documents), `jsonLines` (for newline-delimited JSON), `delimitedText` (for CSV files), and the default mode that treats each blob as a single text document.

The `dataToExtract` parameter controls what gets pulled from each blob. The `contentAndMetadata` setting extracts both the blob content and its storage metadata (like `metadata_storage_name`, `metadata_storage_path`, etc.). You can also set this to `storageMetadata` if you only need the metadata.

The `fieldMappings` array is empty in this example because the field names in our JSON documents match the field names in the index exactly. If they did not match, you would define mappings here. For example, if the JSON had a field called `article_title` but your index had `title`, you would add a mapping like `{"sourceFieldName": "article_title", "targetFieldName": "title"}`.

The `schedule` uses an ISO 8601 duration format. `PT1H` means the indexer runs every hour. The minimum interval is `PT5M` (five minutes). You can omit the schedule entirely if you prefer to run the indexer on demand.

An indexer runs automatically when created. You can check its status using the following command.

```powershell
> $status = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexers/articles-blob-indexer/status?api-version=$apiVersion" `
    -Method Get `
    -Headers $headers

> $status.lastResult | ConvertTo-Json -Depth 5
{
    "status":  "success",
    "errorMessage":  null,
    ....
    "itemsProcessed":  3,
    "itemsFailed":  0,
    ....
    "errors":  [

               ],
    "warnings":  [

                 ],
    "metrics":  null
}
```

Look for `"status": "success"` in the response. The `itemsProcessed` count should match the number of blobs in your container. If you see failures, the `errors` array will contain details about what went wrong.

To run the indexer on demand (outside of its schedule), use the following.

```powershell
> Invoke-RestMethod `
    -Uri "$searchEndpoint/indexers/articles-blob-indexer/run?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers
```

## Push vs. Pull: When to Use Which

Now that we have seen both methods in action, when should you use one over the other?

- The **push method** is the right choice when your data does not reside in a supported data source, when you need real-time or near-real-time index updates (as there is no minimum interval with push -- you can update on every change), when you need fine-grained control over batching and error handling, or when you are transforming data in your application before indexing.
- The **pull method** (indexers) is the right choice when your data is in a supported Azure data source and you want Azure AI Search to handle synchronization automatically, when you want change detection and deletion detection without writing custom logic, when you want a scheduled refresh that keeps the index current, or when you want to layer in AI enrichment skills later (which is something we will cover in a future article). Indexers also support skillsets for AI enrichment, but we are keeping that for a dedicated article.

In many production systems, you end up using both. You might use an indexer for the initial bulk load and scheduled refreshes, and then use the push API for real-time updates that cannot wait for the next indexer run.

## Querying the Index

With data loaded, let us run some queries. Azure AI Search provides a rich query language that supports full-text search, filters, facets, sorting, and more. Queries are sent as POST requests to the `/docs/search` endpoint.

### Simple Search

Let us start with a simple keyword search across the products index.

```powershell
> $query = @"
{
    "search": "wireless",
    "select": "name, category, price, tags"
}
"@

> $results = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/products/docs/search?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $query

> $results.value | ConvertTo-Json -Depth 5
[
    {
        "@search.score":  1.3911586,
        "name":  "Logitech MX Master 3S Mouse",
        "category":  "Accessories",
        "price":  99.99,
        "tags":  [
                     "mouse",
                     "wireless",
                     "ergonomic",
                     "bluetooth"
                 ]
    },
    {
        "@search.score":  0.5701755,
        "name":  "Keychron Q1 Pro Mechanical Keyboard",
        "category":  "Accessories",
        "price":  199.99,
        "tags":  [
                     "keyboard",
                     "mechanical",
                     "wireless",
                     "hot-swappable"
                 ]
    }
]
```

The `search` parameter contains the query text. Azure AI Search runs this against all searchable fields by default. The `select` parameter controls which fields are returned in the results, similar to a SQL SELECT statement.

### Filtering

Filters narrow the result set using Boolean expressions. They operate on filterable fields and are evaluated before scoring, which makes them efficient.

```powershell
> $query = @"
{
    "search": "*",
    "filter": "category eq 'Laptops' and price lt 2000",
    "select": "name, category, price"
}
"@

> $results = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/products/docs/search?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $query

> $results.value | ConvertTo-Json -Depth 5
{
    "@search.score":  1.0,
    "name":  "Dell XPS 15 Laptop",
    "category":  "Laptops",
    "price":  1899.99
}
```

The filter uses OData syntax. Common operators include `eq` (equals), `ne` (not equals), `gt` (greater than), `lt` (less than), `ge` (greater than or equal), `le` (less than or equal), `and`, `or`, and `not`. For collection fields like `tags`, you can use `tags/any(t: t eq 'wireless')` to match documents where any tag equals "wireless".

### Faceted Search

Facets return counts for each unique value in a facetable field. This is the mechanism behind the filtering sidebars you see on e-commerce websites.

```powershell
> $query = @"
{
    "search": "*",
    "facets": ["category", "inStock"],
    "count": true
}
"@

> $results = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/products/docs/search?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $query

> Write-Output "Total count: $($results.'@odata.count')"
> $results.'@search.facets' | ConvertTo-Json -Depth 5
{
    "inStock":  [
                    {
                        "value":  true,
                        "count":  4
                    },
                    {
                        "value":  false,
                        "count":  1
                    }
                ],
    "category":  [
                     {
                         "value":  "Accessories",
                         "count":  2
                     },
                     {
                         "value":  "Laptops",
                         "count":  2
                     },
                     {
                         "value":  "Monitors",
                         "count":  1
                     }
                 ]
}
```

Setting `count` to `true` includes the total number of matching documents. The response includes a `@search.facets` object with arrays of value-count pairs for each faceted field.

### Sorting and Paging

You can control the order and pagination of results using `orderby`, `top`, and `skip`.

```powershell
> $query = @"
{
    "search": "*",
    "orderby": "price desc",
    "top": 3,
    "skip": 0,
    "select": "name, price, category"
}
"@

> $results = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/products/docs/search?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $query

> $results.value | ConvertTo-Json -Depth 5
[
    {
        "@search.score":  1.0,
        "name":  "Apple MacBook Pro 14",
        "category":  "Laptops",
        "price":  2399.99
    },
    {
        "@search.score":  1.0,
        "name":  "Dell XPS 15 Laptop",
        "category":  "Laptops",
        "price":  1899.99
    },
    {
        "@search.score":  1.0,
        "name":  "Samsung 49-inch Ultrawide Monitor",
        "category":  "Monitors",
        "price":  1299.99
    }
]
```

The `orderby` parameter takes a comma-separated list of sortable fields with optional `asc` (default) or `desc` direction. The `top` parameter limits the number of results (default is 50, maximum is 1,000). The `skip` parameter is used for pagination -- to get the second page of 3 results, set `skip` to 3.

### Querying the Articles Index

Let us also run a query against our articles index that was populated via the indexer.

```powershell
> $query = @"
{
    "search": "agents MCP",
    "select": "title, author, category, publishedDate",
    "highlight": "content",
    "highlightPreTag": "<em>",
    "highlightPostTag": "</em>"
}
"@

> $results = Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/articles/docs/search?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $query

> $results.value | ConvertTo-Json -Depth 5
```

This query introduces hit highlighting. The `highlight` parameter specifies which fields should return highlighted snippets where the search terms were found. The `highlightPreTag` and `highlightPostTag` define the HTML tags that wrap the matched terms. Hit highlighting is useful for building search result pages where you want to show users why a particular document matched their query.

## Managing Indexes and Indexers

Here are a few operational commands that are useful for day-to-day management.

### Updating an Index

You can add new fields to an existing index, but you cannot modify or delete existing fields. This is a common constraint in search systems because changing field definitions would require re-indexing all documents.

```powershell
# Add a new field to the products index
> $updatedIndex = @"
{
    "name": "products",
    "fields": [
        {"name": "id", "type": "Edm.String", "key": true, "searchable": false, "filterable": true},
        {"name": "name", "type": "Edm.String", "searchable": true, "filterable": false, "sortable": true, "facetable": false, "analyzer": "en.lucene"},
        {"name": "description", "type": "Edm.String", "searchable": true, "filterable": false, "sortable": false, "facetable": false, "analyzer": "en.lucene"},
        {"name": "category", "type": "Edm.String", "searchable": true, "filterable": true, "sortable": true, "facetable": true},
        {"name": "price", "type": "Edm.Double", "searchable": false, "filterable": true, "sortable": true, "facetable": true},
        {"name": "tags", "type": "Collection(Edm.String)", "searchable": true, "filterable": true, "sortable": false, "facetable": true},
        {"name": "inStock", "type": "Edm.Boolean", "filterable": true, "sortable": true, "facetable": true},
        {"name": "lastUpdated", "type": "Edm.DateTimeOffset", "filterable": true, "sortable": true, "facetable": false},
        {"name": "brand", "type": "Edm.String", "searchable": true, "filterable": true, "sortable": true, "facetable": true}
    ]
}
"@

> Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/products?api-version=$apiVersion" `
    -Method Put `
    -Headers $headers `
    -Body $updatedIndex | Select-Object name
```

Note that the PUT request for index update requires the complete schema -- all existing fields plus the new ones. You cannot send just the new field.

### Resetting and Re-running an Indexer

If you need to re-index all data from scratch (for example, after changing the index schema), you can reset the indexer and run it again.

```powershell
# Reset the indexer (clears the high-water mark so it processes all documents)
> Invoke-RestMethod `
    -Uri "$searchEndpoint/indexers/articles-blob-indexer/reset?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers

# Run the indexer
> Invoke-RestMethod `
    -Uri "$searchEndpoint/indexers/articles-blob-indexer/run?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers
```

### Deleting Documents

To remove specific documents from the index using the push API, use the `delete` action.

```powershell
> $deleteDoc = @"
{
    "value": [
        {
            "@search.action": "delete",
            "id": "5"
        }
    ]
}
"@

> Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/products/docs/index?api-version=$apiVersion" `
    -Method Post `
    -Headers $headers `
    -Body $deleteDoc | ConvertTo-Json -Depth 5
{
    "@odata.context":  "https://rc-srch-demo.search.windows.net/indexes(\u0027products\u0027)/$metadata#Collection(Microsoft.Azure.Search.V2024_07_01.IndexResult)",
    "value":  [
                  {
                      "key":  "5",
                      "status":  true,
                      "errorMessage":  null,
                      "statusCode":  200
                  }
              ]
}
```

### Deleting Resources

To clean up, you can delete individual resources in the correct order -- indexer first, then the data source, and finally the index.

```powershell
# Delete the indexer
> Invoke-RestMethod `
    -Uri "$searchEndpoint/indexers/articles-blob-indexer?api-version=$apiVersion" `
    -Method Delete `
    -Headers $headers

# Delete the data source
> Invoke-RestMethod `
    -Uri "$searchEndpoint/datasources/articles-blob-ds?api-version=$apiVersion" `
    -Method Delete `
    -Headers $headers

# Delete the indexes
> Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/articles?api-version=$apiVersion" `
    -Method Delete `
    -Headers $headers

> Invoke-RestMethod `
    -Uri "$searchEndpoint/indexes/products?api-version=$apiVersion" `
    -Method Delete `
    -Headers $headers
```

## Summary

In this article, we covered the fundamental data operations in Azure AI Search. We created search indexes with carefully designed schemas, loaded data using both the push method (direct JSON upload) and the pull method (indexer from Blob Storage), and queried the data using full-text search, filters, facets, and sorting. All of this was done using the REST API and PowerShell, keeping things at the infrastructure level.

The push and pull methods serve different use cases, and understanding when to use each is important for building a reliable search pipeline. The push method gives you full control and real-time updates, while the pull method with indexers provides automated synchronization with built-in change detection.

In the next article, we will look at AI enrichment, which is about using skill sets to automatically chunk documents, generate embeddings, and apply cognitive transformations during indexing. This is where Azure AI Search becomes truly powerful for RAG scenarios.

