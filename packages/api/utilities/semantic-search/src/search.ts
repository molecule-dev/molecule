/**
 * Semantic search logic — index a document corpus, then query it by meaning.
 *
 * Composes the `@molecule/api-ai-embeddings` bond (to turn text into vectors)
 * and the `@molecule/api-ai-vector-store` bond (to persist + similarity-search
 * those vectors). Works with any provider mix — swap either bond without
 * touching this code.
 *
 * @module
 */

import { requireProvider as requireEmbeddings } from '@molecule/api-ai-embeddings'
import { requireProvider as requireVectorStore } from '@molecule/api-ai-vector-store'

import type {
  IndexDocumentsParams,
  IndexResult,
  RemoveDocumentsParams,
  SearchHit,
  SearchParams,
} from './types.js'

/**
 * Embed a corpus of documents and upsert them into a vector-store collection,
 * creating the collection on first use.
 *
 * When `documents` is empty this short-circuits and returns without touching
 * either provider. The embedding model is chosen via `model` when supplied,
 * otherwise the provider's `embedDocuments` default is used. The target
 * collection is ensured idempotently — it is only created if not already present.
 *
 * @param params - The collection, documents, and optional embedding model.
 * @returns The number of documents indexed and the embedding dimensionality.
 */
export async function indexDocuments(params: IndexDocumentsParams): Promise<IndexResult> {
  const { collection, documents, model } = params

  if (documents.length === 0) {
    return { indexed: 0, dimension: 0 }
  }

  const embeddings = requireEmbeddings()
  const vectorStore = requireVectorStore()

  const texts = documents.map((document) => document.text)
  const vectors = model
    ? await embeddings.embed({ input: texts, model }).then((result) => result.embeddings)
    : await embeddings.embedDocuments(texts)

  const dimension = vectors[0].length

  const existingCollections = await vectorStore.listCollections()
  if (!existingCollections.includes(collection)) {
    await vectorStore.createCollection({ name: collection, dimension, metric: 'cosine' })
  }

  await vectorStore.upsert({
    collection,
    records: documents.map((document, index) => ({
      id: document.id,
      embedding: vectors[index],
      metadata: document.metadata,
      content: document.text,
    })),
  })

  return { indexed: documents.length, dimension }
}

/**
 * Semantically search an indexed collection: embed the query, then return the
 * most similar documents ranked by similarity.
 *
 * The query is embedded with `model` when supplied, otherwise the provider's
 * `embedQuery` default. `topK`, `filter`, and `minScore` are forwarded to the
 * vector store to bound, narrow, and threshold the results respectively.
 *
 * @param params - The collection, query text, and optional topK/filter/minScore/model.
 * @returns The matching documents (id, score, metadata, content) ranked most-similar first.
 */
export async function search(params: SearchParams): Promise<SearchHit[]> {
  const { collection, query, topK, filter, minScore, model } = params

  const embeddings = requireEmbeddings()
  const vectorStore = requireVectorStore()

  const embedding = model
    ? await embeddings.embed({ input: query, model }).then((result) => result.embeddings[0])
    : await embeddings.embedQuery(query)

  const results = await vectorStore.query({ collection, embedding, topK, filter, minScore })

  return results.map((result) => ({
    id: result.record.id,
    score: result.score,
    metadata: result.record.metadata,
    content: result.record.content,
  }))
}

/**
 * Remove previously-indexed documents from a collection by their ids.
 *
 * @param params - The collection and the ids of the documents to remove.
 * @returns A promise that resolves once the documents have been deleted.
 */
export async function removeDocuments(params: RemoveDocumentsParams): Promise<void> {
  const vectorStore = requireVectorStore()
  await vectorStore.delete({ collection: params.collection, ids: params.ids })
}
