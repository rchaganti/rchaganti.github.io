# Azure AI Search Python SDK — Facets, Scoring Profiles, Semantic Ranking, and Vector Search


## Introduction

In the previous article of this series, we covered the foundational workflow: installing `azure-search-documents`, authenticating, creating an index, uploading documents, and running full-text queries with filters, sorting, and pagination.

Now we move into the capabilities that make Azure AI Search genuinely powerful for modern AI applications:

1. **Faceted navigation** — aggregate counts by field for drill-down filtering.
2. **Scoring profiles** — customise relevance ranking with field weights and boosts.
3. **Semantic ranking** — re-rank results using deep language understanding and return AI-generated captions and answers.
4. **Vector search** — store and query dense embeddings for semantic similarity retrieval.
5. **Hybrid search** — combine keyword BM25 and vector search in a single query using Reciprocal Rank Fusion (RRF).

All examples use `azure-search-documents` against a real Azure AI Search resource.

Facets aggregate document counts grouped by a field value. It is the backbone of drill-down filtering in e-commerce and document search UIs.

### Requesting facets

Pass a list of field names to the `facets` parameter. The field must be marked `facetable=True` in the index schema:

```python
results = search_client.search(
    search_text="*",
    facets=["category", "rating,interval:1", "parkingIncluded"],
    select=["hotelId", "hotelName"],
)

# Retrieve facet results from the response
facet_results = results.get_facets()

print("Category facets:")
for bucket in facet_results.get("category", []):
    print(f"  {bucket['value']}: {bucket['count']} hotels")

print("\nRating facets (by interval of 1):")
for bucket in facet_results.get("rating", []):
    print(f"  {bucket['value']}: {bucket['count']} hotels")

print("\nParking facets:")
for bucket in facet_results.get("parkingIncluded", []):
    print(f"  {bucket['value']}: {bucket['count']} hotels")
```

There are several facet syntax options.

| Syntax | Meaning |
|---|---|
| `"category"` | All distinct values with counts |
| `"rating,count:5"` | Top 5 values by count |
| `"rating,interval:1"` | Numeric range buckets of width 1 |
| `"lastRenovationDate,interval:year"` | Date buckets by year |
| `"rating,sort:value"` | Sort buckets by the field value |

Once a user selects a facet value, convert it to a filter expression:

```python
# User clicked "Boutique" in the category facet
selected_category = "Boutique"

results = search_client.search(
    search_text="hotel",
    filter=f"category eq '{selected_category}'",
    facets=["rating,interval:1"],          # continue showing sub-facets
    select=["hotelId", "hotelName", "rating"],
)

for result in results:
    print(f"{result['hotelName']} ({result['rating']})")
```

By default, Azure AI Search uses BM25 to rank results. A scoring profile lets you boost the relevance score based on field weights, function-based boosts (distance, freshness, magnitude, tag), or both.

The following Python example demonstrates adding a scoring profile to the index.

```python
from azure.search.documents.indexes.models import (
    SearchIndex,
    SimpleField,
    SearchableField,
    SearchFieldDataType,
    ScoringProfile,
    TextWeights,
    MagnitudeScoringFunction,
    MagnitudeScoringParameters,
    FreshnessScoringFunction,
    FreshnessScoringParameters,
    ScoringFunctionInterpolation,
    ScoringFunctionAggregation,
)
from datetime import timedelta

fields = [
    SimpleField(name="hotelId", type=SearchFieldDataType.String, key=True),
    SearchableField(name="hotelName", type=SearchFieldDataType.String),
    SearchableField(name="description", type=SearchFieldDataType.String),
    SimpleField(name="rating", type=SearchFieldDataType.Double, filterable=True, sortable=True),
    SimpleField(name="lastRenovationDate", type=SearchFieldDataType.DateTimeOffset, filterable=True, sortable=True),
]

scoring_profiles = [
    ScoringProfile(
        name="boostByRatingAndRecency",
        # Boost text matches in hotelName 5x, description 1.5x
        text_weights=TextWeights(weights={"hotelName": 5, "description": 1.5}),
        functions=[
            # Boost highly rated hotels — magnitude on rating field
            MagnitudeScoringFunction(
                field_name="rating",
                boost=2,
                parameters=MagnitudeScoringParameters(
                    boosting_range_start=1,
                    boosting_range_end=5,
                    should_boost_beyond_range_by_constant=False,
                ),
                interpolation=ScoringFunctionInterpolation.LINEAR,
            ),
            # Boost recently renovated hotels — freshness on date field
            FreshnessScoringFunction(
                field_name="lastRenovationDate",
                boost=1.5,
                parameters=FreshnessScoringParameters(boosting_duration=timedelta(days=365 * 5)),
                interpolation=ScoringFunctionInterpolation.LINEAR,
            ),
        ],
        function_aggregation=ScoringFunctionAggregation.SUM,
    )
]

index = SearchIndex(
    name=INDEX_NAME,
    fields=fields,
    scoring_profiles=scoring_profiles,
    default_scoring_profile="boostByRatingAndRecency",
)

index_client.create_or_update_index(index)
print("Index with scoring profile created.")
```

