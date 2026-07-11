/**
 * Types for the `ai-rag` capability — Retrieval-Augmented Generation.
 *
 * These describe the public surface of the composed RAG provider: `ingest`
 * (embed + index a corpus via `@molecule/api-semantic-search`), `query`
 * (retrieve relevant chunks, then generate a grounded answer with the bonded
 * `@molecule/api-ai` chat provider), and `remove`. Retrieval types are reused
 * from the packages RAG composes rather than redefined — `SearchHit` from
 * `@molecule/api-semantic-search`, `MetadataFilter` from
 * `@molecule/api-ai-vector-store`, and `TokenUsage` from `@molecule/api-ai`.
 *
 * @module
 */

import type { TokenUsage } from '@molecule/api-ai'
import type { MetadataFilter } from '@molecule/api-ai-vector-store'
import type { SearchHit } from '@molecule/api-semantic-search'

/**
 * A single document to ingest into a RAG collection.
 */
export interface RagDocument {
  /** Stable unique identifier for this document (used as the vector record id). */
  id: string
  /** The document's text — embedded, stored, and returned as a source on retrieval. */
  text: string
  /** Arbitrary metadata stored alongside the vector and usable as a query filter. */
  metadata?: Record<string, unknown>
}

/**
 * Parameters for {@link AIRagProvider.ingest}.
 */
export interface IngestInput {
  /** The collection/namespace to index the documents into. */
  collection: string
  /** The documents to embed and upsert. An empty array is a no-op. */
  documents: RagDocument[]
  /** Embedding model override (provider-specific). Falls back to the provider default. */
  model?: string
}

/**
 * Result of {@link AIRagProvider.ingest}.
 */
export interface IngestResult {
  /** Number of documents embedded and upserted. */
  indexed: number
  /** Dimensionality of the embedding vectors (0 when no documents were indexed). */
  dimension: number
}

/**
 * Parameters for {@link AIRagProvider.query}.
 */
export interface RagQueryInput {
  /** The collection/namespace to retrieve context from. */
  collection: string
  /** The natural-language question to answer. */
  query: string
  /** Number of chunks to retrieve and ground the answer on (default 5). */
  topK?: number
  /** Optional metadata filters to narrow retrieval before scoring. */
  filter?: MetadataFilter[]
  /** Minimum similarity score threshold — retrieved chunks below this are excluded. */
  minScore?: number
  /** Extra system guidance appended to the grounding instructions for the answer. */
  system?: string
  /** AI chat model override (provider-specific). Falls back to the provider default. */
  model?: string
  /** Named AI provider to answer with. Omit to use the bonded singleton AI provider. */
  provider?: string
  /** Abort signal forwarded to the AI chat call to cancel in-flight generation. */
  signal?: AbortSignal
}

/**
 * Result of {@link AIRagProvider.query}.
 */
export interface RagQueryResult {
  /** The generated answer, grounded in and citing the retrieved sources. */
  answer: string
  /** The retrieved chunks the answer was grounded on, ranked most-similar first. */
  sources: SearchHit[]
  /** Token usage reported by the AI provider for the answer generation, if any. */
  usage?: TokenUsage
}

/**
 * Parameters for {@link AIRagProvider.remove}.
 */
export interface RemoveInput {
  /** The collection/namespace to remove documents from. */
  collection: string
  /** Ids of the documents to remove. */
  ids: string[]
}

/**
 * Retrieval-Augmented Generation contract.
 *
 * A provider ingests a document corpus, then answers questions grounded in the
 * most relevant retrieved chunks. The default provider composes
 * `@molecule/api-semantic-search` (retrieval) with the bonded `@molecule/api-ai`
 * chat provider (generation); swap either underlying bond without touching
 * consumers.
 */
export interface AIRagProvider {
  /** Human-readable provider name (the default composed provider is `'default'`). */
  readonly name: string
  /**
   * Embed and index a corpus of documents into a collection.
   *
   * @param input - The collection, documents, and optional embedding model.
   * @returns The number of documents indexed and the embedding dimensionality.
   */
  ingest(input: IngestInput): Promise<IngestResult>
  /**
   * Retrieve the most relevant chunks for a question, then generate an answer
   * grounded in (and citing) them.
   *
   * @param input - The collection, question, and optional retrieval/generation overrides.
   * @returns The grounded answer, the retrieved sources, and token usage.
   */
  query(input: RagQueryInput): Promise<RagQueryResult>
  /**
   * Remove previously-ingested documents from a collection by their ids.
   *
   * @param input - The collection and the ids of the documents to remove.
   * @returns A promise that resolves once the documents have been deleted.
   */
  remove(input: RemoveInput): Promise<void>
}

/**
 * Config options for an AI RAG bond.
 */
export interface AIRagConfig {
  [key: string]: unknown
}
