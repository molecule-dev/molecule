/**
 * Tests for the synchronous preference adapter over the async storage provider.
 *
 * Locks the contract every render-time consumer depends on: a synchronous read
 * on the first paint (seeded from `getSync`), same-tab notification on write,
 * cross-tab notification relayed from the provider's `subscribe`, asynchronous
 * hydration for providers that cannot answer synchronously, a PROVIDER SWAP
 * redirecting both reads and writes, and safe behavior when storage is
 * unavailable, corrupt, or absent.
 */

import { describe, expect, it, vi } from 'vitest'

import { createPreferenceStore, getPreferenceStore } from '../preferences.js'
import { setProvider } from '../provider.js'
import type { StorageProvider } from '../types.js'

/**
 * A synchronous in-memory provider — the shape a browser `localStorage`
 * provider has (getSync answers immediately).
 */
function syncProvider(initial: Record<string, unknown> = {}): StorageProvider & {
  values: Map<string, unknown>
  remoteListeners: Map<string, (value: unknown) => void>
  counts: { getSync: number }
} {
  const values = new Map<string, unknown>(Object.entries(initial))
  const remoteListeners = new Map<string, (value: unknown) => void>()
  const counts = { getSync: 0 }
  const provider: StorageProvider = {
    async get<T = unknown>(key: string): Promise<T | null> {
      return values.has(key) ? (values.get(key) as T) : null
    },
    async set<T = unknown>(key: string, value: T): Promise<void> {
      values.set(key, value)
    },
    async remove(key: string): Promise<void> {
      values.delete(key)
    },
    async clear(): Promise<void> {
      values.clear()
    },
    async keys(): Promise<string[]> {
      return [...values.keys()]
    },
    getSync<T = unknown>(key: string): T | null {
      counts.getSync += 1
      return values.has(key) ? (values.get(key) as T) : null
    },
    subscribe(key: string, listener: (value: unknown) => void): () => void {
      remoteListeners.set(key, listener)
      return () => remoteListeners.delete(key)
    },
  }
  return Object.assign(provider, { values, remoteListeners, counts })
}

/**
 * A provider that can only answer asynchronously — the native AsyncStorage
 * shape, where there is no `getSync`.
 */
function asyncProvider(initial: Record<string, unknown> = {}): StorageProvider {
  const values = new Map<string, unknown>(Object.entries(initial))
  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      return values.has(key) ? (values.get(key) as T) : null
    },
    async set<T = unknown>(key: string, value: T): Promise<void> {
      values.set(key, value)
    },
    async remove(key: string): Promise<void> {
      values.delete(key)
    },
    async clear(): Promise<void> {
      values.clear()
    },
    async keys(): Promise<string[]> {
      return [...values.keys()]
    },
    async getMany<T = unknown>(keys: string[]): Promise<Map<string, T | null>> {
      const result = new Map<string, T | null>()
      for (const key of keys) {
        result.set(key, values.has(key) ? (values.get(key) as T) : null)
      }
      return result
    },
  }
}

