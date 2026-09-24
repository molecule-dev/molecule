/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the `memcached` client is replaced
 * by an in-memory fake with GET/SET/ADD/APPEND/INCR/DEL semantics; the
 * provider's own logic (namespace versioning, serialization) runs for real.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { del, get, getOrSet, set, setProvider } from '@molecule/api-cache'

import { createProvider } from '../index.js'

type Cb<T> = (err: Error | null, result: T) => void

const { Memcached, data, clientSet, end } = vi.hoisted(() => {
  const data = new Map<string, string>()
  const clientSet = vi.fn((key: string, value: string, _ttl: number, cb: Cb<boolean>) => {
    data.set(key, value)
    cb(null, true)
  })
  const end = vi.fn()
  const Memcached = vi.fn(function () {
    return {
      get: vi.fn((key: string, cb: Cb<string | undefined>) => cb(null, data.get(key))),
      set: clientSet,
      add: vi.fn((key: string, value: string, _ttl: number, cb: Cb<boolean>) => {
        if (data.has(key)) return cb(null, false)
        data.set(key, value)
        cb(null, true)
      }),
      append: vi.fn((key: string, value: string, cb: Cb<boolean>) => {
        const current = data.get(key)
        if (current === undefined) return cb(null, false)
        data.set(key, current + value)
        cb(null, true)
      }),
      incr: vi.fn((key: string, amount: number, cb: Cb<number | boolean>) => {
        const current = data.get(key)
        if (current === undefined) return cb(null, false)
        const next = parseInt(current, 10) + amount
        data.set(key, String(next))
        cb(null, next)
      }),
      del: vi.fn((key: string, cb: Cb<boolean>) => cb(null, data.delete(key))),
      getMulti: vi.fn((keys: string[], cb: Cb<Record<string, string>>) => {
        const found: Record<string, string> = {}
        for (const key of keys) {
          const value = data.get(key)
          if (value !== undefined) found[key] = value
        }
        cb(null, found)
      }),
      end,
      on: vi.fn(),
    }
  })
  return { Memcached, data, clientSet, end }
})

vi.mock('memcached', () => ({ default: Memcached }))

describe('README @example', () => {
  const originalServers = process.env.MEMCACHED_SERVERS

  afterEach(() => {
    if (originalServers === undefined) delete process.env.MEMCACHED_SERVERS
    else process.env.MEMCACHED_SERVERS = originalServers
    vi.restoreAllMocks()
  })

  it('bonds memcached through the core and round-trips, caches and deletes values', async () => {
    process.env.MEMCACHED_SERVERS = 'cache-1:11211,cache-2:11211'
    const handlers: Array<() => void> = []
    vi.spyOn(process, 'on').mockImplementation(((_event: string, handler: () => void) => {
      handlers.push(handler)
      return process
    }) as typeof process.on)

    const cache = createProvider({
      servers: process.env.MEMCACHED_SERVERS?.split(','),
      keyPrefix: 'myapp:',
    })
    setProvider(cache)

    await set('user:123:profile', { name: 'Ada' }, { ttl: 3600 })
    const profile = await get<{ name: string }>('user:123:profile')

    const loader = vi.fn(async () => ({ visits: 42 }))
    const stats = await getOrSet('stats:daily', loader, { ttl: 600 })
    await getOrSet('stats:daily', loader, { ttl: 600 })

    await del('user:123:profile')

    process.on('SIGTERM', () => void cache.close?.())

    expect(Memcached).toHaveBeenCalledWith(['cache-1:11211', 'cache-2:11211'], undefined)
    expect(clientSet).toHaveBeenCalledWith(
      'myapp:v1:user:123:profile',
      '{"name":"Ada"}',
      3600,
      expect.any(Function),
    )
    expect(profile).toEqual({ name: 'Ada' })
    expect(stats).toEqual({ visits: 42 })
    expect(loader).toHaveBeenCalledTimes(1)
    expect(data.has('myapp:v1:user:123:profile')).toBe(false)

    handlers[0]?.()
    await Promise.resolve()
    expect(end).toHaveBeenCalledTimes(1)
  })
})
