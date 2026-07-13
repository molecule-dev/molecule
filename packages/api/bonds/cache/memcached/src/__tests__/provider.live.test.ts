/**
 * LIVE-server integration tests for the Memcached cache provider.
 *
 * Run a local memcached and set MEMCACHED_SERVERS=127.0.0.1:11211 to enable
 * this suite; CI/default runs skip it entirely (`describe.runIf`).
 *
 *   docker run --rm -p 11211:11211 memcached:1.6-alpine
 *   MEMCACHED_SERVERS=127.0.0.1:11211 npx vitest run src/__tests__/provider.live.test.ts
 *
 * Exercises the REAL `memcached` client against a REAL memcached server — no
 * mocks. `index.test.ts`'s suite backs itself with an in-memory fake client
 * (hand-written GET/SET/ADD/APPEND/INCR/DEL semantics), which can only prove
 * the provider behaves the way WE think memcached behaves — not how the real
 * server and wire protocol actually behave under concurrency and real
 * key/version state. This file proves the two riskiest pieces of
 * `provider.ts` end-to-end against a real server:
 *
 * 1. The APPEND-based tag log: memcached's atomic APPEND means concurrent
 *    tagged `set()` calls can never silently drop each other's key the way
 *    a read-JSON-modify-write would — this is only observable under REAL
 *    concurrency against a REAL server, never against a sequential fake.
 *    Its reverse index (`_tags:<key>`) is what lets a later `set()`/
 *    `delete()` detach a key from exactly the tags it currently carries.
 * 2. The namespace-versioned `clear()`: memcached has no SCAN/key-
 *    enumeration command, so "only this provider's keys" is implemented by
 *    incrementing a version counter that makes an entire key generation
 *    unreachable (not physically deleted) — and this must never disturb a
 *    DIFFERENT keyPrefix instance sharing the same memcached server.
 *
 * @module
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { CacheProvider } from '@molecule/api-cache'

import { createProvider } from '../provider.js'

const MEMCACHED_SERVERS = process.env.MEMCACHED_SERVERS

describe.runIf(!!MEMCACHED_SERVERS)('@molecule/api-cache-memcached — LIVE server', () => {
  // Unique per run so leftovers from a prior crashed run (or a concurrent
  // run against the same server) can never be mistaken for this run's keys,
  // and so the namespace-version key never collides across runs.
  const KEY_PREFIX = `livetest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}:`

  let servers: string[]
  let provider: CacheProvider

  beforeAll(() => {
    // MEMCACHED_SERVERS is comma-separated, matching the provider's own env
    // parsing (see types.ts) — only read here, inside a hook, so this file
    // never touches the env var while the suite is being collected (i.e.
    // while skipped: describe() callback bodies always run during
    // collection, even for a skipped suite — only the hook/test bodies are
    // skipped).
    servers = MEMCACHED_SERVERS!.split(',')
    provider = createProvider({ servers, keyPrefix: KEY_PREFIX })
  })

  afterAll(async () => {
    await provider.close()
  })

  describe('get/set/delete/has round-trip', () => {
    it('round-trips a value and reflects deletion', async () => {
      expect(await provider.has('roundtrip')).toBe(false)

      await provider.set('roundtrip', { hello: 'world' })
      expect(await provider.get('roundtrip')).toEqual({ hello: 'world' })
      expect(await provider.has('roundtrip')).toBe(true)

      const deleted = await provider.delete('roundtrip')
      expect(deleted).toBe(true)
      expect(await provider.get('roundtrip')).toBeUndefined()
      expect(await provider.has('roundtrip')).toBe(false)

      // Deleting an already-gone key reports false, not true.
      expect(await provider.delete('roundtrip')).toBe(false)
    })
  })

  describe('tag log — atomic APPEND + reverse-index detach', () => {
    it('CONCURRENT tagged set() calls all survive in the tag log (real APPEND, not a lost read-modify-write)', async () => {
      // The regression this proves fixed: the old implementation read the
      // tag log as a JSON array, pushed the new member locally, and wrote
      // the whole array back — two concurrent writers racing that
      // read-modify-write could silently drop each other's key. A
      // sequential fake client can't reproduce that race; only real
      // concurrent requests against a real server can.
      const tag = 'concurrent-tag'
      const count = 20
      const keys = Array.from({ length: count }, (_, i) => `concurrent-${i}`)

      await Promise.all(keys.map((key, i) => provider.set(key, `v-${i}`, { tags: [tag] })))

      for (const key of keys) {
        expect(await provider.get(key)).toBeDefined()
      }

      await provider.invalidateTag(tag)

      for (const key of keys) {
        expect(await provider.get(key)).toBeUndefined()
      }
    }, 30_000)

    it('CONSUMER PROPERTY: re-setting a key WITHOUT its tag detaches it, so a later invalidateTag() of the OLD tag does not delete it', async () => {
      await provider.set('detach-me', 'tagged-value', { tags: ['stale-tag'] })
      await provider.set('detach-me', 'untagged-value')

      await provider.invalidateTag('stale-tag')

      // If the reverse-index detach (on the plain re-set) had not run, this
      // key would still be a member of `_tag:stale-tag` and invalidateTag()
      // would have deleted it despite no longer carrying that tag.
      expect(await provider.get('detach-me')).toBe('untagged-value')

      await provider.delete('detach-me')
    })
  })

  describe('namespace-versioned clear()', () => {
    it('bumps the version so previously-set keys become unreachable via THIS provider, and a fresh set() is visible again', async () => {
      await provider.set('will-vanish', 'value-before-clear')
      expect(await provider.get('will-vanish')).toBe('value-before-clear')

      await provider.clear()

      // The old-generation key is not deleted — memcached has no way to
      // enumerate/delete it directly — merely unreachable under the new
      // generation's prefix.
      expect(await provider.get('will-vanish')).toBeUndefined()

      // A fresh set() under the NEW generation is visible immediately (the
      // in-process version cache is updated synchronously by clear() —
      // no wait for VERSION_CACHE_TTL_MS is needed on the SAME instance).
      await provider.set('will-vanish', 'value-after-clear')
      expect(await provider.get('will-vanish')).toBe('value-after-clear')
    })

    it('never touches a DIFFERENT keyPrefix instance sharing the same memcached server', async () => {
      const foreignProvider = createProvider({ servers, keyPrefix: `${KEY_PREFIX}foreign:` })
      try {
        await foreignProvider.set('shared-server-key', 'foreign-survives')
        await provider.set('own-key', 'own-value')

        await provider.clear()

        expect(await provider.get('own-key')).toBeUndefined()
        expect(await foreignProvider.get('shared-server-key')).toBe('foreign-survives')
      } finally {
        await foreignProvider.close()
      }
    })
  })
})
