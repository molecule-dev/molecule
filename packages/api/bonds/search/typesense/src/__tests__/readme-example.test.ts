/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the `typesense` client (the
 * network) is mocked.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createIndex, index, search, setProvider } from '@molecule/api-search'

const ts = vi.hoisted(() => ({
  clientConfig: [] as unknown[],
  collectionCreate: vi.fn(async (_schema: unknown) => ({})),
  upsert: vi.fn(async (_doc: unknown) => ({})),
  search: vi.fn(async (_params: unknown) => ({
    found: 1,
    hits: [
      {
        document: { id: 'p1', name: 'Wireless Headphones', category: 'audio', price: 99 },
        text_match: 578730123365187700,
      },
    ],
  })),
}))

vi.mock('typesense', () => ({
  default: {
    Client: class {
      constructor(config: unknown) {
        ts.clientConfig.push(config)
      }
      collections(name?: string): unknown {
        if (!name) return { create: ts.collectionCreate }
        return { documents: () => ({ upsert: ts.upsert, search: ts.search }) }
      }
    },
  },
}))

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('creates the collection, upserts a document and finds it with a filter', async () => {
    vi.stubEnv('TYPESENSE_HOST', 'search.example.com')
    vi.stubEnv('TYPESENSE_PORT', '443')
    vi.stubEnv('TYPESENSE_PROTOCOL', 'https')
    vi.stubEnv('TYPESENSE_API_KEY', 'test-key')

    setProvider(
      createProvider({
        nodes: [
          {
            host: process.env.TYPESENSE_HOST ?? 'localhost',
            port: Number(process.env.TYPESENSE_PORT ?? 8108),
            protocol: process.env.TYPESENSE_PROTOCOL ?? 'http',
          },
        ],
        apiKey: process.env.TYPESENSE_API_KEY,
        connectionTimeoutSeconds: 5,
      }),
    )

    await createIndex('products', {
      fields: { name: 'text', category: 'keyword', price: 'number' },
      filterableFields: ['category'],
      sortableFields: ['price'],
    })

    await index('products', 'p1', { name: 'Wireless Headphones', category: 'audio', price: 99 })

    const result = await search('products', {
      text: 'headphones',
      filters: { category: 'audio' },
      sort: [{ field: 'price', direction: 'asc' }],
    })

    expect(ts.clientConfig[0]).toEqual({
      nodes: [{ host: 'search.example.com', port: 443, protocol: 'https' }],
      apiKey: 'test-key',
      connectionTimeoutSeconds: 5,
      numRetries: 3,
    })
    expect(ts.collectionCreate).toHaveBeenCalledWith({
      name: 'products',
      fields: [
        { name: 'name', type: 'string', facet: false, sort: false },
        { name: 'category', type: 'string', facet: true, sort: false },
        { name: 'price', type: 'float', facet: false, sort: true },
      ],
      enable_nested_fields: true,
    })
    expect(ts.upsert).toHaveBeenCalledWith({
      id: 'p1',
      name: 'Wireless Headphones',
      category: 'audio',
      price: 99,
    })
    expect(ts.search).toHaveBeenCalledWith({
      q: 'headphones',
      query_by: '*',
      per_page: 20,
      page: 1,
      filter_by: 'category:=`audio`',
      sort_by: 'price:asc',
    })
    expect(result.total).toBe(1)
    expect(result.hits[0]?.id).toBe('p1')
    expect(result.hits[0]?.document).toEqual({
      name: 'Wireless Headphones',
      category: 'audio',
      price: 99,
    })
  })
})
