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
import { remove as removeStorage, set as setStorage } from '../utilities.js'

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

/**
 * A provider whose READS never settle on their own — the test decides when each
 * read finishes and with what value. That is how a slow backend (native
 * AsyncStorage, an encrypted store, a network-backed cache) is modeled, and it
 * is the only way to observe what an in-flight read does when the world moved
 * on before it landed.
 * @param initial - Values the provider holds.
 * @param features - Which optional methods to expose (`getMany`).
 * @returns The provider plus the handles a test uses to settle its reads.
 */
function controlledProvider(
  initial: Record<string, unknown> = {},
  features: { getMany?: boolean } = {},
): {
  provider: StorageProvider
  values: Map<string, unknown>
  remoteListeners: Map<string, (value: unknown) => void>
  readCount: () => number
  resolveNext: (value: unknown) => void
  resolveMany: (values: Map<string, unknown | null>) => void
} {
  const values = new Map<string, unknown>(Object.entries(initial))
  const pendingReads: Array<(value: unknown) => void> = []
  const pendingBatches: Array<(values: Map<string, unknown | null>) => void> = []
  const remoteListeners = new Map<string, (value: unknown) => void>()
  let reads = 0
  const provider: StorageProvider = {
    get<T = unknown>(_key: string): Promise<T | null> {
      reads += 1
      return new Promise<T | null>((resolve) => {
        pendingReads.push((value) => resolve(value as T | null))
      })
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
    subscribe(key: string, listener: (value: unknown) => void): () => void {
      remoteListeners.set(key, listener)
      return () => remoteListeners.delete(key)
    },
  }
  if (features.getMany) {
    provider.getMany = <T = unknown>(_keys: string[]): Promise<Map<string, T | null>> => {
      reads += 1
      return new Promise<Map<string, T | null>>((resolve) => {
        pendingBatches.push((result) => resolve(result as Map<string, T | null>))
      })
    }
  }
  return {
    provider,
    values,
    remoteListeners,
    readCount: () => reads,
    resolveNext: (value) => pendingReads.shift()?.(value),
    resolveMany: (result) => pendingBatches.shift()?.(result),
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

/**
 * The known-bad races, each written as the probe that fails on the previous
 * implementation (a read applied its result unconditionally):
 *
 * - providerSwap: an old provider's read lands after a swap and overwrites the
 *   new provider's snapshot.
 * - writeVsHydration: a read that started before `set()` lands after it and
 *   resurrects the replaced value.
 *
 * Every one of these asserts BOTH the final value and that no stale
 * notification reached a subscriber — a reverted snapshot that renders last is
 * the same defect even if it is later corrected.
 */
describe('stale reads cannot overwrite newer state', () => {
  it('discards a read from a provider that was swapped out mid-flight', async () => {
    const first = controlledProvider()
    const second = asyncProvider({ key: 'B' })
    let current: StorageProvider = first.provider
    const store = createPreferenceStore(() => current)
    const listener = vi.fn()
    store.subscribe('key', listener)

    // Renders against provider A: the read is now in flight.
    expect(store.get('key')).toBeNull()

    // The app swaps providers (a native/encrypted/test backend).
    current = second
    expect(store.get('key')).toBeNull()
    await flush()
    expect(store.get('key')).toBe('B')
    listener.mockClear()

    // The OLD provider's read finally answers. It must not land.
    first.resolveNext('STALE_A')
    await flush()

    expect(store.get('key')).toBe('B')
    expect(listener).not.toHaveBeenCalled()
  })

  it('does not let an in-flight read resurrect a value a newer write replaced', async () => {
    const backend = controlledProvider()
    const store = createPreferenceStore(() => backend.provider)
    const listener = vi.fn()
    store.subscribe('key', listener)

    expect(store.get('key')).toBeNull() // read starts
    store.set('key', 'NEW_WRITE') // the user acts before it lands
    listener.mockClear()

    backend.resolveNext('STALE_READ')
    await flush()

    expect(store.get('key')).toBe('NEW_WRITE')
    expect(listener).not.toHaveBeenCalled()
    await flush()
    expect(backend.values.get('key')).toBe('NEW_WRITE')
  })

  it('does not let an in-flight read resurrect a value a newer remove cleared', async () => {
    const backend = controlledProvider({ key: 'OLD' })
    const store = createPreferenceStore(() => backend.provider)

    expect(store.get('key')).toBeNull() // read starts
    store.remove('key')

    backend.resolveNext('OLD')
    await flush()

    expect(store.get('key')).toBeNull()
    expect(backend.values.has('key')).toBe(false)
  })

  it('applies a batch hydration only to the keys nobody changed meanwhile', async () => {
    const backend = controlledProvider({}, { getMany: true })
    const store = createPreferenceStore(() => backend.provider)

    const hydration = store.hydrate(['a', 'b'])
    store.set('a', 'NEW_WRITE')

    backend.resolveMany(
      new Map<string, unknown | null>([
        ['a', 'STALE_READ'],
        ['b', 'B'],
      ]),
    )
    await hydration

    // The untouched key takes the hydrated value; the written one keeps it.
    expect(store.get('a')).toBe('NEW_WRITE')
    expect(store.get('b')).toBe('B')
  })

  it('discards a batch hydration that started against a swapped-out provider', async () => {
    const first = controlledProvider({}, { getMany: true })
    const second = asyncProvider({ a: 'B' })
    let current: StorageProvider = first.provider
    const store = createPreferenceStore(() => current)

    const hydration = store.hydrate(['a'])
    current = second
    expect(store.get('a')).toBeNull()
    await flush()
    expect(store.get('a')).toBe('B')

    first.resolveMany(new Map<string, unknown | null>([['a', 'STALE_A']]))
    await hydration

    expect(store.get('a')).toBe('B')
  })

  it('does not let an in-flight read overwrite an externally observed change', async () => {
    const backend = controlledProvider()
    const store = createPreferenceStore(() => backend.provider)
    const listener = vi.fn()
    store.subscribe('key', listener)

    expect(store.get('key')).toBeNull() // read starts
    // Another tab (or another writer) changed the key while the read was slow.
    backend.remoteListeners.get('key')?.('EXTERNAL')
    backend.resolveNext('STALE_READ')
    await flush()

    expect(store.get('key')).toBe('EXTERNAL')
    expect(listener).toHaveBeenLastCalledWith('EXTERNAL')
  })

  it('keeps a newer read registered when an older, stale read finishes', async () => {
    const first = controlledProvider()
    const second = controlledProvider()
    let current: StorageProvider = first.provider
    const store = createPreferenceStore(() => current)

    expect(store.get('k')).toBeNull() // A's read is in flight
    current = second.provider
    const firstHydration = store.hydrate(['k']) // B's read is in flight
    await flush() // the per-key fallback read starts after the batch tick
    expect(second.readCount()).toBe(1)

    // A's stale read finishing must not retire B's `pending` entry — if it does,
    // the second hydrate starts a THIRD backend read instead of sharing one.
    first.resolveNext('STALE_A')
    await flush()
    const secondHydration = store.hydrate(['k'])
    expect(second.readCount()).toBe(1)

    second.resolveNext('B')
    await Promise.all([firstHydration, secondHydration])
    expect(store.get('k')).toBe('B')
  })
})

/**
 * A direct provider write bypasses the store's own write path, and a provider
 * cannot report a same-instance write through `subscribe`. `refresh()` is the
 * explicit contract that keeps the render-time snapshot from silently serving
 * the pre-write value.
 */
describe('direct provider writes (refresh contract)', () => {
  it('re-reads a key written through the provider itself', async () => {
    const provider = syncProvider()
    const store = createPreferenceStore(() => provider)

    expect(store.get('k')).toBeNull() // snapshots the pre-write value
    await provider.set('k', 'direct')
    await store.refresh('k')

    expect(store.get('k')).toBe('direct')
  })

  it('re-reads every snapshot key after the whole backend is cleared', async () => {
    const provider = syncProvider({ a: 1, b: 2 })
    const store = createPreferenceStore(() => provider)
    expect(store.get('a')).toBe(1)
    expect(store.get('b')).toBe(2)

    await provider.clear()
    await store.refresh()

    expect(store.get('a')).toBeNull()
    expect(store.get('b')).toBeNull()
  })

  it('keeps the snapshot coherent when the async storage helpers write', async () => {
    const provider = syncProvider()
    setProvider(provider)
    const store = getPreferenceStore()
    expect(store.get('k')).toBeNull()

    // The async helpers are the documented write path for handlers; they go
    // straight to the provider, so they must refresh the snapshot themselves.
    await setStorage('k', 'from-handler')
    expect(store.get('k')).toBe('from-handler')

    await removeStorage('k')
    expect(store.get('k')).toBeNull()
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
