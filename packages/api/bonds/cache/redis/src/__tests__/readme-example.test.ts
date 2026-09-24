/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only `ioredis` (the Redis client) is
 * replaced by an in-memory fake; the provider's own logic runs for real.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { del, get, getOrSet, set, setProvider } from '@molecule/api-cache'

import { createProvider } from '../index.js'

const { Redis, data, quit, setex } = vi.hoisted(() => {
  const data = new Map<string, string>()
  const setex = vi.fn(async (key: string, _ttl: number, value: string) => {
    data.set(key, value)
    return 'OK'
  })
  const quit = vi.fn(async () => 'OK')
  const Redis = vi.fn(function () {
    return {
      get: vi.fn(async (key: string) => data.get(key) ?? null),
      set: vi.fn(async (key: string, value: string) => {
        data.set(key, value)
        return 'OK'
      }),
      setex,
      del: vi.fn(async (...keys: string[]) => keys.filter((key) => data.delete(key)).length),
      exists: vi.fn(async (key: string) => (data.has(key) ? 1 : 0)),
      on: vi.fn(),
      quit,
    }
  })
  return { Redis, data, quit, setex }
})

vi.mock('ioredis', () => ({ Redis, default: Redis }))

describe('README @example', () => {
  const originalUrl = process.env.REDIS_URL

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.REDIS_URL
    else process.env.REDIS_URL = originalUrl
    vi.restoreAllMocks()
  })

  it('bonds Redis through the core and round-trips, caches and deletes values', async () => {
    process.env.REDIS_URL = 'rediss://redis.example.com:6380'
    const handlers: Array<() => void> = []
    vi.spyOn(process, 'on').mockImplementation(((_event: string, handler: () => void) => {
      handlers.push(handler)
      return process
    }) as typeof process.on)

    const cache = createProvider({
      url: process.env.REDIS_URL,
      keyPrefix: 'myapp:',
      maxRetriesPerRequest: 1,
      commandTimeout: 2000,
    })
    setProvider(cache)

    await set('user:123:profile', { name: 'Ada' }, { ttl: 3600 })
    const profile = await get<{ name: string }>('user:123:profile')

    const loader = vi.fn(async () => ({ visits: 42 }))
    const stats = await getOrSet('stats:daily', loader, { ttl: 600 })
    await getOrSet('stats:daily', loader, { ttl: 600 })

    await del('user:123:profile')

    process.on('SIGTERM', () => void cache.close?.())

    expect(Redis).toHaveBeenCalledWith('rediss://redis.example.com:6380', {
      keyPrefix: 'myapp:',
      maxRetriesPerRequest: 1,
      enableOfflineQueue: undefined,
      commandTimeout: 2000,
    })
    expect(setex).toHaveBeenCalledWith('user:123:profile', 3600, '{"name":"Ada"}')
    expect(profile).toEqual({ name: 'Ada' })
    expect(stats).toEqual({ visits: 42 })
    expect(loader).toHaveBeenCalledTimes(1)
    expect(data.has('user:123:profile')).toBe(false)

    handlers[0]?.()
    expect(quit).toHaveBeenCalledTimes(1)
  })
})
