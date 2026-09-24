/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real
 * `@molecule/api-ai-vector-store` core. Nothing is mocked — the store is in-memory.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { requireProvider, setProvider } from '@molecule/api-ai-vector-store'

import { provider } from '../index.js'

describe('README @example', () => {
  it('creates a collection, upserts records and returns the nearest match', async () => {
    setProvider(provider)

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

    expect(hits).toHaveLength(1)
    expect([hits[0]?.record.id, hits[0]?.record.content]).toEqual(['login', 'Reset password'])
    expect(hits[0]?.score).toBeCloseTo(0.996, 3)

    await store.deleteCollection('docs')
  })
})