You can apply a scoring profile at the query time as well.

```python
results = search_client.search(
    search_text="hotel with great views",
    scoring_profile="boostByRatingAndRecency",
    select=["hotelId", "hotelName", "rating"],
)

for result in results:
    print(f"Score {result['@search.score']:.4f} — {result['hotelName']} ({result['rating']})")
```

Semantic ranking uses deep language models hosted in Azure AI Search to re-rank BM25 results by semantic relevance. It also generates **captions** (highlighted excerpts) and **answers** (direct responses to question-style queries).

> **Tier requirement:** Semantic ranking is available on the Basic tier and above. Enable it in **Azure Portal → Azure AI Search resource → Semantic ranker**.

We need to add a semantic configuration to the index.

```python
from azure.search.documents.indexes.models import (
    SemanticConfiguration,
    SemanticField,
    SemanticPrioritizedFields,
    SemanticSearch,
)

semantic_config = SemanticConfiguration(
    name="my-semantic-config",
    prioritized_fields=SemanticPrioritizedFields(
        title_field=SemanticField(field_name="hotelName"),
        content_fields=[SemanticField(field_name="description")],
        keywords_fields=[SemanticField(field_name="category")],
    ),
)

index = SearchIndex(
    name=INDEX_NAME,
    fields=fields,
    semantic_search=SemanticSearch(configurations=[semantic_config]),
)

index_client.create_or_update_index(index)
print("Semantic configuration added to index.")
```

The `search_client.search` is used to run a semantic query.

```python
from azure.search.documents.models import QueryType, QueryCaptionType, QueryAnswerType

results = search_client.search(
    search_text="What hotels have great views near the city centre?",
    query_type=QueryType.SEMANTIC,
    semantic_configuration_name="my-semantic-config",
    query_caption=QueryCaptionType.EXTRACTIVE,
    query_answer=QueryAnswerType.EXTRACTIVE,
    query_answer_count=3,
    select=["hotelId", "hotelName", "description"],
    top=5,
)

# Print semantic answers (direct responses to the question)
semantic_answers = results.get_answers()
if semantic_answers:
    print("=== Semantic Answers ===")
    for answer in semantic_answers:
        print(f"  Score: {answer.score:.4f}")
        print(f"  Text:  {answer.text}\n")

# Print results with captions
print("=== Results with Captions ===")
for result in results:
    print(f"\n{result['hotelName']}")
    captions = result.get("@search.captions", [])
    for caption in captions:
        print(f"  Caption: {caption.text}")
        if caption.highlights:
            print(f"  Highlighted: {caption.highlights}")
```

Each result includes a `@search.reranker_score` (0–4) alongside the BM25 `@search.score`. Sort or filter on the reranker score for the most semantically relevant results:

```python
results = search_client.search(
    search_text="quiet hotel near historic centre",
    query_type=QueryType.SEMANTIC,
    semantic_configuration_name="my-semantic-config",
    select=["hotelId", "hotelName"],
    top=10,
)

for result in results:
    bm25   = result["@search.score"]
    rerank = result.get("@search.reranker_score", 0)
    print(f"BM25: {bm25:.3f} | Reranker: {rerank:.3f} | {result['hotelName']}")
```

Vector search stores dense embedding vectors alongside your documents and retrieves results by nearest-neighbour similarity rather than keyword matching. This enables semantic retrieval even when the user's query shares no words with the document.

### Adding a vector field to the index

A vector field requires three additional properties: `vector_search_dimensions`, `vector_search_profile_name`, and the vector search algorithm configuration.

