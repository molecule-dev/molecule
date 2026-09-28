/**
 * The behavioural suite every query bond must pass. Duplicated verbatim in
 * `bonds/query/tanstack/src/__tests__/describeQueryClient.ts` (the core keeps
 * no test code, and bonds share nothing but the core's contract); change both.
 */
import { describe, expect, it, vi } from 'vitest'

import type { QueryClient, QueryClientConfig } from '@molecule/app-query'

const tick = () => new Promise<void>((r) => setTimeout(r, 0))

/**
 * Runs the contract suite against a bond's client factory.
 *
 * @param name - The bond's name, for the suite title.
 * @param createClient - Creates a fresh client.
 */
export function describeQueryClient(
  name: string,
  createClient: (config?: QueryClientConfig) => QueryClient,
): void {
  describe(`${name} query client`, () => {
    it('reports idle for an unknown key and returns nothing synchronously', () => {
      const c = createClient()
      expect(c.get(['nope'])).toBeUndefined()
      expect(c.getState(['nope'])).toMatchObject({
        status: 'idle',
        data: undefined,
        isFetching: false,
      })
    })

    it('sets and gets by value-compared keys', () => {
      const c = createClient()
      c.set(['package', { id: 1, v: 2 }], 'doc')
      expect(c.get(['package', { v: 2, id: 1 }])).toBe('doc')
      expect(c.getState(['package', { id: 1, v: 2 }])).toMatchObject({
        status: 'success',
        data: 'doc',
      })
      expect(c.getState(['package', { id: 1, v: 2 }]).updatedAt).toBeTypeOf('number')
    })

    it('fetches once, caches, and shares a fetch in flight', async () => {
      const c = createClient()
      const fetch = vi.fn(async () => 'a')
      const [x, y] = await Promise.all([
        c.fetch({ key: ['k'], fetch }),
        c.fetch({ key: ['k'], fetch }),
      ])
      expect(x).toBe('a')
      expect(y).toBe('a')
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(await c.fetch({ key: ['k'], fetch })).toBe('a')
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(c.get(['k'])).toBe('a')
    })

    it('rejects a failed fetch, caches nothing, and tries again next time', async () => {
      const c = createClient()
      const fetch = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce('up')
      await expect(c.fetch({ key: ['k'], fetch })).rejects.toThrow('down')
      expect(c.get(['k'])).toBeUndefined()
      expect(c.getState(['k']).status).toBe('error')
      expect(await c.fetch({ key: ['k'], fetch })).toBe('up')
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('refetches once the document is stale', async () => {
      const c = createClient({ staleMs: 20 })
      const fetch = vi.fn().mockResolvedValueOnce('one').mockResolvedValueOnce('two')
      expect(await c.fetch({ key: ['k'], fetch })).toBe('one')
      expect(await c.fetch({ key: ['k'], fetch })).toBe('one')
      await new Promise((r) => setTimeout(r, 30))
      expect(await c.fetch({ key: ['k'], fetch })).toBe('two')
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('prefetches without throwing, and skips a fresh or in-flight document', async () => {
      const c = createClient()
      const fetch = vi.fn(async () => 'a')
      c.prefetch({ key: ['k'], fetch })
      c.prefetch({ key: ['k'], fetch })
      await tick()
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(c.get(['k'])).toBe('a')
      c.prefetch({ key: ['k'], fetch })
      await tick()
      expect(fetch).toHaveBeenCalledTimes(1)
      const failing = vi.fn(async () => {
        throw new Error('down')
      })
      expect(() => c.prefetch({ key: ['bad'], fetch: failing })).not.toThrow()
      await tick()
      expect(c.get(['bad'])).toBeUndefined()
    })

    it('invalidates a key and everything it prefixes', async () => {
      const c = createClient()
      const a = vi.fn(async () => 'a')
      const b = vi.fn(async () => 'b')
      const other = vi.fn(async () => 'o')
      await c.fetch({ key: ['package', 'a'], fetch: a })
      await c.fetch({ key: ['package', 'b'], fetch: b })
      await c.fetch({ key: ['template', 'x'], fetch: other })
      c.invalidate(['package'])
      await c.fetch({ key: ['package', 'a'], fetch: a })
      await c.fetch({ key: ['package', 'b'], fetch: b })
      await c.fetch({ key: ['template', 'x'], fetch: other })
      expect(a).toHaveBeenCalledTimes(2)
      expect(b).toHaveBeenCalledTimes(2)
      expect(other).toHaveBeenCalledTimes(1)
    })

    it('subscribes: emits loading then success, refetches stale data while showing it, and unsubscribes', async () => {
      const c = createClient({ staleMs: 20 })
      const fetch = vi.fn().mockResolvedValueOnce('one').mockResolvedValueOnce('two')
      const seen: string[] = []
      const off = c.subscribe({ key: ['k'], fetch }, (s) =>
        seen.push(`${s.status}:${s.data ?? '-'}:${s.isFetching ? 'f' : 'i'}`),
      )
      await tick()
      await tick()
      expect(seen[0]).toMatch(/^(idle|loading):-:/)
      expect(seen.at(-1)).toBe('success:one:i')
      await new Promise((r) => setTimeout(r, 30))
      const before = seen.length
      const off2 = c.subscribe({ key: ['k'], fetch }, (s) =>
        seen.push(`${s.status}:${s.data ?? '-'}:${s.isFetching ? 'f' : 'i'}`),
      )
      await tick()
      await tick()
      expect(seen.slice(before)[0]).toMatch(/^success:one:/)
      expect(seen.at(-1)).toBe('success:two:i')
      expect(fetch).toHaveBeenCalledTimes(2)
      off()
      off2()
      const count = seen.length
      c.set(['k'], 'three')
      await tick()
      expect(seen.length).toBe(count)
    })

    it('clears everything', async () => {
      const c = createClient()
      await c.fetch({ key: ['k'], fetch: async () => 'a' })
      c.clear()
      expect(c.get(['k'])).toBeUndefined()
      expect(c.getState(['k']).status).toBe('idle')
    })
  })
}
