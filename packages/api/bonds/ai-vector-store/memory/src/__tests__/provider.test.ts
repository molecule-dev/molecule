import { describe, expect, it } from 'vitest'

import { provider } from '../provider.js'

/**
 * Counter backing {@link uniqueName}, ensuring every test uses a distinct
 * collection so the module-level store never leaks state across tests.
 */
let collectionCounter = 0

/**
 * Generates a unique collection name for a test. The module-level store is
 * shared across the whole file, so each test creates its own collection rather
 * than resetting global state.
 *
 * @param prefix - A short label for readability in failures.
 * @returns A collection name guaranteed unique within this run.
 */
function uniqueName(prefix = 'col'): string {
  collectionCounter += 1
  return `${prefix}-${collectionCounter}`
}

describe('provider', () => {
  it('exposes the memory provider name', () => {
    expect(provider.name).toBe('memory')
  })

  describe('createCollection / listCollections / deleteCollection', () => {
    it('creates, lists, and deletes a collection', async () => {
      const name = uniqueName('lifecycle')
      await provider.createCollection({ name, dimension: 3 })

      expect(await provider.listCollections()).toContain(name)

      await provider.deleteCollection(name)
      expect(await provider.listCollections()).not.toContain(name)
    })

    it('is a no-op when recreating with the same dimension', async () => {
      const name = uniqueName('recreate-same')
      await provider.createCollection({ name, dimension: 4 })
      await provider.upsert({ collection: name, records: [{ id: 'a', embedding: [1, 0, 0, 0] }] })

      // Recreating with the same dimension must not throw or wipe records.
      await provider.createCollection({ name, dimension: 4 })

      expect(await provider.fetch({ collection: name, ids: ['a'] })).toHaveLength(1)
      expect((await provider.listCollections()).filter((c) => c === name)).toHaveLength(1)
    })

    it('throws when recreating with a different dimension', async () => {
      const name = uniqueName('recreate-diff')
      await provider.createCollection({ name, dimension: 3 })
      await expect(provider.createCollection({ name, dimension: 5 })).rejects.toThrow()
    })

    it('deleteCollection is a no-op for a missing collection', async () => {
      await expect(provider.deleteCollection(uniqueName('never-created'))).resolves.toBeUndefined()
    })
  })

  describe('upsert', () => {
    it('inserts new records and updates existing ones by id', async () => {
      const name = uniqueName('upsert')
      await provider.createCollection({ name, dimension: 2 })

      await provider.upsert({
        collection: name,
        records: [{ id: 'x', embedding: [1, 0], content: 'first', metadata: { v: 1 } }],
      })
      let [record] = await provider.fetch({ collection: name, ids: ['x'] })
      expect(record.content).toBe('first')
      expect(record.metadata).toEqual({ v: 1 })

      // Same id -> replace, not duplicate.
      await provider.upsert({
        collection: name,
        records: [{ id: 'x', embedding: [0, 1], content: 'second', metadata: { v: 2 } }],
      })
      const all = await provider.fetch({ collection: name, ids: ['x'] })
      expect(all).toHaveLength(1)
      ;[record] = all
      expect(record.content).toBe('second')
      expect(record.embedding).toEqual([0, 1])
      expect(record.metadata).toEqual({ v: 2 })
    })

    it('throws on an embedding dimension mismatch and leaves the collection unchanged', async () => {
      const name = uniqueName('dim-mismatch')
      await provider.createCollection({ name, dimension: 3 })

      await expect(
        provider.upsert({ collection: name, records: [{ id: 'bad', embedding: [1, 2] }] }),
      ).rejects.toThrow()

      // Nothing should have been written.
      expect(await provider.fetch({ collection: name, ids: ['bad'] })).toEqual([])
    })

    it('throws when upserting into a missing collection', async () => {
      await expect(
        provider.upsert({
          collection: uniqueName('missing'),
          records: [{ id: 'a', embedding: [1, 2] }],
        }),
      ).rejects.toThrow()
    })
  })

  describe('query', () => {
    it('ranks nearer vectors first (cosine)', async () => {
      const name = uniqueName('cosine-order')
      await provider.createCollection({ name, dimension: 2, metric: 'cosine' })
      await provider.upsert({
        collection: name,
        records: [
          { id: 'exact', embedding: [1, 0] },
          { id: 'near', embedding: [0.9, 0.1] },
          { id: 'far', embedding: [0, 1] },
        ],
      })

      const results = await provider.query({ collection: name, embedding: [1, 0] })
      expect(results.map((r) => r.record.id)).toEqual(['exact', 'near', 'far'])
      expect(results[0].score).toBeGreaterThan(results[1].score)
      expect(results[1].score).toBeGreaterThan(results[2].score)
    })

    it('respects the topK limit', async () => {
      const name = uniqueName('topk')
      await provider.createCollection({ name, dimension: 2, metric: 'cosine' })
      await provider.upsert({
        collection: name,
        records: [
          { id: 'exact', embedding: [1, 0] },
          { id: 'near', embedding: [0.9, 0.1] },
          { id: 'far', embedding: [0, 1] },
        ],
      })

      const results = await provider.query({ collection: name, embedding: [1, 0], topK: 2 })
      expect(results).toHaveLength(2)
      expect(results.map((r) => r.record.id)).toEqual(['exact', 'near'])
    })

    it('excludes results below minScore', async () => {
      const name = uniqueName('minscore')
      await provider.createCollection({ name, dimension: 2, metric: 'cosine' })
      await provider.upsert({
        collection: name,
        records: [
          { id: 'exact', embedding: [1, 0] },
          { id: 'far', embedding: [0, 1] }, // cosine 0 -> score 0.5
        ],
      })

      const results = await provider.query({ collection: name, embedding: [1, 0], minScore: 0.6 })
      expect(results.map((r) => r.record.id)).toEqual(['exact'])
    })

    it('throws when querying a missing collection', async () => {
      await expect(
        provider.query({ collection: uniqueName('missing'), embedding: [1, 0] }),
      ).rejects.toThrow()
    })

    describe('metadata filters', () => {
      /**
       * Seeds a fresh collection with three records whose metadata exercises the
       * filter operators. `r3` deliberately omits the `active` field to cover the
       * missing-field case.
       *
       * @returns The seeded collection name.
       */
      async function seedFiltered(): Promise<string> {
        const name = uniqueName('filter')
        await provider.createCollection({ name, dimension: 2, metric: 'cosine' })
        await provider.upsert({
          collection: name,
          records: [
            { id: 'r1', embedding: [1, 0], metadata: { category: 'fruit', qty: 5, active: true } },
            { id: 'r2', embedding: [1, 0], metadata: { category: 'veg', qty: 10, active: false } },
            { id: 'r3', embedding: [1, 0], metadata: { category: 'fruit', qty: 15 } },
          ],
        })
        return name
      }

      /**
       * Runs a filtered query and returns the matched record ids as a sorted set.
       *
       * @param name - Collection to query.
       * @param filter - Filters to apply.
       * @returns Sorted array of matched record ids.
       */
      async function idsMatching(
        name: string,
        filter: Parameters<typeof provider.query>[0]['filter'],
      ): Promise<string[]> {
        const results = await provider.query({ collection: name, embedding: [1, 0], filter })
        return results.map((r) => r.record.id).sort()
      }

      it('eq matches equal values', async () => {
        const name = await seedFiltered()
        expect(
          await idsMatching(name, [{ field: 'category', operator: 'eq', value: 'fruit' }]),
        ).toEqual(['r1', 'r3'])
      })

      it('ne matches unequal values and excludes records missing the field', async () => {
        const name = await seedFiltered()
        // r1 active=true excluded (equal); r2 active=false passes; r3 missing field -> excluded.
        expect(await idsMatching(name, [{ field: 'active', operator: 'ne', value: true }])).toEqual(
          ['r2'],
        )
      })

      it('gt matches strictly greater values', async () => {
        const name = await seedFiltered()
        expect(await idsMatching(name, [{ field: 'qty', operator: 'gt', value: 5 }])).toEqual([
          'r2',
          'r3',
        ])
      })

      it('gte matches greater-or-equal values', async () => {
        const name = await seedFiltered()
        expect(await idsMatching(name, [{ field: 'qty', operator: 'gte', value: 5 }])).toEqual([
          'r1',
          'r2',
          'r3',
        ])
      })

      it('lt matches strictly lesser values', async () => {
        const name = await seedFiltered()
        expect(await idsMatching(name, [{ field: 'qty', operator: 'lt', value: 10 }])).toEqual([
          'r1',
        ])
      })

      it('lte matches lesser-or-equal values', async () => {
        const name = await seedFiltered()
        expect(await idsMatching(name, [{ field: 'qty', operator: 'lte', value: 10 }])).toEqual([
          'r1',
          'r2',
        ])
      })

      it('in matches values within the set', async () => {
        const name = await seedFiltered()
        expect(
          await idsMatching(name, [{ field: 'category', operator: 'in', value: ['fruit', 'veg'] }]),
        ).toEqual(['r1', 'r2', 'r3'])
      })

      it('excludes records missing the filtered field', async () => {
        const name = await seedFiltered()
        // Only r1 has active=true; r2 is false; r3 lacks the field entirely.
        expect(await idsMatching(name, [{ field: 'active', operator: 'eq', value: true }])).toEqual(
          ['r1'],
        )
      })

      it('applies all filters with logical AND', async () => {
        const name = await seedFiltered()
        expect(
          await idsMatching(name, [
            { field: 'category', operator: 'eq', value: 'fruit' },
            { field: 'qty', operator: 'gt', value: 10 },
          ]),
        ).toEqual(['r3'])
      })
    })
  })

  describe('fetch', () => {
    it('returns records for the given ids and omits missing ones', async () => {
      const name = uniqueName('fetch')
      await provider.createCollection({ name, dimension: 2 })
      await provider.upsert({
        collection: name,
        records: [
          { id: 'a', embedding: [1, 0] },
          { id: 'b', embedding: [0, 1] },
        ],
      })

      const found = await provider.fetch({ collection: name, ids: ['a', 'missing', 'b'] })
      expect(found.map((r) => r.id).sort()).toEqual(['a', 'b'])
    })

    it('returns an empty array for a missing collection', async () => {
      expect(await provider.fetch({ collection: uniqueName('missing'), ids: ['a'] })).toEqual([])
    })
  })

  describe('delete', () => {
    it('removes records by id', async () => {
      const name = uniqueName('delete')
      await provider.createCollection({ name, dimension: 2 })
      await provider.upsert({
        collection: name,
        records: [
          { id: 'a', embedding: [1, 0] },
          { id: 'b', embedding: [0, 1] },
        ],
      })

      await provider.delete({ collection: name, ids: ['a'] })

      expect(await provider.fetch({ collection: name, ids: ['a'] })).toEqual([])
      expect(await provider.fetch({ collection: name, ids: ['b'] })).toHaveLength(1)
    })

    it('is a no-op for a missing collection', async () => {
      await expect(
        provider.delete({ collection: uniqueName('missing'), ids: ['a'] }),
      ).resolves.toBeUndefined()
    })
  })
})
