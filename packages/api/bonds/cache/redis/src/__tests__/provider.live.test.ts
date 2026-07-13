/**
 * LIVE-server integration tests for the Redis cache provider.
 *
 * Run a local redis and set REDIS_URL=redis://127.0.0.1:6379 to enable this
 * suite; CI/default runs skip it entirely (`describe.runIf`).
 *
 *   docker run --rm -p 6379:6379 redis:7-alpine
 *   REDIS_URL=redis://127.0.0.1:6379 npx vitest run src/__tests__/provider.live.test.ts
 *
 * Exercises the REAL `ioredis` client against a REAL Redis server — no
 * mocks. `provider.test.ts`'s mocked suite can only validate OUR assumptions
 * about ioredis' SCAN/UNLINK/pipeline argument shapes; it cannot prove the
 * server actually deletes the right keys. This file proves the two riskiest
 * pieces of `provider.ts` end-to-end against real server state:
 *
 * 1. `clear()`'s scoped `SCAN MATCH <keyPrefix>*` + batched `UNLINK` — must
 *    delete every one of this provider's own keys (across multiple SCAN
 *    pages/UNLINK batches for a realistic key count) and NEVER touch a key
 *    belonging to another prefix, no prefix at all, or a key that merely
 *    contains this provider's prefix as a substring (not a leading match).
 * 2. The keyPrefix double-prefix trap: `clear()` strips the client's own
 *    `keyPrefix` from each SCANned key before calling UNLINK (ioredis
 *    re-adds it), because UNLINK'ing the raw SCAN result would silently
 *    try to delete `<keyPrefix><keyPrefix>key` — a no-op that leaves the
 *    real key behind. A mocked test can only assert the UNLINK call
 *    arguments; only a real server's actual (non-)deletion proves this.
 * 3. The tag index (SADD/SREM + the `_tags:<key>` reverse index).
 * 4. The fail-fast read/write asymmetry documented in this module's
 *    `@remarks`: reads degrade to a miss, writes still throw.
 *
 * @module
 */

import type { Redis as RedisClient } from 'ioredis'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { CacheProvider } from '@molecule/api-cache'

import { createClient, createProvider } from '../provider.js'

const REDIS_URL = process.env.REDIS_URL

