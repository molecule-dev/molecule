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
 * Reads and writes are ordered against each other. Every write, remove and
 * externally observed change bumps that key's generation, and every read
 * records the generation it started at; a read that finishes after the
 * generation moved is discarded, so a slow provider can never write an older
 * value over a newer one. A provider swap bumps a store-wide epoch, so a read
 * still in flight against the previous provider is discarded too.
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
  /**
   * Per-key change counter. Every write, remove or externally observed change
   * bumps it; a read that started at an older generation is stale on arrival.
   */
  const generations = new Map<string, number>()
  /** The provider the cache and remote subscriptions belong to. */
  let current: StorageProvider | null = null
  /** Bumped on every provider swap; a read from another epoch is stale. */
  let providerEpoch = 0
  /** False until the resolver has answered once. */
  let initialized = false

  /** The key's current generation (0 before its first change). */
  const generationOf = (key: string): number => generations.get(key) ?? 0

  /** Marks the key's snapshot as superseded by a newer change. */
  const bump = (key: string): void => {
    generations.set(key, generationOf(key) + 1)
  }

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
          // An observed external change is newer than any read that started
          // before it: bump FIRST so that read cannot overwrite this value.
          bump(key)
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
      // every cached value is stale by definition — and so is every read that
      // started against the old provider.
      providerEpoch += 1
      cache.clear()
      pending.clear()
      generations.clear()
    }
    initialized = true
    for (const stop of remoteStops.values()) stop()
    remoteStops.clear()
    if (next) for (const key of listeners.keys()) attachRemote(key, next)
    return next
  }

  /**
   * Applies a read result unless the provider or the key moved while it was in
   * flight.
   * @returns `true` when the value was applied.
   */
  const applyRead = (key: string, value: unknown, epoch: number, generation: number): boolean => {
    if (epoch !== providerEpoch || generation !== generationOf(key)) return false
    cache.set(key, value)
    notify(key, value)
    return true
  }

  const load = (provider: StorageProvider, key: string): Promise<void> => {
    const inFlight = pending.get(key)
    if (inFlight) return inFlight
    const epoch = providerEpoch
    const generation = generationOf(key)
    const task = (async () => {
      let value: unknown
      try {
        value = await provider.get(key)
      } catch (_error) {
        // An unavailable or corrupt value reads as absent, the same contract as
        // the synchronous helpers this adapter replaces.
        value = null
      }
      applyRead(key, value, epoch, generation)
    })()
    pending.set(key, task)
    void task.finally(() => {
      // Only retire THIS read's entry: a provider swap clears `pending`, and a
      // replacement read may already own the key. Deleting blindly would drop
      // that newer read's dedupe entry and start a second backend read.
      if (pending.get(key) === task) pending.delete(key)
    })
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
    // This write supersedes every read that started before it.
    bump(key)
    cache.set(key, value)
    notify(key, value)
    if (!provider) return
    persist(() => provider.set(key, value))
  }

  const remove = (key: string): void => {
    const provider = ensure()
    bump(key)
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
    // Hydration FILLS the snapshot; it is not a refresh. A key that already has
    // a value (written here, or hydrated earlier) is left alone, so a periodic
    // caller never pays for a backend read it does not need. `refresh()` is the
    // path for re-reading a key whose value changed behind this store.
    const wanted = keys.filter((key) => !cache.has(key))
    if (wanted.length === 0) return
    if (provider.getSync) {
      for (const key of wanted) read(key)
      return
    }
    const epoch = providerEpoch
    // One backend round trip for the whole batch when the provider offers it;
    // a failure (or no `getMany`) falls back to per-key reads, whose failures
    // also read as absent.
    const batch = (async (): Promise<Map<string, unknown | null> | null> => {
      if (!provider.getMany) return null
      try {
        return await provider.getMany<unknown>([...wanted])
      } catch (_error) {
        return null
      }
    })()
    const tasks = wanted.map((key) => {
      const inFlight = pending.get(key)
      if (inFlight) return inFlight
      // Capture the generation BEFORE awaiting: a write, remove or external
      // change that lands while the batch is in flight wins over this snapshot.
      const generation = generationOf(key)
      const task = (async () => {
        let value: unknown
        const values = await batch
        if (values) {
          value = values.get(key) ?? null
        } else {
          try {
            value = await provider.get(key)
          } catch (_error) {
            value = null
          }
        }
        applyRead(key, value, epoch, generation)
      })()
      pending.set(key, task)
      void task.finally(() => {
        if (pending.get(key) === task) pending.delete(key)
      })
      return task
    })
    await Promise.all(tasks)
  }

  const refresh = async (keys?: string | readonly string[]): Promise<void> => {
    const provider = ensure()
    const targets =
      keys === undefined ? [...cache.keys()] : typeof keys === 'string' ? [keys] : [...keys]
    if (!provider) {
      // No backend: the in-memory snapshot is the only truth, nothing to re-read.
      return
    }
    for (const key of targets) {
      // Discard the snapshot AND every read that started before this point, so
      // a slower older read cannot land on top of the re-read below.
      bump(key)
      cache.delete(key)
      pending.delete(key)
    }
    if (provider.getSync) {
      for (const key of targets) {
        let value: unknown
        try {
          value = provider.getSync<unknown>(key)
        } catch (_error) {
          // Unreadable now: absent for this refresh, retried on the next read.
          value = null
        }
        cache.set(key, value)
        notify(key, value)
      }
      return
    }
    await Promise.all(targets.map((key) => load(provider, key)))
  }

  return { get: read, set: write, remove, subscribe: listen, hydrate, refresh }
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
