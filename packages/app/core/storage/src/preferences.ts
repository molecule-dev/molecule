/**
 * Synchronous preference reads over the bonded storage provider.
 *
 * A preference (advanced mode, keep-awake, a panel width, restored tabs) is read
 * DURING the first render, and a render cannot await. This store is the small
 * adapter between that synchronous contract and the asynchronous
 * {@link StorageProvider}: it keeps the last known value per key in memory,
 * seeds that memory from the provider's optional `getSync`, hydrates
 * asynchronously when the provider has no synchronous read, and fans changes out
 * to subscribers — same-tab writes directly, other-tab writes through the
 * provider's optional `subscribe`.
 *
 * Consumers persist through this store, never through `localStorage` /
 * `sessionStorage` / `AsyncStorage`: swapping the bonded provider then redirects
 * those preferences for every consumer, including ones that render
 * synchronously.
 *
 * @module
 */

import { getProvider, hasProvider } from './provider.js'
import type { PreferenceListener, PreferenceStore, StorageProvider } from './types.js'

/**
 * Resolves the bonded provider, or `null` when none (or an empty bond slot) is
 * wired — the SSR, test and pre-`setupProviders()` case.
 * @returns The bonded provider, or `null`.
 */
const bondedProvider = (): StorageProvider | null => {
  if (!hasProvider()) return null
  try {
    return getProvider()
  } catch (_error) {
    // The slot is bonded but empty (a teardown sets `null`), which reads the
    // same as "no provider": preferences fall back to the in-memory cache.
    return null
  }
}

/**
 * Creates a preference store around a provider resolver.
 *
 * The resolver runs on every operation so a provider swapped at runtime (a test
 * host, a native build, a different backend) becomes the source of truth
 * immediately: a swap drops every cached value and re-attaches the change
 * subscriptions to the new provider.
 * @param resolveProvider - Returns the current provider, or `null` for "none".
 *   Defaults to the bonded `@molecule/app-storage` provider.
 * @returns A preference store backed by that provider.
 */
