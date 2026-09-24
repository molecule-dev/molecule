/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the `@elastic/elasticsearch`
 * client (the network) is mocked.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createIndex, index, search, setProvider } from '@molecule/api-search'

const es = vi.hoisted(() => ({
  clientOptions: [] as unknown[],
  indicesCreate: vi.fn(async (_params: unknown) => ({ acknowledged: true })),
  index: vi.fn(async (_params: unknown) => ({ result: 'created' })),
  search: vi.fn(async (_params: unknown) => ({
    hits: {
      total: { value: 1, relation: 'eq' },
      hits: [
        {
          _id: 'p1',
          _score: 1.2,
          _source: { name: 'Wireless Headphones', category: 'audio', price: 99 },
        },
      ],
    },
  })),
}))

vi.mock('@elastic/elasticsearch', () => {
  class ElasticsearchClientError extends Error {}
  class ResponseError extends ElasticsearchClientError {
    statusCode = 500
  }
  return {
    Client: class {
      indices = { create: es.indicesCreate }
      index = es.index
      search = es.search
      constructor(options: unknown) {
        es.clientOptions.push(options)
      }
    },
    errors: {
      ElasticsearchClientError,
      ConnectionError: class extends ElasticsearchClientError {},
      TimeoutError: class extends ElasticsearchClientError {},
      NoLivingConnectionsError: class extends ElasticsearchClientError {},
      ResponseError,
    },
  }
})

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('creates the index, indexes a document and finds it with a keyword filter', async () => {
    vi.stubEnv('ELASTICSEARCH_URL', 'https://search.example.com:9200')
    vi.stubEnv('ELASTICSEARCH_API_KEY', 'test-key')

    setProvider(
      createProvider({
        node: process.env.ELASTICSEARCH_URL,
        apiKey: process.env.ELASTICSEARCH_API_KEY,
        indexPrefix: 'myapp',
      }),
    )

    await createIndex('products', {
      fields: { name: 'text', category: 'keyword', price: 'number' },
      searchableFields: ['name'],
      filterableFields: ['category'],
      sortableFields: ['price'],
    })

    await index('products', 'p1', { name: 'Wireless Headphones', category: 'audio', price: 99 })

    const result = await search('products', {
      text: 'headphones',
      filters: { category: 'audio' },
      sort: [{ field: 'price', direction: 'asc' }],
      page: 1,
      perPage: 20,
    })

    expect(es.clientOptions[0]).toMatchObject({
      node: 'https://search.example.com:9200',
      auth: { apiKey: 'test-key' },
    })
    expect(es.indicesCreate).toHaveBeenCalledWith({
      index: 'myapp-products',
      mappings: {
        properties: {
          name: { type: 'text' },
          category: { type: 'keyword' },
          price: { type: 'double' },
        },
      },
    })
    expect(es.index).toHaveBeenCalledWith({
      index: 'myapp-products',
      id: 'p1',
      document: { name: 'Wireless Headphones', category: 'audio', price: 99 },
      refresh: 'wait_for',
    })
    expect(es.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'myapp-products',
        query: {
          bool: {
            must: [{ multi_match: { query: 'headphones', type: 'best_fields' } }],
            filter: [{ term: { category: { value: 'audio' } } }],
          },
        },
        sort: [{ price: { order: 'asc' } }],
        from: 0,
        size: 20,
      }),
    )
    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
    expect(result.perPage).toBe(20)
    expect(result.hits[0]?.id).toBe('p1')
    expect(result.hits[0]?.document.name).toBe('Wireless Headphones')
  })
})
