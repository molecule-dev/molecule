/**
 * Tests for Memcached cache provider.
 *
 * A small in-memory "fake" memcached client backs most tests (rather than
 * ad-hoc per-call argument branching) so the namespace-versioning and
 * atomic-append tag tracking can be exercised end-to-end against realistic
 * GET/SET/ADD/APPEND/INCR/DEL semantics, without a live memcached server.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

vi.mock('memcached', () => ({
  default: vi.fn(),
}))

import Memcached from 'memcached'

import type { CacheProvider } from '@molecule/api-cache'

import { createProvider } from '../provider.js'

type FakeMemcachedClient = {
  get: Mock
  set: Mock
  add: Mock
  append: Mock
  incr: Mock
  del: Mock
  getMulti: Mock
  flush: Mock
  end: Mock
  on: Mock
}

/**
 * A minimal in-memory memcached double: real GET/SET/ADD/APPEND/INCR/DEL
 * semantics (ADD only writes if absent, APPEND only writes if present and is
 * a raw string concatenation, INCR only works on an existing numeric value),
 * so the provider's version-bump and atomic-append tag logic can be verified
 * against realistic behavior. `flush` is included ONLY so tests can assert it
 * is never called — production code never wires it.
 */
const createFakeMemcachedClient = (): {
  client: FakeMemcachedClient
  store: Map<string, string>
} => {
  const store = new Map<string, string>()

  const client: FakeMemcachedClient = {
    get: vi.fn((key: string, cb: (err: Error | null, data: unknown) => void) => {
      cb(null, store.has(key) ? store.get(key) : undefined)
    }),
    set: vi.fn(
      (
        key: string,
        value: unknown,
        _ttl: number,
        cb: (err: Error | null, result: boolean) => void,
      ) => {
        store.set(key, value as string)
        cb(null, true)
      },
    ),
    add: vi.fn(
      (
        key: string,
        value: unknown,
        _ttl: number,
        cb: (err: Error | null, result: boolean) => void,
      ) => {
        if (store.has(key)) {
          cb(null, false)
          return
        }
        store.set(key, value as string)
        cb(null, true)
      },
    ),
    append: vi.fn(
      (key: string, value: unknown, cb: (err: Error | null, result: boolean) => void) => {
        if (!store.has(key)) {
          cb(null, false)
          return
        }
        store.set(key, (store.get(key) as string) + (value as string))
        cb(null, true)
      },
    ),
    incr: vi.fn(
      (key: string, amount: number, cb: (err: Error | null, result: boolean | number) => void) => {
        if (!store.has(key)) {
          cb(null, false)
          return
        }
        const next = parseInt(store.get(key) as string, 10) + amount
        store.set(key, String(next))
        cb(null, next)
      },
    ),
    del: vi.fn((key: string, cb: (err: Error | null, result: boolean) => void) => {
      const existed = store.delete(key)
      cb(null, existed)
    }),
    getMulti: vi.fn(
      (keys: string[], cb: (err: Error | null, data: Record<string, unknown>) => void) => {
        const result: Record<string, unknown> = {}
        for (const key of keys) {
          if (store.has(key)) result[key] = store.get(key)
        }
        cb(null, result)
      },
    ),
    flush: vi.fn((cb: (err: Error | null, results: boolean[]) => void) => {
      store.clear()
      cb(null, [true])
    }),
    end: vi.fn(),
    on: vi.fn(),
  }

  return { client, store }
}

/** Wires the mocked `Memcached` constructor to a fresh fake client and returns a provider backed by it. */
const createTestProvider = (
  options?: Parameters<typeof createProvider>[0],
): { provider: CacheProvider; client: FakeMemcachedClient; store: Map<string, string> } => {
  const { client, store } = createFakeMemcachedClient()
  ;(Memcached as unknown as Mock).mockImplementation(function () {
    return client
  })
  const provider = createProvider(options)
  return { provider, client, store }
}

