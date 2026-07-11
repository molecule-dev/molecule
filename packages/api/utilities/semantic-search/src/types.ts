/**
 * Parameter and result types for semantic search.
 *
 * These describe the public surface of `indexDocuments`, `search`, and
 * `removeDocuments` — a corpus-indexing + semantic-query capability built
 * by composing the `ai-embeddings` and `ai-vector-store` bonds.
 *
 * @module
 */

import type { MetadataFilter } from '@molecule/api-ai-vector-store'

/**
 * A single document to index into a semantic-search collection.
 */
export interface SemanticDocument {
  /** Stable unique identifier for this document (used as the vector record id). */
  id: string
  /** The document's text — embedded and stored so it can be returned on a hit. */
  text: string
  /** Arbitrary metadata stored alongside the vector and usable as a search filter. */
  metadata?: Record<string, unknown>
}

/**
 * Parameters for {@link indexDocuments}.
 */
export interface IndexDocumentsParams {
  /** The collection/namespace to index the documents into. */
  collection: string
  /** The documents to embed and upsert. An empty array is a no-op. */
  documents: SemanticDocument[]
  /** Embedding model override (provider-specific). Falls back to the provider default. */
  model?: string
}

/**
 * Result of {@link indexDocuments}.
 */
export interface IndexResult {
  /** Number of documents embedded and upserted. */
  indexed: number
  /** Dimensionality of the embedding vectors (0 when no documents were indexed). */
  dimension: number
}

/**
 * Parameters for {@link search}.
 */
export interface SearchParams {
  /** The collection/namespace to search within. */
  collection: string
  /** The natural-language query to embed and match against the corpus. */
  query: string
  /** Maximum number of results to return (provider default applies when omitted). */
  topK?: number
  /** Optional metadata filters to narrow results before scoring. */
  filter?: MetadataFilter[]
  /** Minimum similarity score threshold — hits below this are excluded. */
  minScore?: number
  /** Embedding model override (provider-specific). Falls back to the provider default. */
  model?: string
}

/**
 * A single semantic-search hit.
 */
export interface SearchHit {
  /** The matched document's id. */
  id: string
  /** Similarity score (higher is more similar). */
  score: number
  /** Metadata stored with the matched document, if any. */
  metadata?: Record<string, unknown>
  /** The matched document's original text, if the store retained it. */
  content?: string
}

/**
 * Parameters for {@link removeDocuments}.
 */
export interface RemoveDocumentsParams {
  /** The collection/namespace to remove documents from. */
  collection: string
  /** Ids of the documents to remove. */
  ids: string[]
}