/** Lets a provider's optimistic write settle. */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('createPreferenceStore', () => {
  it('reads a persisted value synchronously on the first call', () => {
    const provider = syncProvider({ 'mol:width': 240 })
    const store = createPreferenceStore(() => provider)

    // No await: this is the render-time path.
    expect(store.get<number>('mol:width')).toBe(240)
    expect(provider.counts.getSync).toBe(1)

    // A second read is served from the snapshot, not the provider.
    expect(store.get<number>('mol:width')).toBe(240)
    expect(provider.counts.getSync).toBe(1)
  })

  it('writes through the bonded provider and notifies same-tab subscribers first', async () => {
    const provider = syncProvider()
    const store = createPreferenceStore(() => provider)
    const listener = vi.fn()
    store.subscribe('advanced', listener)

    store.set('advanced', true)

    // Subscribers and the snapshot update before the provider settles.
    expect(listener).toHaveBeenCalledWith(true)
    expect(store.get('advanced')).toBe(true)

    await flush()
    expect(provider.values.get('advanced')).toBe(true)
  })

  it('removes through the provider and notifies with null', async () => {
    const provider = syncProvider({ advanced: true })
    const store = createPreferenceStore(() => provider)
    const listener = vi.fn()
    store.subscribe('advanced', listener)

    store.remove('advanced')

    expect(listener).toHaveBeenCalledWith(null)
    expect(store.get('advanced')).toBeNull()
    await flush()
    expect(provider.values.has('advanced')).toBe(false)
  })

  it('redirects reads and writes when the provider is swapped', async () => {
    const first = syncProvider({ advanced: true })
    const second = syncProvider()
    let current: StorageProvider = first
    const store = createPreferenceStore(() => current)

    expect(store.get<boolean>('advanced')).toBe(true)

    current = second
    // The new provider is the truth: the old snapshot is gone.
    expect(store.get<boolean>('advanced')).toBeNull()

    store.set('advanced', false)
    await flush()
    expect(second.values.get('advanced')).toBe(false)
    expect(first.values.get('advanced')).toBe(true)

    current = first
    expect(store.get<boolean>('advanced')).toBe(true)
  })

  it('hydrates asynchronously when the provider has no synchronous read', async () => {
    const provider = asyncProvider({ theme: 'dark' })
    const store = createPreferenceStore(() => provider)
    const listener = vi.fn()
    store.subscribe('theme', listener)

    // First paint falls back to the last known value, not a promise.
    expect(store.get('theme')).toBeNull()

    await store.hydrate(['theme'])

    expect(store.get<string>('theme')).toBe('dark')
    expect(listener).toHaveBeenCalledWith('dark')
  })

  it('relays an external (other-tab) change from the provider subscription', () => {
    const provider = syncProvider()
    const store = createPreferenceStore(() => provider)
    const listener = vi.fn()
    store.subscribe('advanced', listener)

    // Another tab wrote the key: the provider reports it, never the store.
    provider.remoteListeners.get('advanced')?.(true)

    expect(listener).toHaveBeenCalledWith(true)
    expect(store.get('advanced')).toBe(true)
  })

  it('stops relaying an external change once the last subscriber leaves', () => {
    const provider = syncProvider()
    const store = createPreferenceStore(() => provider)
    const stop = store.subscribe('advanced', vi.fn())
    const relay = provider.remoteListeners.get('advanced')
    expect(relay).toBeDefined()

    stop()

    expect(provider.remoteListeners.has('advanced')).toBe(false)
  })

  it('treats an unreadable value as absent instead of throwing at render time', async () => {
    const provider = syncProvider()
    provider.getSync = () => {
      throw new Error('SecurityError: storage is blocked')
    }
    const store = createPreferenceStore(() => provider)

    expect(store.get('advanced')).toBeNull()
  })

  it('works with no provider at all (SSR / before the bonds are wired)', () => {
    const store = createPreferenceStore(() => null)
    const listener = vi.fn()
    const stop = store.subscribe('advanced', listener)

    expect(() => store.set('advanced', true)).not.toThrow()
    expect(store.get('advanced')).toBe(true)
    expect(() => store.remove('advanced')).not.toThrow()
    expect(() => store.get('advanced')).not.toThrow()
    stop()
  })

  it('swallows a persistence failure: the session keeps the value', async () => {
    const provider = syncProvider()
    provider.set = async () => {
      throw new Error('QuotaExceededError')
    }
    const store = createPreferenceStore(() => provider)

    store.set('advanced', true)
    await flush()

    expect(store.get('advanced')).toBe(true)
  })
})

describe('getPreferenceStore', () => {
  it('follows the bonded provider and redirects on a provider swap', async () => {
    const first = syncProvider({ advanced: true })
    setProvider(first)

    const store = getPreferenceStore()
    expect(store.get<boolean>('advanced')).toBe(true)

    const second = syncProvider()
    setProvider(second)
    expect(store.get<boolean>('advanced')).toBeNull()

    store.set('advanced', false)
    await flush()
    expect(second.values.get('advanced')).toBe(false)
    expect(first.values.get('advanced')).toBe(true)
  })
})