```python
from azure.search.documents.indexes.models import (
    SearchField,
    SearchFieldDataType,
    VectorSearch,
    HnswAlgorithmConfiguration,
    VectorSearchProfile,
)

fields = [
    SimpleField(name="hotelId", type=SearchFieldDataType.String, key=True),
    SearchableField(name="hotelName", type=SearchFieldDataType.String),
    SearchableField(name="description", type=SearchFieldDataType.String),
    SimpleField(name="category", type=SearchFieldDataType.String, filterable=True, facetable=True),
    SimpleField(name="rating", type=SearchFieldDataType.Double, filterable=True, sortable=True),
    # Vector field — stores the embedding of the description
    SearchField(
        name="descriptionVector",
        type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
        searchable=True,
        vector_search_dimensions=1536,          # must match your embedding model output
        vector_search_profile_name="myHnswProfile",
    ),
]

vector_search = VectorSearch(
    algorithms=[
        HnswAlgorithmConfiguration(
            name="myHnsw",
            parameters={
                "m": 4,
                "efConstruction": 400,
                "efSearch": 500,
                "metric": "cosine",
            },
        )
    ],
    profiles=[
        VectorSearchProfile(name="myHnswProfile", algorithm_configuration_name="myHnsw")
    ],
)

index = SearchIndex(
    name=INDEX_NAME,
    fields=fields,
    vector_search=vector_search,
)

index_client.create_or_update_index(index)
print("Vector-enabled index created.")
```

Use `cosine` for text embeddings from OpenAI models; use `dotProduct` for unit-normalised vectors.

### Generating embeddings with Azure OpenAI

```python
import os
from dotenv import load_dotenv
from openai import AzureOpenAI

load_dotenv()

embedding_client = AzureOpenAI(
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    api_version="2024-08-01-preview",
)

EMBEDDING_DEPLOYMENT = os.environ["AZURE_OPENAI_EMBEDDING_DEPLOYMENT"]  # e.g. "text-embedding-3-small"


def get_embedding(text: str) -> list[float]:
    response = embedding_client.embeddings.create(
        input=text,
        model=EMBEDDING_DEPLOYMENT,
    )
    return response.data[0].embedding
```

### Uploading documents with embeddings

```python
documents = [
    {
        "hotelId": "1",
        "hotelName": "Secret Point Motel",
        "description": "The hotel is ideally located on the main commercial artery of the city.",
        "category": "Boutique",
        "rating": 4.0,
    },
    {
        "hotelId": "2",
        "hotelName": "Twin Dome Motel",
        "description": "The hotel is situated in a 19th century plaza with rooms that are spacious.",
        "category": "Budget",
        "rating": 3.6,
    },
    {
        "hotelId": "3",
        "hotelName": "Triple Landscape Hotel",
        "description": "The Hotel stands out for its excellent location and the care given to its clientele.",
        "category": "Resort and Spa",
        "rating": 4.8,
    },
]

# Generate and attach embeddings before uploading
for doc in documents:
    doc["descriptionVector"] = get_embedding(doc["description"])

result = search_client.upload_documents(documents=documents)
for r in result:
    print(f"Upload {r.key}: {'ok' if r.succeeded else r.error_message}")
```

### Running a vector query

```python
from azure.search.documents.models import VectorizedQuery

query_text = "peaceful hotel away from the city noise"
query_vector = get_embedding(query_text)

vector_query = VectorizedQuery(
    vector=query_vector,
    k_nearest_neighbors=3,
    fields="descriptionVector",
)

results = search_client.search(
    search_text=None,          # pure vector — no keyword component
    vector_queries=[vector_query],
    select=["hotelId", "hotelName", "description"],
)

for result in results:
    print(f"Score: {result['@search.score']:.4f} — {result['hotelName']}")
    print(f"  {result['description']}\n")
```

The `@search.score` for vector queries is the cosine similarity (0–1; higher values indicate greater similarity).

Hybrid search runs a keyword (BM25) query and a vector query simultaneously, then merges the ranked results using **Reciprocal Rank Fusion (RRF)**. This reliably outperforms either approach alone because keyword search excels at exact matches while vector search excels at semantic similarity.

### Basic hybrid query

Simply provide both `search_text` and `vector_queries` in the same call:

```python
from azure.search.documents.models import VectorizedQuery

query_text = "boutique hotel with good parking"
query_vector = get_embedding(query_text)

vector_query = VectorizedQuery(
    vector=query_vector,
    k_nearest_neighbors=5,
    fields="descriptionVector",
)

results = search_client.search(
    search_text=query_text,       # keyword component
    vector_queries=[vector_query], # vector component
    select=["hotelId", "hotelName", "category", "rating"],
    top=5,
)

for result in results:
    print(f"RRF Score: {result['@search.score']:.4f} — {result['hotelName']} ({result['category']})")
```

The `@search.score` in hybrid mode is the RRF fusion score, not a raw BM25 or cosine score.

### Hybrid search with semantic reranking

