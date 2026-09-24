/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real
 * `@molecule/api-ai-vector-store` core. Only the `chromadb` client (the network
 * to the ChromaDB server) is mocked, the same way `provider.test.ts` does.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockClient, mockCollection, clientOptions } = vi.hoisted(() => {
  const mockCollection = {
    name: 'mol_docs',
    metadata: { _mol_dimension: 3, _mol_metric: 'cosine', 'hnsw:space': 'cosine' },
    upsert: vi.fn(),
    query: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  }
  const mockClient = {
    createCollection: vi.fn(),
    deleteCollection: vi.fn(),
    listCollections: vi.fn(),
    getCollection: vi.fn().mockResolvedValue(mockCollection),
  }
  const clientOptions: unknown[] = []
  return { mockClient, mockCollection, clientOptions }
})

vi.mock('chromadb', () => ({
  ChromaClient: class MockChromaClient {
    createCollection = mockClient.createCollection
    deleteCollection = mockClient.deleteCollection
    listCollections = mockClient.listCollections
    getCollection = mockClient.getCollection
    constructor(options: unknown) {
      clientOptions.push(options)
    }
  },
  IncludeEnum: {
    distances: 'distances',
    documents: 'documents',
    embeddings: 'embeddings',
    metadatas: 'metadatas',
    uris: 'uris',
  },
}))

import { requireProvider, setProvider } from '@molecule/api-ai-vector-store'

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('creates a collection, upserts records and returns the nearest match', async () => {
    vi.stubEnv('CHROMA_HOST', undefined)
    vi.stubEnv('CHROMA_PORT', undefined)
    vi.stubEnv('CHROMA_API_KEY', undefined)
    mockCollection.query.mockResolvedValue({
      ids: [['login']],
      embeddings: [[[0, 0.2, 0.9]]],
      metadatas: [[{ topic: 'auth', _content: 'Reset password' }]],
      distances: [[0.01]],
    })

    setProvider(
      createProvider({
        host: process.env.CHROMA_HOST ?? 'localhost',
        port: Number(process.env.CHROMA_PORT ?? 8000),
        apiKey: process.env.CHROMA_API_KEY,
      }),
    )

    const store = requireProvider()
    await store.createCollection({ name: 'docs', dimension: 3, metric: 'cosine' })
    await store.upsert({
      collection: 'docs',
      records: [
        {
          id: 'billing',
          embedding: [0.9, 0.1, 0],
          metadata: { topic: 'billing' },
          content: 'Invoices',
        },
        {
          id: 'login',
          embedding: [0, 0.2, 0.9],
          metadata: { topic: 'auth' },
          content: 'Reset password',
        },
      ],
    })

    const hits = await store.query({ collection: 'docs', embedding: [0, 0.1, 1], topK: 1 })

    expect([hits[0]?.record.id, hits[0]?.record.content, hits[0]?.score]).toEqual([
      'login',
      'Reset password',
      0.99,
    ])
    expect(hits[0]?.record.metadata).toEqual({ topic: 'auth' })

    expect(clientOptions.at(-1)).toMatchObject({ host: 'localhost', port: 8000, ssl: false })
    expect(mockClient.createCollection).toHaveBeenCalledWith({
      name: 'mol_docs',
      metadata: { _mol_dimension: 3, _mol_metric: 'cosine', 'hnsw:space': 'cosine' },
    })
    expect(mockCollection.upsert).toHaveBeenCalledWith({
      ids: ['billing', 'login'],
      embeddings: [
        [0.9, 0.1, 0],
        [0, 0.2, 0.9],
      ],
      metadatas: [
        { topic: 'billing', _content: 'Invoices' },
        { topic: 'auth', _content: 'Reset password' },
      ],
    })
    expect(mockCollection.query).toHaveBeenCalledWith(
      expect.objectContaining({ queryEmbeddings: [[0, 0.1, 1]], nResults: 1 }),
    )
  })
})
