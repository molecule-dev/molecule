/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { get, getOrSet, set, setProvider } from '@molecule/api-cache'

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('bonds the memory cache through the core and round-trips values', async () => {
    const cache = createProvider({ maxSize: 1000, defaultTtl: 300 })
    setProvider(cache)

    await set('user:123:profile', { name: 'Ada' }, { ttl: 60 })
    expect(await get<{ name: string }>('user:123:profile')).toEqual({ name: 'Ada' })

    const loader = vi.fn(async () => ({ visits: 42 }))
    expect(await getOrSet('stats:daily', loader, { ttl: 600 })).toEqual({ visits: 42 })
    expect(await getOrSet('stats:daily', loader, { ttl: 600 })).toEqual({ visits: 42 })
    expect(loader).toHaveBeenCalledTimes(1)

    await cache.close?.()
  })

  it('treats ttl as seconds', async () => {
    vi.useFakeTimers()
    const cache = createProvider({ cleanupInterval: 0 })
    setProvider(cache)

    await set('short', 'v', { ttl: 60 })
    vi.advanceTimersByTime(59_000)
    expect(await get('short')).toBe('v')
    vi.advanceTimersByTime(2_000)
    expect(await get('short')).toBeUndefined()
  })
})