describe('Memcached Cache Provider', () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    vi.clearAllMocks()
    // Hermetic against the ambient shell: a developer (or the live-test run)
    // with MEMCACHED_* exported must see the same results as CI, where none
    // are set. Tests that exercise env-var behavior set their own values.
    for (const key of ['MEMCACHED_SERVERS', 'MEMCACHED_HOST', 'MEMCACHED_PORT']) {
      savedEnv[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  describe('createProvider', () => {
    it('creates provider with default options', () => {
      const { provider } = createTestProvider()
      expect(Memcached).toHaveBeenCalled()
      expect(provider).toBeDefined()
      expect(typeof provider.get).toBe('function')
      expect(typeof provider.set).toBe('function')
      expect(typeof provider.delete).toBe('function')
      expect(typeof provider.has).toBe('function')
    })

    it('creates provider with custom servers', () => {
      createTestProvider({ servers: 'server1:11211,server2:11211' })
      expect(Memcached).toHaveBeenCalledWith('server1:11211,server2:11211', undefined)
    })

    it('creates provider with servers array', () => {
      createTestProvider({ servers: ['server1:11211', 'server2:11211'] })
      expect(Memcached).toHaveBeenCalledWith(['server1:11211', 'server2:11211'], undefined)
    })

    it('creates provider with host and port', () => {
      createTestProvider({ host: 'cache.example.com', port: 11212 })
      expect(Memcached).toHaveBeenCalledWith('cache.example.com:11212', undefined)
    })

    it('creates provider with custom options', () => {
      const memcachedOptions = { timeout: 5000, retries: 3 }
      createTestProvider({ options: memcachedOptions })
      expect(Memcached).toHaveBeenCalledWith(expect.anything(), memcachedOptions)
    })

    it('registers event handlers', () => {
      const { client } = createTestProvider()
      expect(client.on).toHaveBeenCalledWith('failure', expect.any(Function))
      expect(client.on).toHaveBeenCalledWith('reconnecting', expect.any(Function))
    })
  })

  describe('get', () => {
    it('returns undefined when key does not exist', async () => {
      const { provider } = createTestProvider({ keyPrefix: 'test:' })
      const result = await provider.get('nonexistent')
      expect(result).toBeUndefined()
    })

    it('returns parsed JSON value when key exists', async () => {
      const { provider, client, store } = createTestProvider({ keyPrefix: 'test:' })
      const testData = { name: 'test', value: 123 }
      store.set('test:v1:existing', JSON.stringify(testData))

      const result = await provider.get('existing')
      expect(result).toEqual(testData)
      expect(client.get).toHaveBeenCalledWith('test:v1:existing', expect.any(Function))
    })

    it('returns raw value when JSON parsing fails', async () => {
      const { provider, store } = createTestProvider({ keyPrefix: 'test:' })
      store.set('test:v1:raw', 'not-json-string')

      const result = await provider.get('raw')
      expect(result).toBe('not-json-string')
    })

    it('returns undefined and logs error on failure', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })
      client.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          if (key === 'test:v1:error-key') {
            cb(new Error('Connection failed'), undefined)
            return
          }
          cb(null, undefined)
        },
      )

      const result = await provider.get('error-key')
      expect(result).toBeUndefined()
    })

    it('applies the effective (versioned) key prefix', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })
      await provider.get('mykey')
      expect(client.get).toHaveBeenCalledWith('test:v1:mykey', expect.any(Function))
    })
  })

  describe('set', () => {
    it('sets value with JSON serialization', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })
      const testData = { name: 'test', value: 123 }
      await provider.set('mykey', testData)

      expect(client.set).toHaveBeenCalledWith(
        'test:v1:mykey',
        JSON.stringify(testData),
        0,
        expect.any(Function),
      )
    })

    it('sets value with TTL', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })
      await provider.set('mykey', 'value', { ttl: 3600 })

      expect(client.set).toHaveBeenCalledWith(
        'test:v1:mykey',
        '"value"',
        3600,
        expect.any(Function),
      )
    })

    it('converts TTLs over 30 days to an absolute unix timestamp (memcached protocol quirk)', async () => {
      // Memcached reads a lifetime > 2592000s as an absolute unix timestamp; passing a
      // 1-year relative TTL through raw would be interpreted as Feb 1971 → instant expiry.
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })

      const oneYear = 31536000
      const before = Math.floor(Date.now() / 1000)
      await provider.set('mykey', 'value', { ttl: oneYear })
      const after = Math.floor(Date.now() / 1000)

      const dataSetCall = client.set.mock.calls.find((call) => call[0] === 'test:v1:mykey')
      const lifetime = dataSetCall?.[2] as number
      expect(lifetime).toBeGreaterThanOrEqual(before + oneYear)
      expect(lifetime).toBeLessThanOrEqual(after + oneYear)

      // A TTL at exactly the 30-day boundary stays relative (still valid on the wire).
      client.set.mockClear()
      await provider.set('mykey', 'value', { ttl: 2592000 })
      expect(client.set).toHaveBeenCalledWith(
        'test:v1:mykey',
        '"value"',
        2592000,
        expect.any(Function),
      )
    })

    it('sets value with tags', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })
      await provider.set('mykey', 'value', { tags: ['user:123', 'session'] })

      expect(client.set).toHaveBeenCalledWith('test:v1:mykey', '"value"', 0, expect.any(Function))

      // Tag membership is recorded via atomic APPEND (falling back to ADD to
      // create the tag log for the first member).
      expect(client.add).toHaveBeenCalledWith(
        'test:v1:_tag:user:123',
        'test:v1:mykey\n',
        0,
        expect.any(Function),
      )
      expect(client.add).toHaveBeenCalledWith(
        'test:v1:_tag:session',
        'test:v1:mykey\n',
        0,
        expect.any(Function),
      )

      // Reverse index records which tags this key currently holds.
      expect(client.set).toHaveBeenCalledWith(
        'test:v1:_tags:mykey',
        'user:123\nsession\n',
        0,
        expect.any(Function),
      )
    })

    it('CONSUMER PROPERTY: adding a key to an existing tag APPENDs, never clobbering other members', async () => {
      // The regression this pins: the old JSON-array read-modify-write could
      // drop a concurrent writer's key (two concurrent tagged set() calls
      // racing the same array). Atomic APPEND cannot lose a concurrent write.
      const { provider, client, store } = createTestProvider({ keyPrefix: 'test:' })
      store.set('test:__version__', '1')
      store.set('test:v1:_tag:mytag', 'test:v1:oldkey\n')

      await provider.set('newkey', 'value', { tags: ['mytag'] })

      expect(client.append).toHaveBeenCalledWith(
        'test:v1:_tag:mytag',
        'test:v1:newkey\n',
        expect.any(Function),
      )
      expect(store.get('test:v1:_tag:mytag')).toBe('test:v1:oldkey\ntest:v1:newkey\n')
    })

    it('does not duplicate a tag-log entry when the same key is re-set with the same tag', async () => {
      const { provider, store } = createTestProvider({ keyPrefix: 'test:' })

      await provider.set('mykey', 'value', { tags: ['mytag'] })
      expect(store.get('test:v1:_tag:mytag')).toBe('test:v1:mykey\n')

      await provider.set('mykey', 'value2', { tags: ['mytag'] })
      expect(store.get('test:v1:_tag:mytag')).toBe('test:v1:mykey\n')
    })

    it('throws error on set failure', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })
      client.set.mockImplementation(
        (
          key: string,
          _value: unknown,
          _ttl: number,
          cb: (err: Error | null, result: boolean) => void,
        ) => {
          cb(new Error('Set failed'), false)
        },
      )

      await expect(provider.set('mykey', 'value')).rejects.toThrow('Set failed')
    })
  })

  describe('delete', () => {
    it('deletes existing key and returns true', async () => {
      const { provider, client, store } = createTestProvider({ keyPrefix: 'test:' })
      store.set('test:__version__', '1')
      store.set('test:v1:mykey', '"value"')

      const result = await provider.delete('mykey')
      expect(result).toBe(true)
      expect(client.del).toHaveBeenCalledWith('test:v1:mykey', expect.any(Function))
    })

    it('returns false when key does not exist', async () => {
      const { provider } = createTestProvider({ keyPrefix: 'test:' })
      const result = await provider.delete('nonexistent')
      expect(result).toBe(false)
    })

    it('returns false on error', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })
      client.del.mockImplementation(
        (key: string, cb: (err: Error | null, result: boolean) => void) => {
          cb(new Error('Delete failed'), false)
        },
      )

      const result = await provider.delete('error-key')
      expect(result).toBe(false)
    })

    it('detaches the key from its tag log before deleting it', async () => {
      const { provider, client, store } = createTestProvider({ keyPrefix: 'test:' })
      store.set('test:__version__', '1')
      store.set('test:v1:mykey', '"value"')
      store.set('test:v1:_tags:mykey', 'mytag\n')
      store.set('test:v1:_tag:mytag', 'test:v1:mykey\n')

      await provider.delete('mykey')

      // Removing the only member empties the tag log, so it is deleted outright
      // rather than left as an empty string.
      expect(client.del).toHaveBeenCalledWith('test:v1:_tag:mytag', expect.any(Function))
      expect(store.has('test:v1:_tag:mytag')).toBe(false)
      expect(store.has('test:v1:_tags:mykey')).toBe(false)
    })

    it('prunes (not deletes) a tag log with other surviving members', async () => {
      const { provider, client, store } = createTestProvider({ keyPrefix: 'test:' })
      store.set('test:__version__', '1')
      store.set('test:v1:mykey', '"value"')
      store.set('test:v1:_tags:mykey', 'mytag\n')
      store.set('test:v1:_tag:mytag', 'test:v1:otherkey\ntest:v1:mykey\n')

      await provider.delete('mykey')

      expect(client.set).toHaveBeenCalledWith(
        'test:v1:_tag:mytag',
        'test:v1:otherkey\n',
        0,
        expect.any(Function),
      )
      expect(store.get('test:v1:_tag:mytag')).toBe('test:v1:otherkey\n')
    })
  })

  describe('has', () => {
    it('returns true when key exists', async () => {
      const { provider, client, store } = createTestProvider({ keyPrefix: 'test:' })
      store.set('test:__version__', '1')
      store.set('test:v1:existing', 'some-value')

      const result = await provider.has('existing')
      expect(result).toBe(true)
      expect(client.get).toHaveBeenCalledWith('test:v1:existing', expect.any(Function))
    })

    it('returns false when key does not exist', async () => {
      const { provider } = createTestProvider({ keyPrefix: 'test:' })
      const result = await provider.has('nonexistent')
      expect(result).toBe(false)
    })

    it('returns false on error', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })
      client.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          if (key === 'test:v1:error-key') {
            cb(new Error('Connection failed'), undefined)
            return
          }
          cb(null, undefined)
        },
      )

      const result = await provider.has('error-key')
      expect(result).toBe(false)
    })
  })

  describe('getMany', () => {
    it('returns empty map for empty keys array', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })
      const result = await provider.getMany([])
      expect(result).toEqual(new Map())
      expect(client.getMulti).not.toHaveBeenCalled()
    })

    it('returns map of key-value pairs', async () => {
      const { provider, client, store } = createTestProvider({ keyPrefix: 'test:' })
      store.set('test:__version__', '1')
      store.set('test:v1:key1', JSON.stringify({ id: 1 }))
      store.set('test:v1:key2', JSON.stringify({ id: 2 }))

      const result = await provider.getMany(['key1', 'key2'])

      expect(result.get('key1')).toEqual({ id: 1 })
      expect(result.get('key2')).toEqual({ id: 2 })
      expect(client.getMulti).toHaveBeenCalledWith(
        ['test:v1:key1', 'test:v1:key2'],
        expect.any(Function),
      )
    })

    it('handles missing keys', async () => {
      const { provider, store } = createTestProvider({ keyPrefix: 'test:' })
      store.set('test:__version__', '1')
      store.set('test:v1:key1', JSON.stringify({ id: 1 }))
      // key2 is missing

      const result = await provider.getMany(['key1', 'key2'])

      expect(result.get('key1')).toEqual({ id: 1 })
      expect(result.has('key2')).toBe(false)
    })

    it('handles non-JSON values', async () => {
      const { provider, store } = createTestProvider({ keyPrefix: 'test:' })
      store.set('test:__version__', '1')
      store.set('test:v1:key1', 'plain-string')

      const result = await provider.getMany(['key1'])
      expect(result.get('key1')).toBe('plain-string')
    })

    it('returns empty map on error', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })
      client.getMulti.mockImplementation(
        (_keys: string[], cb: (err: Error | null, data: Record<string, unknown>) => void) => {
          cb(new Error('GetMulti failed'), {})
        },
      )

      const result = await provider.getMany(['key1', 'key2'])
      expect(result).toEqual(new Map())
    })
  })

  describe('setMany', () => {
    it('sets multiple key-value pairs', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })
      await provider.setMany([
        ['key1', { id: 1 }],
        ['key2', { id: 2 }],
      ])

      expect(client.set).toHaveBeenCalledWith(
        'test:v1:key1',
        JSON.stringify({ id: 1 }),
        0,
        expect.any(Function),
      )
      expect(client.set).toHaveBeenCalledWith(
        'test:v1:key2',
        JSON.stringify({ id: 2 }),
        0,
        expect.any(Function),
      )
    })

    it('applies cache options to all entries', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })
      await provider.setMany(
        [
          ['key1', 'value1'],
          ['key2', 'value2'],
        ],
        { ttl: 600 },
      )

      expect(client.set).toHaveBeenCalledWith('test:v1:key1', '"value1"', 600, expect.any(Function))
      expect(client.set).toHaveBeenCalledWith('test:v1:key2', '"value2"', 600, expect.any(Function))
    })
  })

  describe('deleteMany', () => {
    it('deletes multiple keys and returns count', async () => {
      const { provider, store } = createTestProvider({ keyPrefix: 'test:' })
      store.set('test:__version__', '1')
      store.set('test:v1:key1', '"a"')
      store.set('test:v1:key2', '"b"')
      store.set('test:v1:key3', '"c"')

      const count = await provider.deleteMany(['key1', 'key2', 'key3'])
      expect(count).toBe(3)
    })

    it('returns count of successfully deleted keys', async () => {
      const { provider, store } = createTestProvider({ keyPrefix: 'test:' })
      store.set('test:__version__', '1')
      store.set('test:v1:key1', '"a"')
      // key2 does not exist
      store.set('test:v1:key3', '"c"')

      const count = await provider.deleteMany(['key1', 'key2', 'key3'])
      expect(count).toBe(2)
    })

    it('handles empty array', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })
      const count = await provider.deleteMany([])
      expect(count).toBe(0)
      expect(client.del).not.toHaveBeenCalled()
    })
  })

  describe('invalidateTag', () => {
    it('deletes all keys associated with a tag', async () => {
      const { provider, client, store } = createTestProvider({ keyPrefix: 'test:' })
      store.set('test:__version__', '1')
      store.set('test:v1:_tag:mytag', 'test:v1:key1\ntest:v1:key2\ntest:v1:key3\n')

      await provider.invalidateTag('mytag')

      expect(client.del).toHaveBeenCalledWith('test:v1:key1', expect.any(Function))
      expect(client.del).toHaveBeenCalledWith('test:v1:key2', expect.any(Function))
      expect(client.del).toHaveBeenCalledWith('test:v1:key3', expect.any(Function))
      expect(client.del).toHaveBeenCalledWith('test:v1:_tag:mytag', expect.any(Function))
    })

    it('handles non-existent tag gracefully', async () => {
      const { provider } = createTestProvider({ keyPrefix: 'test:' })
      await expect(provider.invalidateTag('nonexistent')).resolves.not.toThrow()
    })

    it('handles errors gracefully', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })
      client.get.mockImplementation(
        (key: string, cb: (err: Error | null, data: unknown) => void) => {
          if (key === 'test:v1:_tag:error-tag') {
            cb(new Error('Get failed'), undefined)
            return
          }
          cb(null, undefined)
        },
      )

      await expect(provider.invalidateTag('error-tag')).resolves.not.toThrow()
    })

    it('CONSUMER PROPERTY: does not delete a key that was re-set WITHOUT the tag', async () => {
      // The regression this pins: invalidateTag() used to delete keys that had
      // been re-set WITHOUT the tag, because the tag tracking never detached a
      // key on a plain overwrite — historical membership won over current.
      const { provider, client, store } = createTestProvider({ keyPrefix: 'test:' })

      await provider.set('mykey', 'tagged-value', { tags: ['mytag'] })
      await provider.set('mykey', 'untagged-value')

      await provider.invalidateTag('mytag')

      expect(client.del).not.toHaveBeenCalledWith('test:v1:mykey', expect.any(Function))
      expect(store.has('test:v1:mykey')).toBe(true)
      expect(await provider.get('mykey')).toBe('untagged-value')
    })
  })

  describe('clear', () => {
    it('CONTRACT: never calls flush_all', async () => {
      const { provider, client, store } = createTestProvider({ keyPrefix: 'test:' })
      store.set('test:__version__', '1')

      await provider.clear()

      expect(client.flush).not.toHaveBeenCalled()
    })

    it('CONTRACT: never wipes other data written directly to the shared memcached server', async () => {
      // A raw `flush_all` (the pre-fix behavior) would destroy this regardless
      // of key naming — this is exactly the shared-server blast radius the
      // contract forbids.
      const { provider, client, store } = createTestProvider({ keyPrefix: 'test:' })
      store.set('other-app:session:abc', 'unrelated-data')
      await provider.set('mykey', 'value1')

      await provider.clear()

      expect(store.get('other-app:session:abc')).toBe('unrelated-data')
      expect(client.flush).not.toHaveBeenCalled()
    })

    it('CONTRACT: makes previously-set keys unreachable by bumping the namespace version', async () => {
      const { provider, store } = createTestProvider({ keyPrefix: 'test:' })

      await provider.set('mykey', 'value1')
      expect(await provider.get('mykey')).toBe('value1')

      await provider.clear()

      // The old generation's key is still physically present (memcached has no
      // way to delete it directly without enumeration) but no longer reachable.
      expect(store.has('test:v1:mykey')).toBe(true)
      expect(await provider.get('mykey')).toBeUndefined()

      // A fresh set() under the new generation is visible again.
      await provider.set('mykey', 'value2')
      expect(await provider.get('mykey')).toBe('value2')
      expect(store.has('test:v2:mykey')).toBe(true)
    })

    it('increments an existing version atomically rather than reseeding it', async () => {
      const { provider, client, store } = createTestProvider({ keyPrefix: 'test:' })
      store.set('test:__version__', '5')

      await provider.clear()

      expect(client.incr).toHaveBeenCalledWith('test:__version__', 1, expect.any(Function))
      expect(store.get('test:__version__')).toBe('6')
    })

    it('throws when incrementing the version fails', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })
      client.incr.mockImplementation(
        (
          _key: string,
          _amount: number,
          cb: (err: Error | null, result: boolean | number) => void,
        ) => {
          cb(new Error('Increment failed'), false)
        },
      )

      await expect(provider.clear()).rejects.toThrow('Increment failed')
    })
  })

  describe('close', () => {
    it('closes the client connection', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })
      await provider.close()
      expect(client.end).toHaveBeenCalled()
    })
  })

  describe('getOrSet', () => {
    it('returns cached value when it exists', async () => {
      const { provider, store } = createTestProvider({ keyPrefix: 'test:' })
      store.set('test:__version__', '1')
      store.set('test:v1:mykey', JSON.stringify({ id: 1, name: 'cached' }))

      const factory = vi.fn().mockResolvedValue({ id: 2, name: 'new' })
      const result = await provider.getOrSet('mykey', factory)

      expect(result).toEqual({ id: 1, name: 'cached' })
      expect(factory).not.toHaveBeenCalled()
    })

    it('calls factory and caches result when key does not exist', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })
      const newData = { id: 1, name: 'new' }
      const factory = vi.fn().mockResolvedValue(newData)

      const result = await provider.getOrSet('mykey', factory)

      expect(result).toEqual(newData)
      expect(factory).toHaveBeenCalled()
      expect(client.set).toHaveBeenCalledWith(
        'test:v1:mykey',
        JSON.stringify(newData),
        0,
        expect.any(Function),
      )
    })

    it('applies cache options when setting', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'test:' })
      const factory = vi.fn().mockResolvedValue('value')
      await provider.getOrSet('mykey', factory, { ttl: 300 })

      expect(client.set).toHaveBeenCalledWith('test:v1:mykey', '"value"', 300, expect.any(Function))
    })

    it('handles async factory function', async () => {
      const { provider } = createTestProvider({ keyPrefix: 'test:' })
      const factory = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return { computed: true }
      })

      const result = await provider.getOrSet('mykey', factory)
      expect(result).toEqual({ computed: true })
    })
  })

  describe('key prefix', () => {
    it('uses default prefix when not specified', () => {
      const { provider } = createTestProvider()
      expect(Memcached).toHaveBeenCalled()
      expect(provider).toBeDefined()
    })

    it('uses custom prefix correctly', async () => {
      const { provider, client } = createTestProvider({ keyPrefix: 'myapp:' })

      await provider.get('testkey')
      expect(client.get).toHaveBeenCalledWith('myapp:v1:testkey', expect.any(Function))
    })
  })

  describe('type safety', () => {
    it('preserves generic types for get', async () => {
      interface User {
        id: number
        name: string
      }

      const { provider, store } = createTestProvider({ keyPrefix: 'test:' })
      const userData: User = { id: 1, name: 'Test' }
      store.set('test:__version__', '1')
      store.set('test:v1:user:1', JSON.stringify(userData))

      const result = await provider.get<User>('user:1')
      expect(result?.id).toBe(1)
      expect(result?.name).toBe('Test')
    })

    it('preserves generic types for getMany', async () => {
      interface Product {
        sku: string
        price: number
      }

      const { provider, store } = createTestProvider({ keyPrefix: 'test:' })
      store.set('test:__version__', '1')
      store.set('test:v1:product:1', JSON.stringify({ sku: 'ABC', price: 99.99 }))

      const result = await provider.getMany<Product>(['product:1'])
      const product = result.get('product:1')
      expect(product?.sku).toBe('ABC')
      expect(product?.price).toBe(99.99)
    })
  })
})

describe('secret registration', () => {
  it('registers MEMCACHED_SERVERS in the @molecule/api-secrets registry as optional', async () => {
    // The regression this pins: MEMCACHED_SERVERS was `required: true` even
    // though createProvider() degrades gracefully to localhost:11211 — a
    // boot-time secrets report would flag a perfectly working default as
    // "not configured".
    await import('../index.js')
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    const definition = getSecretDefinition('MEMCACHED_SERVERS')
    expect(definition).toBeDefined()
    expect(definition?.required).toBe(false)
  })
})
