# Azure AI Search Python SDK — Installation, Authentication, and Index Management


## Introduction

Azure AI Search (formerly Azure Cognitive Search) exposes a rich REST API for index management, document ingestion, and querying. The `azure-search-documents` Python SDK wraps that API with a clean, type-annotated interface so you can build search-powered applications without writing raw HTTP requests.

In this first part, we cover the foundational workflow: installing the SDK, authenticating against your Azure Search resource, defining an index schema, uploading documents, and running full-text search queries. By the end, you will have a working Python script that creates an index, loads data, and returns search results.

---

## Prerequisites

| Requirement | Detail |
|---|---|
| Python | 3.8 or higher |
| Azure subscription | [portal.azure.com](https://portal.azure.com) |
| Azure AI Search resource | Free (F0) or Basic tier works for this guide |
| Search service endpoint | `https://<service-name>.search.windows.net` |
| Admin API key **or** Entra ID | For index and document management |

Retrieve your endpoint and admin key from **Azure Portal → Azure AI Search resource → Keys**.

---

## Installation

Install the `azure-search-documents` package from PyPI:

```bash
pip install azure-search-documents
```

For Microsoft Entra ID (Azure AD) authentication, also install the identity library:

```bash
pip install azure-identity
```

Verify the install:

```python
import azure.search.documents
print(azure.search.documents.__version__)
```

---

## The Three Core Clients

The SDK ships three clients, each scoped to a specific concern:

| Client | Import | Purpose |
|---|---|---|
| `SearchIndexClient` | `azure.search.documents.indexes` | Create, update, delete, and list indexes |
| `SearchIndexerClient` | `azure.search.documents.indexes` | Manage indexers, data sources, and skillsets |
| `SearchClient` | `azure.search.documents` | Upload documents and run search queries |

You will use all three in a real application. Index management uses `SearchIndexClient`; day-to-day querying uses `SearchClient`.

We can authenticate with Azure AI Search in different ways. Let us first look at the API key method.

```python
import os
from dotenv import load_dotenv
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient

load_dotenv()

ENDPOINT = os.environ["AZURE_SEARCH_ENDPOINT"]   # https://<name>.search.windows.net
ADMIN_KEY = os.environ["AZURE_SEARCH_ADMIN_KEY"]
INDEX_NAME = "hotels-sample"

credential = AzureKeyCredential(ADMIN_KEY)

# Index management client
index_client = SearchIndexClient(endpoint=ENDPOINT, credential=credential)

# Document search client for a specific index
search_client = SearchClient(
    endpoint=ENDPOINT,
    index_name=INDEX_NAME,
    credential=credential,
)
```

This is good for quick demo apps and experimentation. For production scenarios, using Microsoft Entra ID is the recommended method.

```python
from azure.identity import DefaultAzureCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient

credential = DefaultAzureCredential()

index_client = SearchIndexClient(endpoint=ENDPOINT, credential=credential)
search_client = SearchClient(
    endpoint=ENDPOINT,
    index_name=INDEX_NAME,
    credential=credential,
)
```

> **Role assignment:** The identity needs **Search Index Data Contributor** (documents) and **Search Service Contributor** (index management) roles on the Search resource.

### `.env` setup

```
AZURE_SEARCH_ENDPOINT=https://<service-name>.search.windows.net
AZURE_SEARCH_ADMIN_KEY=your-admin-key-here
AZURE_SEARCH_QUERY_KEY=your-query-key-here
```

Use the **admin key** for index management and document upload. Use the **query key** (read-only) in front-end applications and APIs that only need to run searches.

## Creating an index

An index schema specifies the fields that every document in the index must include. Each field has a name, a type, and a set of attributes that control its behaviour. The following tables show the field names and attributes.

| Python class | JSON type | Use for |
|---|---|---|
| `SimpleField` | Various | IDs, flags, numeric data — not searchable by default |
| `SearchableField` | `Edm.String` | Full-text searchable text fields |
| `ComplexField` | Object / Collection | Nested objects |
| `SearchField` | Any | Full control — specify all attributes manually |

| Attribute | Meaning |
|---|---|
| `key=True` | Document unique identifier (exactly one required) |
| `filterable=True` | Can be used in `$filter` expressions |
| `sortable=True` | Can be used in `$orderby` |
| `facetable=True` | Can be used in faceted navigation |
| `searchable=True` | Full-text indexed |
| `retrievable=True` | Returned in search results (default `True`) |

To create an index, we define a list of fields and use the `SearchIndex` method.

```python
import os
from dotenv import load_dotenv
from azure.core.credentials import AzureKeyCredential
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SimpleField,
    SearchableField,
    SearchFieldDataType,
)

load_dotenv()

ENDPOINT = os.environ["AZURE_SEARCH_ENDPOINT"]
ADMIN_KEY = os.environ["AZURE_SEARCH_ADMIN_KEY"]
INDEX_NAME = "hotels-sample"

credential = AzureKeyCredential(ADMIN_KEY)
index_client = SearchIndexClient(endpoint=ENDPOINT, credential=credential)

fields = [
    SimpleField(
        name="hotelId",
        type=SearchFieldDataType.String,
        key=True,
        filterable=True,
    ),
    SearchableField(name="hotelName", type=SearchFieldDataType.String, sortable=True),
    SearchableField(name="description", type=SearchFieldDataType.String),
    SearchableField(name="category", type=SearchFieldDataType.String, filterable=True, facetable=True),
    SimpleField(name="rating", type=SearchFieldDataType.Double, filterable=True, sortable=True, facetable=True),
    SimpleField(name="lastRenovationDate", type=SearchFieldDataType.DateTimeOffset, filterable=True, sortable=True),
    SimpleField(name="parkingIncluded", type=SearchFieldDataType.Boolean, filterable=True, facetable=True),
]

index = SearchIndex(name=INDEX_NAME, fields=fields)

result = index_client.create_or_update_index(index)
print(f"Index '{result.name}' created/updated successfully.")
```

`create_or_update_index` is idempotent. It creates the index on first run and updates the schema on subsequent runs (subject to field update restrictions). The `list_indexes()` and `delete_index()` methods of the index client are used to list and delete indices. 

```python
# List all indexes in the service
for idx in index_client.list_indexes():
    print(idx.name)

# Delete an index (irreversible — also deletes all documents)
index_client.delete_index(INDEX_NAME)
print(f"Index '{INDEX_NAME}' deleted.")
```

---

## Uploading Documents

`SearchClient` handles document operations: upload, merge, merge-or-upload, and delete.

### Upload (insert or replace)

```python
import os
from dotenv import load_dotenv
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient

load_dotenv()

ENDPOINT  = os.environ["AZURE_SEARCH_ENDPOINT"]
ADMIN_KEY = os.environ["AZURE_SEARCH_ADMIN_KEY"]
INDEX_NAME = "hotels-sample"

search_client = SearchClient(
    endpoint=ENDPOINT,
    index_name=INDEX_NAME,
    credential=AzureKeyCredential(ADMIN_KEY),
)

documents = [
    {
        "hotelId": "1",
        "hotelName": "Secret Point Motel",
        "description": "The hotel is ideally located on the main commercial artery of the city.",
        "category": "Boutique",
        "rating": 4.0,
        "lastRenovationDate": "1970-01-18T00:00:00Z",
        "parkingIncluded": False,
    },
    {
        "hotelId": "2",
        "hotelName": "Twin Dome Motel",
        "description": "The hotel is situated in a 19th century plaza with rooms that are spacious.",
        "category": "Budget",
        "rating": 3.6,
        "lastRenovationDate": "1979-02-18T00:00:00Z",
        "parkingIncluded": False,
    },
    {
        "hotelId": "3",
        "hotelName": "Triple Landscape Hotel",
        "description": "The Hotel stands out for its excellent location and the care given to its clientele.",
        "category": "Resort and Spa",
        "rating": 4.8,
        "lastRenovationDate": "2015-09-20T00:00:00Z",
        "parkingIncluded": True,
    },
]

result = search_client.upload_documents(documents=documents)

for r in result:
    print(f"Document {r.key}: {'succeeded' if r.succeeded else 'FAILED — ' + r.error_message}")
```

`merge_documents` updates only the fields you provide. Fields not included are left unchanged:

```python
updates = [
    {"hotelId": "1", "rating": 4.5},  # only rating changes
]

result = search_client.merge_documents(documents=updates)
for r in result:
    print(f"Merge {r.key}: {'ok' if r.succeeded else r.error_message}")
```

The most common pattern for ETL pipelines is insert if the document does not exist, update if it does:

```python
result = search_client.merge_or_upload_documents(documents=documents)
```

And, to delete documents, 

```python
to_delete = [{"hotelId": "2"}]
result = search_client.delete_documents(documents=to_delete)
```

> **Batching:** Each `upload_documents` call can include up to **1,000 documents** in one batch. For large datasets, split your data into chunks and loop.

---

## Running Search Queries

`SearchClient.search()` executes a full-text search query. The method returns an iterator of result documents.

### Basic full-text search

```python
results = search_client.search(search_text="motel")

for result in results:
    print(f"{result['hotelId']} — {result['hotelName']} (rating: {result['rating']})")
```

By default all retrievable fields are returned. The `@search.score` metadata field is included automatically.

### Selecting fields

Limit which fields are returned to reduce payload size:

```python
results = search_client.search(
    search_text="motel",
    select=["hotelId", "hotelName", "rating"],
)

for result in results:
    print(result)
```

### Accessing the search score

```python
results = search_client.search(
    search_text="spacious rooms",
    select=["hotelId", "hotelName"],
)

for result in results:
    print(f"Score: {result['@search.score']:.4f} — {result['hotelName']}")
```

### Filtering results

`filter` accepts OData expressions:

```python
results = search_client.search(
    search_text="*",           # wildcard — return everything
    filter="rating ge 4.0",
    select=["hotelId", "hotelName", "rating"],
    order_by=["rating desc"],
)

for result in results:
    print(f"{result['hotelName']} — {result['rating']}")
```

Common OData operators:

| Operator | Meaning | Example |
|---|---|---|
| `eq` | equals | `category eq 'Boutique'` |
| `ne` | not equals | `parkingIncluded ne true` |
| `gt` / `ge` | greater than / or equal | `rating ge 4.0` |
| `lt` / `le` | less than / or equal | `rating lt 3.0` |
| `and` / `or` / `not` | logical | `rating ge 4.0 and parkingIncluded eq true` |

### Sorting

```python
results = search_client.search(
    search_text="hotel",
    order_by=["rating desc", "hotelName asc"],
    select=["hotelId", "hotelName", "rating"],
)
```

### Pagination

`top` limits results per page; `skip` offsets the start:

```python
# Page 1 — first 5 results
results = search_client.search(
    search_text="hotel",
    top=5,
    skip=0,
    include_total_count=True,
)

print(f"Total matching documents: {results.get_count()}")
for result in results:
    print(result["hotelName"])

# Page 2 — next 5 results
results = search_client.search(search_text="hotel", top=5, skip=5)
```

### Highlighting matched terms

Return snippets with matched terms wrapped in `<em>` tags:

```python
results = search_client.search(
    search_text="excellent location",
    highlight_fields="description",
    select=["hotelId", "hotelName"],
)

for result in results:
    highlights = result.get("@search.highlights", {}).get("description", [])
    print(f"{result['hotelName']}")
    for snippet in highlights:
        print(f"  → {snippet}")
```

### Getting a single document by key

```python
doc = search_client.get_document(key="1")
print(doc["hotelName"])
```

### Document count

```python
count = search_client.get_document_count()
print(f"Documents in index: {count}")
```

---

## Autocomplete and Suggestions

Autocomplete and suggestions require a **suggester** defined on the index. Add one when creating your index:

```python
from azure.search.documents.indexes.models import SearchSuggester

index = SearchIndex(
    name=INDEX_NAME,
    fields=fields,
    suggesters=[
        SearchSuggester(name="sg", source_fields=["hotelName", "description"])
    ],
)
```

### Autocomplete

```python
autocomplete_results = search_client.autocomplete(
    search_text="spa",
    suggester_name="sg",
)

for result in autocomplete_results:
    print(result["text"])
```

### Suggestions (full document context)

```python
suggestion_results = search_client.suggest(
    search_text="mot",
    suggester_name="sg",
    select=["hotelId", "hotelName"],
)

for result in suggestion_results:
    print(f"{result['@search.text']} — {result['hotelName']}")
```

Let us now put all the knowledge gained in this article together to create a complete example.

```python
# azure_search_basics.py
import os
from dotenv import load_dotenv
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SimpleField,
    SearchableField,
    SearchFieldDataType,
    SearchSuggester,
)

load_dotenv()

ENDPOINT   = os.environ["AZURE_SEARCH_ENDPOINT"]
ADMIN_KEY  = os.environ["AZURE_SEARCH_ADMIN_KEY"]
INDEX_NAME = "hotels-quickstart"

credential   = AzureKeyCredential(ADMIN_KEY)
index_client = SearchIndexClient(endpoint=ENDPOINT, credential=credential)
search_client = SearchClient(endpoint=ENDPOINT, index_name=INDEX_NAME, credential=credential)


# 1. Create index
def create_index():
    fields = [
        SimpleField(name="hotelId", type=SearchFieldDataType.String, key=True, filterable=True),
        SearchableField(name="hotelName", type=SearchFieldDataType.String, sortable=True),
        SearchableField(name="description", type=SearchFieldDataType.String),
        SearchableField(name="category", type=SearchFieldDataType.String, filterable=True, facetable=True),
        SimpleField(name="rating", type=SearchFieldDataType.Double, filterable=True, sortable=True, facetable=True),
        SimpleField(name="parkingIncluded", type=SearchFieldDataType.Boolean, filterable=True),
    ]
    index = SearchIndex(
        name=INDEX_NAME,
        fields=fields,
        suggesters=[SearchSuggester(name="sg", source_fields=["hotelName"])],
    )
    result = index_client.create_or_update_index(index)
    print(f"Index '{result.name}' ready.")


# 2. Upload documents
def upload_documents():
    docs = [
        {"hotelId": "1", "hotelName": "Secret Point Motel", "description": "On the main commercial artery.", "category": "Boutique", "rating": 4.0, "parkingIncluded": False},
        {"hotelId": "2", "hotelName": "Twin Dome Motel", "description": "Spacious rooms in a 19th century plaza.", "category": "Budget", "rating": 3.6, "parkingIncluded": False},
        {"hotelId": "3", "hotelName": "Triple Landscape Hotel", "description": "Excellent location and care for clientele.", "category": "Resort and Spa", "rating": 4.8, "parkingIncluded": True},
        {"hotelId": "4", "hotelName": "Sublime Cliff Hotel", "description": "Sublime Cliff Hotel is located in the heart of the historic city centre.", "category": "Boutique", "rating": 4.6, "parkingIncluded": True},
    ]
    result = search_client.upload_documents(documents=docs)
    for r in result:
        status = "ok" if r.succeeded else r.error_message
        print(f"  Upload {r.key}: {status}")


# 3. Search
def run_searches():
    print("\n--- Full-text: 'motel' ---")
    for r in search_client.search("motel", select=["hotelId", "hotelName", "rating"]):
        print(f"  {r['hotelId']} {r['hotelName']} ({r['rating']})")

    print("\n--- Filter: rating >= 4.5 ---")
    for r in search_client.search("*", filter="rating ge 4.5", select=["hotelName", "rating"], order_by=["rating desc"]):
        print(f"  {r['hotelName']} — {r['rating']}")

    print("\n--- Autocomplete: 'sub' ---")
    for r in search_client.autocomplete("sub", "sg"):
        print(f"  {r['text']}")


if __name__ == "__main__":
    create_index()
    upload_documents()

    import time
    time.sleep(2)   # brief pause for indexing to propagate

    run_searches()
```

> **Indexing lag:** Documents uploaded via the push API are not instantly queryable. In practice, they are available within a second or two, but add a short `time.sleep()` in scripts that upload and immediately query.

In this part, we covered:

- Installing `azure-search-documents` and understanding the three core clients.
- Two authentication options: API key and Microsoft Entra ID with `DefaultAzureCredential`.
- Defining an index schema with `SimpleField`, `SearchableField`, and field attributes.
- Creating, updating, listing, and deleting indexes with `SearchIndexClient`.
- Uploading documents with upload, merge, merge-or-upload, and delete operations.
- Running full-text searches with `SearchClient.search()` — selecting fields, filtering, sorting, paginating, and highlighting.
- Adding a suggester and using autocomplete and suggestions.

In the next part on using the Python SDK, we move into advanced query capabilities: faceted navigation, scoring profiles, semantic ranking, vector search, and hybrid search that combines keyword and vector retrieval.

