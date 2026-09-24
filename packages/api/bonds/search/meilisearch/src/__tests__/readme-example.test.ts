/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the `meilisearch` client (the
 * network) is mocked.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createIndex, index, search, setProvider } from '@molecule/api-search'

const meili = vi.hoisted(() => {
  const done = (): { waitTask: () => Promise<{ status: string }> } => ({
    waitTask: async () => ({ status: 'succeeded' }),
  })
  const idx = {
    updateSearchableAttributes: vi.fn((_fields: string[]) => done()),
    updateFilterableAttributes: vi.fn((_fields: string[]) => done()),
    updateSortableAttributes: vi.fn((_fields: string[]) => done()),
    addDocuments: vi.fn((_docs: unknown[], _opts: unknown) => done()),
    search: vi.fn(async (_text: string, _params: unknown) => ({
      hits: [
        {
          id: 'p1',
          name: 'Wireless Headphones',
          category: 'audio',
          price: 99,
          _rankingScore: 0.97,
        },
      ],
      estimatedTotalHits: 1,
    })),
  }
  return {
    clientConfig: [] as unknown[],
    createIndex: vi.fn((_name: string, _opts: unknown) => done()),
    idx,
  }
})

vi.mock('meilisearch', () => {
  class Meilisearch {
    createIndex = meili.createIndex
    index = (_name: string): typeof meili.idx => meili.idx
    constructor(config: unknown) {
      meili.clientConfig.push(config)
    }
  }
  return { Meilisearch, MeiliSearch: Meilisearch }
})

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('creates the index with attributes, indexes a document and finds it', async () => {
    vi.stubEnv('MEILISEARCH_URL', 'https://meili.example.com')
    vi.stubEnv('MEILISEARCH_API_KEY', 'test-key')

    setProvider(
      createProvider({
        host: process.env.MEILISEARCH_URL,
        apiKey: process.env.MEILISEARCH_API_KEY,
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
    })

    expect(meili.clientConfig[0]).toEqual({
      host: 'https://meili.example.com',
      apiKey: 'test-key',
    })
    expect(meili.createIndex).toHaveBeenCalledWith('products', { primaryKey: 'id' })
    expect(meili.idx.updateFilterableAttributes).toHaveBeenCalledWith(['category'])
    expect(meili.idx.updateSortableAttributes).toHaveBeenCalledWith(['price'])
    expect(meili.idx.addDocuments).toHaveBeenCalledWith(
      [{ id: 'p1', name: 'Wireless Headphones', category: 'audio', price: 99 }],
      { primaryKey: 'id' },
    )
    expect(meili.idx.search).toHaveBeenCalledWith(
      'headphones',
      expect.objectContaining({
        filter: ['category = "audio"'],
        sort: ['price:asc'],
        limit: 20,
        offset: 0,
      }),
    )
    expect(result.total).toBe(1)
    expect(result.hits[0]?.id).toBe('p1')
    expect(result.hits[0]?.score).toBe(0.97)
    expect(result.hits[0]?.document.name).toBe('Wireless Headphones')
  })
})
