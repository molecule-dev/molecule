import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type AIEmbeddingsProvider,
  type EmbeddingResult,
  type EmbedParams,
  setProvider as setEmbeddingsProvider,
} from '@molecule/api-ai-embeddings'
import {
  type AIVectorStoreProvider,
  type MetadataFilter,
  setProvider as setVectorStoreProvider,
  type VectorRecord,
  type VectorSearchResult,
} from '@molecule/api-ai-vector-store'

import { indexDocuments, removeDocuments, search } from '../search.js'

const DIM = 8

/**
 * Deterministic bag-of-words embedding: hash each token into one of DIM
 * buckets and count. Equal strings always produce equal vectors, and two
 * texts sharing tokens land close in cosine space — enough to assert ranking.
 */
function embedText(text: string): number[] {
  const vec = new Array<number>(DIM).fill(0)
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  for (const token of tokens) {
    let hash = 0
    for (const ch of token) hash += ch.charCodeAt(0)
    vec[hash % DIM] += 1
  }
  return vec
}

/** Cosine similarity of two equal-length vectors. */
function cosine(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/** Evaluate a single MetadataFilter against a record's metadata. */
function matchFilter(
  metadata: Record<string, unknown> | undefined,
  filter: MetadataFilter,
): boolean {
  const value = metadata?.[filter.field]
  switch (filter.operator) {
    case 'eq':
      return value === filter.value
    case 'ne':
      return value !== filter.value
    case 'gt':
      return typeof value === 'number' && value > filter.value
    case 'gte':
      return typeof value === 'number' && value >= filter.value
    case 'lt':
      return typeof value === 'number' && value < filter.value
    case 'lte':
      return typeof value === 'number' && value <= filter.value
    case 'in':
      return filter.value.includes(value as string | number)
    default:
      return true
  }
}

/** A deterministic embeddings provider whose methods are spies. */
function createMockEmbeddings(): AIEmbeddingsProvider {
  return {
    name: 'mock-embeddings',
    embed: vi.fn(async (params: EmbedParams): Promise<EmbeddingResult> => {
      const texts = Array.isArray(params.input) ? params.input : [params.input]
      return {
        embeddings: texts.map(embedText),
        model: params.model ?? 'mock-embed-default',
        usage: { promptTokens: 0, totalTokens: 0 },
      }
    }),
    embedQuery: vi.fn(async (text: string): Promise<number[]> => embedText(text)),
    embedDocuments: vi.fn(async (texts: string[]): Promise<number[][]> => texts.map(embedText)),
  }
}

/** A tiny in-memory vector store with cosine query honoring topK/filter/minScore. */
function createMockVectorStore(): AIVectorStoreProvider {
  const collections = new Map<string, Map<string, VectorRecord>>()
  return {
    name: 'mock-vector-store',
    createCollection: vi.fn(async ({ name }): Promise<void> => {
      if (!collections.has(name)) collections.set(name, new Map())
    }),
    deleteCollection: vi.fn(async (name: string): Promise<void> => {
      collections.delete(name)
    }),
    listCollections: vi.fn(async (): Promise<string[]> => [...collections.keys()]),
    upsert: vi.fn(async ({ collection, records }): Promise<void> => {
      const col = collections.get(collection) ?? new Map<string, VectorRecord>()
      collections.set(collection, col)
      for (const record of records) {
        col.set(record.id, {
          id: record.id,
          embedding: record.embedding,
          metadata: record.metadata,
          content: record.content,
        })
      }
    }),
    query: vi.fn(
      async ({ collection, embedding, topK, filter, minScore }): Promise<VectorSearchResult[]> => {
        const col = collections.get(collection)
        if (!col) return []
        let records = [...col.values()]
        if (filter)
          records = records.filter((record) => filter.every((f) => matchFilter(record.metadata, f)))
        let hits = records.map((record) => ({ record, score: cosine(embedding, record.embedding) }))
        if (minScore !== undefined) hits = hits.filter((hit) => hit.score >= minScore)
        hits.sort((a, b) => b.score - a.score)
        if (topK !== undefined) hits = hits.slice(0, topK)
        return hits
      },
    ),
    fetch: vi.fn(async ({ collection, ids }): Promise<VectorRecord[]> => {
      const col = collections.get(collection)
      if (!col) return []
      return ids.map((id) => col.get(id)).filter((r): r is VectorRecord => r !== undefined)
    }),
    delete: vi.fn(async ({ collection, ids }): Promise<void> => {
      const col = collections.get(collection)
      if (col) for (const id of ids) col.delete(id)
    }),
  }
}

let embeddings: AIEmbeddingsProvider
let vectorStore: AIVectorStoreProvider

beforeEach(() => {
  vi.resetAllMocks()
  embeddings = createMockEmbeddings()
  vectorStore = createMockVectorStore()
  setEmbeddingsProvider(embeddings)
  setVectorStoreProvider(vectorStore)
})

describe('indexDocuments', () => {
  it('returns {indexed, dimension} and populates the store', async () => {
    const result = await indexDocuments({
      collection: 'docs',
      documents: [
        { id: 'a', text: 'cats are feline animals' },
        { id: 'b', text: 'cars are fast vehicles' },
      ],
    })
    expect(result).toEqual({ indexed: 2, dimension: DIM })
    // The store now contains both records.
    const fetched = await vectorStore.fetch({ collection: 'docs', ids: ['a', 'b'] })
    expect(fetched.map((r) => r.id).sort()).toEqual(['a', 'b'])
    expect(fetched.find((r) => r.id === 'a')?.content).toBe('cats are feline animals')
  })

  it('short-circuits on empty documents without calling either provider', async () => {
    const result = await indexDocuments({ collection: 'docs', documents: [] })
    expect(result).toEqual({ indexed: 0, dimension: 0 })
    expect(embeddings.embedDocuments).not.toHaveBeenCalled()
    expect(embeddings.embed).not.toHaveBeenCalled()
    expect(vectorStore.listCollections).not.toHaveBeenCalled()
    expect(vectorStore.createCollection).not.toHaveBeenCalled()
    expect(vectorStore.upsert).not.toHaveBeenCalled()
  })

  it('creates the collection only when it does not already exist (idempotent)', async () => {
    await indexDocuments({ collection: 'docs', documents: [{ id: 'a', text: 'one' }] })
    expect(vectorStore.createCollection).toHaveBeenCalledTimes(1)
    expect(vectorStore.createCollection).toHaveBeenCalledWith({
      name: 'docs',
      dimension: DIM,
      metric: 'cosine',
    })
    // Second index into the same collection must not re-create it.
    await indexDocuments({ collection: 'docs', documents: [{ id: 'b', text: 'two' }] })
    expect(vectorStore.createCollection).toHaveBeenCalledTimes(1)
  })

  it('forwards the model param to embed() (not embedDocuments) when provided', async () => {
    await indexDocuments({
      collection: 'docs',
      documents: [{ id: 'a', text: 'hello world' }],
      model: 'text-embedding-3-large',
    })
    expect(embeddings.embed).toHaveBeenCalledWith({
      input: ['hello world'],
      model: 'text-embedding-3-large',
    })
    expect(embeddings.embedDocuments).not.toHaveBeenCalled()
  })

  it('uses embedDocuments (not embed) when no model is provided', async () => {
    await indexDocuments({ collection: 'docs', documents: [{ id: 'a', text: 'hello world' }] })
    expect(embeddings.embedDocuments).toHaveBeenCalledWith(['hello world'])
    expect(embeddings.embed).not.toHaveBeenCalled()
  })

  it('stores each document’s metadata and content on its record', async () => {
    await indexDocuments({
      collection: 'docs',
      documents: [{ id: 'a', text: 'body text', metadata: { topic: 'animals' } }],
    })
    const [record] = await vectorStore.fetch({ collection: 'docs', ids: ['a'] })
    expect(record.metadata).toEqual({ topic: 'animals' })
    expect(record.content).toBe('body text')
  })
})

describe('search', () => {
  const corpus = [
    { id: 'apple', text: 'apple banana cherry', metadata: { topic: 'fruit' } },
    { id: 'zebra', text: 'zebra lion tiger', metadata: { topic: 'animals' } },
    { id: 'grape', text: 'grape melon peach', metadata: { topic: 'fruit' } },
  ]

  it('returns results ranked by similarity to the query', async () => {
    await indexDocuments({ collection: 'docs', documents: corpus })
    // Query text is identical to the "apple" doc → it must rank first (cosine 1.0).
    const hits = await search({ collection: 'docs', query: 'apple banana cherry' })
    expect(hits[0].id).toBe('apple')
    expect(hits[0].score).toBeCloseTo(1, 5)
    // Every following hit is no more similar than the top one.
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i].score).toBeLessThanOrEqual(hits[i - 1].score)
    }
  })

  it('maps hits to {id, score, metadata, content}', async () => {
    await indexDocuments({ collection: 'docs', documents: corpus })
    const [top] = await search({ collection: 'docs', query: 'apple banana cherry' })
    expect(top).toMatchObject({
      id: 'apple',
      metadata: { topic: 'fruit' },
      content: 'apple banana cherry',
    })
    expect(typeof top.score).toBe('number')
  })

  it('limits results with topK', async () => {
    await indexDocuments({ collection: 'docs', documents: corpus })
    const hits = await search({ collection: 'docs', query: 'apple banana cherry', topK: 1 })
    expect(hits).toHaveLength(1)
  })

  it('passes the filter through to the store and narrows results', async () => {
    await indexDocuments({ collection: 'docs', documents: corpus })
    const filter: MetadataFilter[] = [{ field: 'topic', operator: 'eq', value: 'animals' }]
    const hits = await search({ collection: 'docs', query: 'zebra lion tiger', filter })
    // Only the animals doc survives the filter.
    expect(hits.map((h) => h.id)).toEqual(['zebra'])
    // And the filter reached the store verbatim.
    expect(vectorStore.query).toHaveBeenCalledWith(expect.objectContaining({ filter }))
  })

  it('forwards minScore to the store', async () => {
    await indexDocuments({ collection: 'docs', documents: corpus })
    await search({ collection: 'docs', query: 'apple banana cherry', minScore: 0.99 })
    expect(vectorStore.query).toHaveBeenCalledWith(expect.objectContaining({ minScore: 0.99 }))
    // With a 0.99 threshold, only the exact-match doc qualifies.
    const hits = await search({ collection: 'docs', query: 'apple banana cherry', minScore: 0.99 })
    expect(hits.map((h) => h.id)).toEqual(['apple'])
  })

  it('forwards the model param to embed() (not embedQuery) when provided', async () => {
    await indexDocuments({ collection: 'docs', documents: corpus })
    await search({
      collection: 'docs',
      query: 'apple banana cherry',
      model: 'text-embedding-3-small',
    })
    expect(embeddings.embed).toHaveBeenCalledWith({
      input: 'apple banana cherry',
      model: 'text-embedding-3-small',
    })
    expect(embeddings.embedQuery).not.toHaveBeenCalled()
  })

  it('uses embedQuery (not embed) when no model is provided', async () => {
    await indexDocuments({ collection: 'docs', documents: corpus })
    // Reset the index-time embed spy so this asserts only the search path.
    vi.mocked(embeddings.embed).mockClear()
    await search({ collection: 'docs', query: 'apple banana cherry' })
    expect(embeddings.embedQuery).toHaveBeenCalledWith('apple banana cherry')
    expect(embeddings.embed).not.toHaveBeenCalled()
  })
})

