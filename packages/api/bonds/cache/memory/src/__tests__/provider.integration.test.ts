/**
 * REAL-LIFECYCLE integration tests — no mocks, no fake timers: the provider exactly
 * as a consumer experiences it. The unit suite (`index.test.ts`) drives expiry with
 * `vi.useFakeTimers()`, so it can never catch a bug that only shows up on the real
 * clock or in the interaction of LRU + tags + overwrites across a realistic flow.
 *
 * These tests pin two real regressions found in this provider:
 *   1. hostile-default: `set()` on an EXISTING key at capacity evicted an unrelated
 *      sibling entry (the map wasn't growing) — a hot cache at `maxSize` silently
 *      lost a neighbor on every update.
 *   2. ambiguous-failure: deleted/overwritten keys lingered in the tag index, so
 *      `invalidateTag()` deleted entries that no longer carried the tag.
 *
 * Determinism: expiry boundaries are derived from short fractional TTLs (real
 * seconds) with sleeps under 1s and wide margins on both sides — no wall-clock races.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { createProvider } from '../provider.js'

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

describe('@molecule/api-cache-memory × real clock', () => {
  it('full lifecycle: set → get → has → expire → indistinguishable-from-never-set', async () => {
    const provider = createProvider({ cleanupInterval: 0 })

    // Per-user data carries the user id in the KEY (the core contract's remark).
    await provider.set('user:1:profile', { name: 'Ada' }, { ttl: 0.4 })
    expect(await provider.get('user:1:profile')).toEqual({ name: 'Ada' })
    expect(await provider.has('user:1:profile')).toBe(true)

    // 800ms is 2x the 400ms TTL — deterministically past expiry, still under 1s.
    await sleep(800)
    expect(await provider.get('user:1:profile')).toBeUndefined()
    expect(await provider.has('user:1:profile')).toBe(false)

    await provider.close?.()
  })

  it('CONSUMER PROPERTY: updating a hot key at capacity never evicts a sibling', async () => {
    // The regression this pins: `set()` ran eviction BEFORE checking whether the key
    // already existed, so touching an existing session at maxSize evicted a neighbor.
    const provider = createProvider({ maxSize: 2, cleanupInterval: 0 })

    await provider.set('session:alice', { hits: 1 })
    await provider.set('session:bob', { hits: 1 })

    // A realistic hot-key flow: the same session is re-written repeatedly at capacity.
    await provider.set('session:bob', { hits: 2 })
    await provider.set('session:bob', { hits: 3 })

    expect(await provider.get('session:alice')).toEqual({ hits: 1 }) // sibling survives
    expect(await provider.get('session:bob')).toEqual({ hits: 3 })

    // LRU still evicts for genuinely NEW keys: bob was touched last, so alice goes.
    await provider.set('session:carol', { hits: 1 })
    expect(await provider.get('session:alice')).toBeUndefined()
    expect(await provider.get('session:bob')).toEqual({ hits: 3 })
    expect(await provider.get('session:carol')).toEqual({ hits: 1 })

    await provider.close?.()
  })

  it('CONSUMER PROPERTY: an entry without ttl survives a slow flow; defaultTtl applies when configured', async () => {
    const forever = createProvider({ cleanupInterval: 0 })
    const shortLived = createProvider({ defaultTtl: 0.3, cleanupInterval: 0 })

    await forever.set('config', 'v1')
    await shortLived.set('config', 'v1')

    // One shared 800ms pause: comfortably past the 300ms defaultTtl,
    // and long enough to represent a slow multi-step consumer flow.
    await sleep(800)

    expect(await forever.get('config')).toBe('v1') // no ttl anywhere → never expires
    expect(await shortLived.get('config')).toBeUndefined() // defaultTtl applied silently

    await forever.close?.()
    await shortLived.close?.()
  })

  it('FAILURE DISAMBIGUATION: cached-null vs never-cached vs deleted are all tellable apart', async () => {
    const provider = createProvider({ cleanupInterval: 0 })

    // `null` IS cacheable ("we looked it up and there was nothing") …
    await provider.set('user:2:profile', null)
    expect(await provider.get('user:2:profile')).toBeNull()
    expect(await provider.has('user:2:profile')).toBe(true)

    // … while `undefined` + has()=false means "not cached at all".
    expect(await provider.get('user:3:profile')).toBeUndefined()
    expect(await provider.has('user:3:profile')).toBe(false)

    // delete() reports whether the key existed — a caller can tell a real
    // invalidation from a no-op on an already-absent key.
    expect(await provider.delete('user:2:profile')).toBe(true)
    expect(await provider.delete('user:2:profile')).toBe(false)

    await provider.close?.()
  })

  it('FAILURE DISAMBIGUATION: getOrSet loader errors propagate and never poison the cache; undefined is never cached', async () => {
    const provider = createProvider({ cleanupInterval: 0 })

    // A failing loader REJECTS — the caller sees the loader's error, not a silent miss.
    await expect(
      provider.getOrSet?.('report:q1', async () => {
        throw new Error('db offline')
      }),
    ).rejects.toThrow('db offline')

    // The failure was not cached: the next loader runs and its value sticks.
    expect(await provider.get('report:q1')).toBeUndefined()
    expect(await provider.getOrSet?.('report:q1', async () => 'fresh')).toBe('fresh')
    expect(await provider.get('report:q1')).toBe('fresh')

    // `undefined` is reserved to mean "miss": a loader resolving to undefined is
    // re-run on EVERY call (the documented core-contract semantic — cache null instead).
    let runs = 0
    const loader = async (): Promise<undefined> => {
      runs++
      return undefined
    }
    expect(await provider.getOrSet?.('maybe', loader)).toBeUndefined()
    expect(await provider.getOrSet?.('maybe', loader)).toBeUndefined()
    expect(runs).toBe(2)

    await provider.close?.()
  })

  it('invalidateTag matches CURRENT tag membership, not historical', async () => {
    const provider = createProvider({ cleanupInterval: 0 })

    await provider.set('user:1', 'a', { tags: ['users'] })
    await provider.set('user:2', 'b', { tags: ['users'] })

    // user:2 is rewritten by an untagged code path — it no longer carries the tag.
    await provider.set('user:2', 'b2')

    // user:3 was tagged, deleted, then re-created without the tag.
    await provider.set('user:3', 'c', { tags: ['users'] })
    await provider.delete('user:3')
    await provider.set('user:3', 'c2')

    await provider.invalidateTag?.('users')

    expect(await provider.get('user:1')).toBeUndefined() // still tagged → invalidated
    expect(await provider.get('user:2')).toBe('b2') // untagged rewrite → survives
    expect(await provider.get('user:3')).toBe('c2') // recreated untagged → survives

    await provider.close?.()
  })
})
