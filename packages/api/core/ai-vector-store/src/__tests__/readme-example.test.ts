/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the in-memory bond (nothing
 * to mock — it has no outside world).
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { provider as memory } from '@molecule/api-ai-vector-store-memory'

import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  it('bonds the memory store and returns owner-scoped, score-sorted matches', async () => {
    setProvider(memory)

    const store = requireProvider()
    await store.createCollection({ name: 'docs', dimension: 3, metric: 'cosine' })
    await store.upsert({
      collection: 'docs',
      records: [
        { id: 'pto', embedding: [1, 0, 0], content: 'PTO policy', metadata: { userId: 'u1' } },
        { id: 'wfh', embedding: [0, 1, 0], content: 'Remote work', metadata: { userId: 'u1' } },
        { id: 'other', embedding: [1, 0, 0], content: 'PTO (u2)', metadata: { userId: 'u2' } },
      ],
    })

    const hits = await store.query({
      collection: 'docs',
      embedding: [0.9, 0.1, 0],
      topK: 5,
      minScore: 0.8,
      filter: [{ field: 'userId', operator: 'eq', value: 'u1' }],
    })

    expect(hits.map((hit) => [hit.record.id, hit.score.toFixed(2)])).toEqual([['pto', '1.00']])
    expect(hits[0]?.record.content).toBe('PTO policy')
  })
})