describe.runIf(!!REDIS_URL)('@molecule/api-cache-redis — LIVE server', () => {
  // Unique per run so leftovers from a prior crashed run (or a concurrent
  // run against the same server) can never be mistaken for this run's keys.
  const KEY_PREFIX = `livetest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}:`

  let provider: CacheProvider
  let raw: RedisClient

  beforeAll(() => {
    provider = createProvider({ url: REDIS_URL, keyPrefix: KEY_PREFIX })
    raw = createClient({ url: REDIS_URL })
  })

  afterAll(async () => {
    await provider.clear()
    await provider.close()
    await raw.quit()
  })

  describe('clear() — scoped SCAN + UNLINK against a real server', () => {
    const OWN_KEY_COUNT = 300
    const foreignKeys = {
      // A totally different app's key prefix.
      differentPrefix: 'some-other-app:session:abc123',
      // No prefix whatsoever.
      noPrefix: 'unprefixed-standalone-key',
      // Lexically CONTAINS this provider's keyPrefix, but not as a leading
      // match — SCAN's glob MATCH (`<keyPrefix>*`) is anchored at the start,
      // so this must NOT be caught even though the substring appears
      // mid-key.
      prefixMidString: `zzz-${KEY_PREFIX}not-mine`,
    }

    afterAll(async () => {
      await raw.del(...Object.values(foreignKeys))
    })

    it('removes every own-prefix key (multi-page SCAN) while every foreign-key shape survives untouched', async () => {
      const ownEntries: Array<[string, string]> = Array.from({ length: OWN_KEY_COUNT }, (_, i) => [
        `bulk-${i}`,
        `value-${i}`,
      ])
      // setMany() pipelines the writes — the realistic way a caller would
      // seed this many keys, and it still exercises the same on-wire
      // keyPrefix handling clear() has to undo.
      await provider.setMany(ownEntries)

      await raw.set(foreignKeys.differentPrefix, 'foreign-value')
      await raw.set(foreignKeys.noPrefix, 'unprefixed-value')
      await raw.set(foreignKeys.prefixMidString, 'mid-string-value')

      // Sanity: everything really is there before clear() runs — a false
      // pass here would mean the assertions below are checking nothing.
      const before = await raw.keys(`${KEY_PREFIX}bulk-*`)
      expect(before).toHaveLength(OWN_KEY_COUNT)

      await provider.clear()

      // A real KEYS sweep across every own-prefix key — not a sample —
      // forces the multi-page SCAN loop (COUNT 200 against 300+ matching
      // keys) and the batched UNLINK (CLEAR_UNLINK_BATCH_SIZE 500) to have
      // actually run to completion.
      const after = await raw.keys(`${KEY_PREFIX}bulk-*`)
      expect(after).toEqual([])

      // Every foreign-key shape survives untouched.
      expect(await raw.get(foreignKeys.differentPrefix)).toBe('foreign-value')
      expect(await raw.get(foreignKeys.noPrefix)).toBe('unprefixed-value')
      expect(await raw.get(foreignKeys.prefixMidString)).toBe('mid-string-value')
    }, 30_000)
  })

  describe('clear() — the double-prefix trap', () => {
    it('get() of a cleared key returns undefined via the SAME provider, proving UNLINK actually deleted the key rather than silently no-op-ing on a double-prefixed name', async () => {
      await provider.set('sentinel', 'sentinel-value')
      expect(await provider.get('sentinel')).toBe('sentinel-value')

      await provider.clear()

      // Read back through the SAME provider instance (same keyPrefix
      // handling as the write) — this is what would stay "cached forever"
      // if clear() ever regressed to UNLINKing `<prefix><prefix>sentinel`.
      expect(await provider.get('sentinel')).toBeUndefined()
      // And the real on-wire key is gone, not just unreachable for some
      // unrelated reason.
      expect(await raw.exists(`${KEY_PREFIX}sentinel`)).toBe(0)
    })
  })

  describe('tag index — SADD/SREM end-to-end', () => {
    it('invalidateTag() deletes every tagged entry, the tag SET, and both reverse indexes; an untagged sibling survives', async () => {
      await provider.set('tagged-1', 'v1', { tags: ['live-tag'] })
      await provider.set('tagged-2', 'v2', { tags: ['live-tag'] })
      await provider.set('untagged', 'v3')

      expect(await provider.get('tagged-1')).toBe('v1')
      expect(await provider.get('tagged-2')).toBe('v2')

      await provider.invalidateTag('live-tag')

      expect(await provider.get('tagged-1')).toBeUndefined()
      expect(await provider.get('tagged-2')).toBeUndefined()
      // Never tagged — clear()/invalidateTag() must not have a blast radius
      // beyond the tag's actual members.
      expect(await provider.get('untagged')).toBe('v3')

      // The tag SET itself, and both keys' reverse indexes, are gone
      // server-side (not just logically unreachable through the provider).
      expect(await raw.exists(`${KEY_PREFIX}_tag:live-tag`)).toBe(0)
      expect(await raw.exists(`${KEY_PREFIX}_tags:tagged-1`)).toBe(0)
      expect(await raw.exists(`${KEY_PREFIX}_tags:tagged-2`)).toBe(0)

      await provider.delete('untagged')
    })
  })

  describe('failure disambiguation against an unreachable Redis', () => {
    // Fail-fast options exist precisely so a down Redis surfaces fast
    // instead of ioredis' default ~10s+ of queued retries — this is the
    // module's own documented usage (see `@remarks` in `index.ts`).
    let unreachable: CacheProvider

    beforeAll(() => {
      unreachable = createProvider({
        host: '127.0.0.1',
        port: 1, // nothing listens here — ECONNREFUSED, no real server involved
        keyPrefix: KEY_PREFIX,
        maxRetriesPerRequest: 1,
        commandTimeout: 1000,
      })
    })

    afterAll(async () => {
      // Bounded regardless of how the underlying ioredis client's own
      // reconnect/quit bookkeeping behaves for a connection that never
      // succeeded — this suite must never hang on cleanup.
      await Promise.race([
        unreachable.close().catch(() => undefined),
        new Promise<void>((resolve) => setTimeout(resolve, 2000)),
      ])
    })

    it('reads degrade to a miss (undefined/false/empty map) instead of rejecting', async () => {
      await expect(unreachable.get('any-key')).resolves.toBeUndefined()
      await expect(unreachable.has('any-key')).resolves.toBe(false)
      await expect(unreachable.getMany(['a', 'b'])).resolves.toEqual(new Map())
    }, 10_000)

    it('writes still reject — a down Redis must not silently look like "nothing to cache"', async () => {
      await expect(unreachable.set('any-key', 'value')).rejects.toThrow()
      await expect(unreachable.delete('any-key')).rejects.toThrow()
      await expect(unreachable.clear()).rejects.toThrow()
    }, 10_000)
  })
})