For the highest quality results, add semantic reranking on top of the hybrid RRF results. The pipeline becomes: BM25 + vector → RRF fusion → semantic reranker:

```python
from azure.search.documents.models import VectorizedQuery, QueryType, QueryCaptionType

query_text = "historic hotel with character near old town"
query_vector = get_embedding(query_text)

vector_query = VectorizedQuery(
    vector=query_vector,
    k_nearest_neighbors=10,
    fields="descriptionVector",
)

results = search_client.search(
    search_text=query_text,
    vector_queries=[vector_query],
    query_type=QueryType.SEMANTIC,
    semantic_configuration_name="my-semantic-config",
    query_caption=QueryCaptionType.EXTRACTIVE,
    select=["hotelId", "hotelName", "description"],
    top=5,
)

for result in results:
    bm25_rrf = result["@search.score"]
    rerank   = result.get("@search.reranker_score", 0)
    captions = result.get("@search.captions", [])
    caption_text = captions[0].text if captions else ""

    print(f"RRF: {bm25_rrf:.3f} | Reranker: {rerank:.3f} | {result['hotelName']}")
    if caption_text:
        print(f"  Caption: {caption_text}")
```

### Filtering within vector and hybrid queries

Filters narrow the vector search candidate pool before nearest-neighbour retrieval — much more efficient than post-filtering:

```python
vector_query = VectorizedQuery(
    vector=query_vector,
    k_nearest_neighbors=5,
    fields="descriptionVector",
)

results = search_client.search(
    search_text=query_text,
    vector_queries=[vector_query],
    filter="rating ge 4.0 and parkingIncluded eq true",
    select=["hotelId", "hotelName", "rating"],
)

for result in results:
    print(f"{result['hotelName']} — {result['rating']}")
```

The following script creates a vector-enabled index with a semantic configuration, uploads documents with embeddings, and demonstrates all four query types in sequence:

```python
# azure_search_advanced.py
import os
import time
from dotenv import load_dotenv
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex, SimpleField, SearchableField, SearchField, SearchFieldDataType,
    VectorSearch, HnswAlgorithmConfiguration, VectorSearchProfile,
    SemanticConfiguration, SemanticField, SemanticPrioritizedFields, SemanticSearch,
)
from azure.search.documents.models import (
    VectorizedQuery, QueryType, QueryCaptionType, QueryAnswerType,
)
from openai import AzureOpenAI

load_dotenv()

ENDPOINT             = os.environ["AZURE_SEARCH_ENDPOINT"]
ADMIN_KEY            = os.environ["AZURE_SEARCH_ADMIN_KEY"]
INDEX_NAME           = "hotels-full-demo"
OAI_ENDPOINT         = os.environ["AZURE_OPENAI_ENDPOINT"]
OAI_KEY              = os.environ["AZURE_OPENAI_API_KEY"]
EMBEDDING_DEPLOYMENT = os.environ["AZURE_OPENAI_EMBEDDING_DEPLOYMENT"]

cred          = AzureKeyCredential(ADMIN_KEY)
index_client  = SearchIndexClient(endpoint=ENDPOINT, credential=cred)
search_client = SearchClient(endpoint=ENDPOINT, index_name=INDEX_NAME, credential=cred)

emb_client = AzureOpenAI(api_key=OAI_KEY, azure_endpoint=OAI_ENDPOINT, api_version="2024-08-01-preview")


def get_embedding(text: str) -> list[float]:
    return emb_client.embeddings.create(input=text, model=EMBEDDING_DEPLOYMENT).data[0].embedding


# ---- 1. Create index ----
def setup_index():
    fields = [
        SimpleField(name="hotelId", type=SearchFieldDataType.String, key=True),
        SearchableField(name="hotelName", type=SearchFieldDataType.String, sortable=True),
        SearchableField(name="description", type=SearchFieldDataType.String),
        SimpleField(name="category", type=SearchFieldDataType.String, filterable=True, facetable=True),
        SimpleField(name="rating", type=SearchFieldDataType.Double, filterable=True, sortable=True, facetable=True),
        SimpleField(name="parkingIncluded", type=SearchFieldDataType.Boolean, filterable=True, facetable=True),
        SearchField(
            name="descriptionVector",
            type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
            searchable=True,
            vector_search_dimensions=1536,
            vector_search_profile_name="myProfile",
        ),
    ]

    index = SearchIndex(
        name=INDEX_NAME,
        fields=fields,
        vector_search=VectorSearch(
            algorithms=[HnswAlgorithmConfiguration(name="myHnsw", parameters={"metric": "cosine"})],
            profiles=[VectorSearchProfile(name="myProfile", algorithm_configuration_name="myHnsw")],
        ),
        semantic_search=SemanticSearch(
            configurations=[SemanticConfiguration(
                name="my-semantic-config",
                prioritized_fields=SemanticPrioritizedFields(
                    title_field=SemanticField(field_name="hotelName"),
                    content_fields=[SemanticField(field_name="description")],
                ),
            )]
        ),
    )

    index_client.create_or_update_index(index)
    print("Index created/updated.")


# ---- 2. Upload documents ----
def upload_docs():
    raw = [
        {"hotelId": "1", "hotelName": "Secret Point Motel", "description": "Located on the main commercial artery.", "category": "Boutique", "rating": 4.0, "parkingIncluded": False},
        {"hotelId": "2", "hotelName": "Twin Dome Motel", "description": "Spacious rooms in a 19th century plaza.", "category": "Budget", "rating": 3.6, "parkingIncluded": False},
        {"hotelId": "3", "hotelName": "Triple Landscape Hotel", "description": "Excellent location and great care for guests.", "category": "Resort and Spa", "rating": 4.8, "parkingIncluded": True},
        {"hotelId": "4", "hotelName": "Sublime Cliff Hotel", "description": "In the heart of the historic city centre with stunning views.", "category": "Boutique", "rating": 4.6, "parkingIncluded": True},
    ]
    for doc in raw:
        doc["descriptionVector"] = get_embedding(doc["description"])

    search_client.upload_documents(documents=raw)
    print("Documents uploaded. Waiting for indexing...")
    time.sleep(3)


# ---- 3. Run all query types ----
def run_queries():
    query = "quiet hotel with parking near historic old town"
    vec   = get_embedding(query)

    print("\n=== Full-text Search ===")
    for r in search_client.search(query, select=["hotelName", "rating"], top=3):
        print(f"  {r['hotelName']} ({r['rating']}) — score {r['@search.score']:.3f}")

    print("\n=== Vector Search ===")
    vq = VectorizedQuery(vector=vec, k_nearest_neighbors=3, fields="descriptionVector")
    for r in search_client.search(search_text=None, vector_queries=[vq], select=["hotelName", "rating"], top=3):
        print(f"  {r['hotelName']} ({r['rating']}) — score {r['@search.score']:.4f}")

    print("\n=== Hybrid Search ===")
    for r in search_client.search(query, vector_queries=[vq], select=["hotelName", "rating"], top=3):
        print(f"  {r['hotelName']} ({r['rating']}) — RRF {r['@search.score']:.4f}")

    print("\n=== Hybrid + Semantic Reranking ===")
    vq2 = VectorizedQuery(vector=vec, k_nearest_neighbors=10, fields="descriptionVector")
    for r in search_client.search(
        query,
        vector_queries=[vq2],
        query_type=QueryType.SEMANTIC,
        semantic_configuration_name="my-semantic-config",
        query_caption=QueryCaptionType.EXTRACTIVE,
        select=["hotelName", "rating"],
        top=3,
    ):
        rerank = r.get("@search.reranker_score", 0)
        print(f"  {r['hotelName']} ({r['rating']}) — reranker {rerank:.3f}")

    print("\n=== Facets ===")
    facet_results = search_client.search("*", facets=["category", "rating,interval:1"]).get_facets()
    for cat in facet_results.get("category", []):
        print(f"  {cat['value']}: {cat['count']}")


if __name__ == "__main__":
    setup_index()
    upload_docs()
    run_queries()
```

In this part, we covered the five advanced pillars of the Azure AI Search Python SDK:

- **Faceted navigation** — requesting facets on filterable fields, parsing bucket counts, and applying selections as filter expressions.
- **Scoring profiles** — boosting relevance with field text weights, magnitude functions (numeric range), and freshness functions (date proximity).
- **Semantic ranking** — adding a `SemanticConfiguration` to an index and using `QueryType.SEMANTIC` to re-rank results, extract captions, and retrieve direct answers.
- **Vector search** — defining a vector field with `HnswAlgorithmConfiguration`, generating embeddings with Azure OpenAI, uploading documents with vector data, and querying with `VectorizedQuery`.
- **Hybrid search** — combining BM25 keyword search and vector retrieval with RRF fusion, and optionally layering semantic reranking on top for the highest possible relevance.

In the next part of this series on Azure AI Search, we will move up the stack: managing indexers and data sources via `SearchIndexerClient`, building skill set pipelines in Python (OCR, entity recognition, key phrase extraction), and integrating vectorization so that embeddings are generated automatically during indexing.

