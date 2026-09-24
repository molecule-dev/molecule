/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the in-memory bond.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-cache-memory'

import { del, get, getOrSet, set, setProvider } from '../index.js'

interface Profile {
  id: string
  name: string
}

describe('README @example', () => {
  it('bonds a provider, caches per-user values, runs the loader once, invalidates on delete', async () => {
    setProvider(createProvider({ cleanupInterval: 0 }))

    await set<Profile>('user:123:profile', { id: '123', name: 'Ada' }, { ttl: 3600 })
    expect(await get<Profile>('user:123:profile')).toEqual({ id: '123', name: 'Ada' })

    const loadProfile = vi.fn(async (id: string): Promise<Profile> => ({ id, name: 'Grace' }))
    const fresh = await getOrSet('user:456:profile', () => loadProfile('456'), { ttl: 600 })
    expect(fresh).toEqual({ id: '456', name: 'Grace' })
    await getOrSet('user:456:profile', () => loadProfile('456'), { ttl: 600 })
    expect(loadProfile).toHaveBeenCalledTimes(1)

    await del('user:123:profile')
    expect(await get('user:123:profile')).toBeUndefined()
  })
})