describe('removeDocuments', () => {
  it('deletes the given ids from the collection', async () => {
    await indexDocuments({
      collection: 'docs',
      documents: [
        { id: 'a', text: 'apple banana cherry' },
        { id: 'b', text: 'zebra lion tiger' },
      ],
    })
    await removeDocuments({ collection: 'docs', ids: ['a'] })
    expect(vectorStore.delete).toHaveBeenCalledWith({ collection: 'docs', ids: ['a'] })
    // The removed doc is gone; the other remains.
    const remaining = await vectorStore.fetch({ collection: 'docs', ids: ['a', 'b'] })
    expect(remaining.map((r) => r.id)).toEqual(['b'])
  })
})

describe('unbonded providers', () => {
  it('indexDocuments rejects when no provider is bonded', async () => {
    vi.resetModules()
    const { indexDocuments: freshIndex } = await import('../search.js')
    await expect(
      freshIndex({ collection: 'docs', documents: [{ id: 'a', text: 'x' }] }),
    ).rejects.toThrow(/not configured/)
  })

  it('search rejects when no provider is bonded', async () => {
    vi.resetModules()
    const { search: freshSearch } = await import('../search.js')
    await expect(freshSearch({ collection: 'docs', query: 'x' })).rejects.toThrow(/not configured/)
  })
})
