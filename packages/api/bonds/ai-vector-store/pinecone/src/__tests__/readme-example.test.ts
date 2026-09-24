/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real
 * `@molecule/api-ai-vector-store` core. Only the Pinecone SDK (the network) is
 * mocked, the same way `provider.test.ts` does.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockClient, mockIndex, clientOptions } = vi.hoisted(() => {
  const mockIndex = {
    upsert: vi.fn(),
    query: vi.fn(),
    fetch: vi.fn(),
    deleteMany: vi.fn(),
  }
  const mockClient = {
    createIndex: vi.fn(),
    deleteIndex: vi.fn(),
    listIndexes: vi.fn(),
    describeIndex: vi.fn(),
    index: vi.fn().mockReturnValue(mockIndex),
  }
  const clientOptions: unknown[] = []
  return { mockClient, mockIndex, clientOptions }
})

vi.mock('@pinecone-database/pinecone', () => ({
  Pinecone: class MockPinecone {
    createIndex = mockClient.createIndex
    deleteIndex = mockClient.deleteIndex
    listIndexes = mockClient.listIndexes
    describeIndex = mockClient.describeIndex
    index = mockClient.index
    constructor(options: unknown) {
      clientOptions.push(options)
    }
  },
}))

import { requireProvider, setProvider } from '@molecule/api-ai-vector-store'

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('creates an index, upserts records and returns the nearest match', async () => {
    vi.stubEnv('PINECONE_API_KEY', 'test-key')
    mockIndex.query.mockResolvedValue({
      matches: [
        {
          id: 'login',
          score: 0.99,
          values: [0, 0.2, 0.9],
          metadata: { topic: 'auth', _content: 'Reset password' },
        },
      ],
    })

    setProvider(
      createProvider({ apiKey: process.env.PINECONE_API_KEY, cloud: 'aws', region: 'us-east-1' }),
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

    expect(clientOptions.at(-1)).toEqual({ apiKey: 'test-key' })
    expect(mockClient.createIndex).toHaveBeenCalledWith({
      name: 'mol-docs',
      dimension: 3,
      metric: 'cosine',
      spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
      waitUntilReady: true,
    })
    expect(mockClient.index).toHaveBeenCalledWith({ name: 'mol-docs' })
    expect(mockIndex.upsert).toHaveBeenCalledWith({
      records: [
        {
          id: 'billing',
          values: [0.9, 0.1, 0],
          metadata: { topic: 'billing', _content: 'Invoices' },
        },
        {
          id: 'login',
          values: [0, 0.2, 0.9],
          metadata: { topic: 'auth', _content: 'Reset password' },
        },
      ],
    })
    expect(mockIndex.query).toHaveBeenCalledWith({
      vector: [0, 0.1, 1],
      topK: 1,
      includeMetadata: true,
      includeValues: true,
    })
  })
})