export function createPreferenceStore(
  resolveProvider: () => StorageProvider | null = bondedProvider,
): PreferenceStore {
  /** Values read or written since the last provider swap. */
  const cache = new Map<string, unknown>()
  /** Subscribers per key (this store's own, same-tab). */
  const listeners = new Map<string, Set<PreferenceListener>>()
  /** Active provider subscriptions per key (other-tab changes). */
  const remoteStops = new Map<string, () => void>()
  /** In-flight asynchronous reads, so concurrent renders share one read. */
  const pending = new Map<string, Promise<void>>()
  /** The provider the cache and remote subscriptions belong to. */
  let current: StorageProvider | null = null
  /** False until the resolver has answered once. */
  let initialized = false

  const resolveSafely = (): StorageProvider | null => {
    try {
      return resolveProvider()
    } catch (_error) {
      // A resolver may throw while the app is still booting; an unwired store
      // is a valid state (in-memory cache only), never a crash at render time.
      return null
    }
  }

  const notify = (key: string, value: unknown): void => {
    const subscribers = listeners.get(key)
    if (!subscribers) return
    for (const listener of [...subscribers]) {
      try {
        listener(value)
      } catch (_error) {
        // A subscriber's failure (a torn-down component, a throwing render)
        // must not abort the write that is already committed to the cache.
      }
    }
  }

  const attachRemote = (key: string, provider: StorageProvider): void => {
    if (!provider.subscribe || remoteStops.has(key)) return
    try {
      remoteStops.set(
        key,
        provider.subscribe(key, (value) => {
          cache.set(key, value)
          notify(key, value)
        }),
      )
    } catch (_error) {
      // A provider that cannot observe external changes still persists reads
      // and writes; only cross-tab propagation is unavailable.
    }
  }

  /** Detects a provider swap and moves the cache + subscriptions with it. */
  const ensure = (): StorageProvider | null => {
    const next = resolveSafely()
    if (initialized && next === current) return next
    current = next
    if (initialized) {
      // The cache belongs to the backend it was filled from: a different one
      // (including a change to or from "no provider") is the truth now, so
      // every cached value is stale by definition.
      cache.clear()
      pending.clear()
    }
    initialized = true
    for (const stop of remoteStops.values()) stop()
    remoteStops.clear()
    if (next) for (const key of listeners.keys()) attachRemote(key, next)
    return next
  }

  const load = (provider: StorageProvider, key: string): Promise<void> => {
    const inFlight = pending.get(key)
    if (inFlight) return inFlight
    const task = (async () => {
      let value: unknown
      try {
        value = await provider.get(key)
      } catch (_error) {
        // An unavailable or corrupt value reads as absent, the same contract as
        // the synchronous helpers this adapter replaces.
        value = null
      }
      cache.set(key, value)
      notify(key, value)
    })()
    pending.set(key, task)
    void task.finally(() => pending.delete(key))
    return task
  }

  const persist = (operation: () => Promise<unknown>): void => {
    try {
      void Promise.resolve(operation()).catch((_error: unknown) => {
        // Persistence is best-effort by contract (quota, private mode, a
        // detached store): the in-memory value and this session already work,
        // and the next write retries. See PreferenceStore's doc.
      })
    } catch (_error) {
      // A provider that throws synchronously lands in the same place.
    }
  }

  const read = <T = unknown>(key: string): T | null => {
    // Resolve first: a provider swapped since the last read invalidates the
    // snapshot, and a stale value must never win over the new backend.
    const provider = ensure()
    if (cache.has(key)) return cache.get(key) as T | null
    if (!provider) return null
    if (provider.getSync) {
      let value: T | null
      try {
        value = provider.getSync<T>(key)
      } catch (_error) {
        // Unreadable now: absent for this read, retried on the next one.
        value = null
      }
      cache.set(key, value)
      return value
    }
    // Asynchronous-only provider: paint the last known value (none yet) and let
    // the read's notification re-render the subscriber.
    void load(provider, key)
    return null
  }

  const write = <T = unknown>(key: string, value: T): void => {
    // Resolve first: a swap must invalidate the old snapshot BEFORE this write
    // lands, or the fresh value would be cleared with it.
    const provider = ensure()
    cache.set(key, value)
    notify(key, value)
    if (!provider) return
    persist(() => provider.set(key, value))
  }

  const remove = (key: string): void => {
    const provider = ensure()
    cache.set(key, null)
    notify(key, null)
    if (!provider) return
    persist(() => provider.remove(key))
  }

  const listen = (key: string, listener: PreferenceListener): (() => void) => {
    let subscribers = listeners.get(key)
    if (!subscribers) {
      subscribers = new Set()
      listeners.set(key, subscribers)
    }
    subscribers.add(listener)
    const provider = ensure()
    if (provider) attachRemote(key, provider)
    return () => {
      const currentSubscribers = listeners.get(key)
      if (!currentSubscribers) return
      currentSubscribers.delete(listener)
      if (currentSubscribers.size > 0) return
      listeners.delete(key)
      remoteStops.get(key)?.()
      remoteStops.delete(key)
    }
  }

  const hydrate = async (keys: readonly string[]): Promise<void> => {
    const provider = ensure()
    if (!provider) return
    if (provider.getSync) {
      for (const key of keys) read(key)
      return
    }
    if (provider.getMany) {
      let values: Map<string, unknown> | null
      try {
        values = await provider.getMany([...keys])
      } catch (_error) {
        // Fall through to per-key reads, whose failures also read as absent.
        values = null
      }
      if (values) {
        for (const key of keys) {
          const value = values.get(key) ?? null
          cache.set(key, value)
          notify(key, value)
        }
        return
      }
    }
    await Promise.all(keys.map((key) => load(provider, key)))
  }

  return { get: read, set: write, remove, subscribe: listen, hydrate }
}

let singleton: PreferenceStore | null = null

/**
 * The application's preference store, created on first use.
 *
 * Always call it inside a component, hook or event handler — never at module
 * scope, which runs before the app's bonds are set up. Reading or writing while
 * no provider is bonded works against an in-memory cache and simply does not
 * persist.
 * @returns The shared preference store.
 */
export function getPreferenceStore(): PreferenceStore {
  singleton ??= createPreferenceStore()
  return singleton
}
