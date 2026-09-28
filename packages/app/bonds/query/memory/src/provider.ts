/**
 * In-memory query client: a Map of documents with freshness, in-flight
 * sharing, observers and garbage collection.
 *
 * @module
 */

import type {
  QueryClient,
  QueryClientConfig,
  QueryKey,
  QueryOptions,
  QueryProvider,
  QueryState,
} from '@molecule/app-query'
import { hashQueryKey, keyStartsWith } from '@molecule/app-query'

import type { MemoryQueryConfig } from './types.js'

const DEFAULT_STALE_MS = 5 * 60 * 1000
const DEFAULT_GC_MS = 30 * 60 * 1000

interface Entry<T> {
  key: QueryKey
  state: QueryState<T>
  stale: boolean
  gcMs: number
  gcTimer: ReturnType<typeof setTimeout> | null
  inflight: { promise: Promise<T>; controller: AbortController } | null
  listeners: Set<(state: QueryState<T>) => void>
}

/**
 * One cache.
 */
class MemoryQueryClient implements QueryClient {
  private readonly entries = new Map<string, Entry<unknown>>()
  private readonly staleMs: number
  private readonly gcMs: number

  /**
   * Creates the cache.
   *
   * @param config - Defaults for every query.
   */
  constructor(config: QueryClientConfig = {}) {
    this.staleMs = config.staleMs ?? DEFAULT_STALE_MS
    this.gcMs = config.gcMs ?? DEFAULT_GC_MS
  }

  /**
   * The entry for a key, created idle when unknown.
   *
   * @param key - The document's key.
   * @param gcMs - Its collection delay, when first seen.
   * @returns The entry.
   */
  private entry<T>(key: QueryKey, gcMs?: number): Entry<T> {
    const hash = hashQueryKey(key)
    let entry = this.entries.get(hash) as Entry<T> | undefined
    if (!entry) {
      entry = {
        key,
        state: {
          data: undefined,
          status: 'idle',
          error: undefined,
          isFetching: false,
          updatedAt: undefined,
        },
        stale: true,
        gcMs: gcMs ?? this.gcMs,
        gcTimer: null,
        inflight: null,
        listeners: new Set(),
      }
      this.entries.set(hash, entry as Entry<unknown>)
    }
    return entry
  }

  /**
   * Tells every observer of an entry its current state.
   *
   * @param entry - The entry.
   */
  private emit<T>(entry: Entry<T>): void {
    for (const listener of entry.listeners) listener(entry.state)
  }

  /**
   * Whether an entry holds data younger than `staleMs` and not invalidated.
   *
   * @param entry - The entry.
   * @param staleMs - The freshness window.
   * @returns `true` when fresh.
   */
  private isFresh<T>(entry: Entry<T>, staleMs: number): boolean {
    if (entry.stale || entry.state.updatedAt === undefined || entry.state.data === undefined)
      return false
    return Date.now() - entry.state.updatedAt < staleMs
  }

  /**
   * Drops the entry after its collection delay unless something uses it by then.
   *
   * @param entry - The entry.
   */
  private scheduleGc<T>(entry: Entry<T>): void {
    if (entry.gcTimer) clearTimeout(entry.gcTimer)
    entry.gcTimer = setTimeout(() => {
      if (entry.listeners.size || entry.inflight) return
      this.entries.delete(hashQueryKey(entry.key))
    }, entry.gcMs)
    // Never keep a process alive for a cache sweep.
    ;(entry.gcTimer as { unref?: () => void }).unref?.()
  }

  /**
   * Starts (or joins) the entry's fetch.
   *
   * @param entry - The entry.
   * @param options - Key, fetch, freshness.
   * @returns The document.
   */
  private start<T>(entry: Entry<T>, options: QueryOptions<T>): Promise<T> {
    if (entry.inflight) return entry.inflight.promise
    const controller = new AbortController()
    entry.state = {
      ...entry.state,
      isFetching: true,
      status: entry.state.data === undefined ? 'loading' : entry.state.status,
    }
    this.emit(entry)
    const promise = options
      .fetch(controller.signal)
      .then((data) => {
        entry.inflight = null
        entry.stale = false
        entry.state = {
          data,
          status: 'success',
          error: undefined,
          isFetching: false,
          updatedAt: Date.now(),
        }
        this.emit(entry)
        this.scheduleGc(entry)
        return data
      })
      .catch((error: unknown) => {
        entry.inflight = null
        entry.state = { ...entry.state, status: 'error', error, isFetching: false }
        this.emit(entry)
        this.scheduleGc(entry)
        throw error
      })
    entry.inflight = { promise, controller }
    return promise
  }

  /**
   * The cached document, synchronously, fresh or stale.
   *
   * @param key - The document's key.
   * @returns The document, or `undefined`.
   */
  get<T>(key: QueryKey): T | undefined {
    return this.entries.get(hashQueryKey(key))?.state.data as T | undefined
  }

  /**
   * The document's full state, synchronously.
   *
   * @param key - The document's key.
   * @returns The state; `idle` for an unknown key.
   */
  getState<T>(key: QueryKey): QueryState<T> {
    const entry = this.entries.get(hashQueryKey(key)) as Entry<T> | undefined
    return entry
      ? entry.state
      : {
          data: undefined,
          status: 'idle',
          error: undefined,
          isFetching: false,
          updatedAt: undefined,
        }
  }

  /**
   * The document: cached-and-fresh at once, a fetch in flight shared, otherwise fetched.
   *
   * @param options - Key, fetch, freshness.
   * @returns The document.
   */
  fetch<T>(options: QueryOptions<T>): Promise<T> {
    const entry = this.entry<T>(options.key, options.gcMs)
    if (this.isFresh(entry, options.staleMs ?? this.staleMs))
      return Promise.resolve(entry.state.data as T)
    return this.start(entry, options)
  }

  /**
   * Warms the cache; never throws; skips a fresh or in-flight document.
   *
   * @param options - Key, fetch, freshness.
   */
  prefetch<T>(options: QueryOptions<T>): void {
    const entry = this.entry<T>(options.key, options.gcMs)
    if (entry.inflight || this.isFresh(entry, options.staleMs ?? this.staleMs)) return
    this.start(entry, options).catch(() => {
      // Speculative: the real navigation reports a document that will not load.
    })
  }

  /**
   * Seeds the cache.
   *
   * @param key - The document's key.
   * @param data - The document.
   */
  set<T>(key: QueryKey, data: T): void {
    const entry = this.entry<T>(key)
    entry.stale = false
    entry.state = {
      data,
      status: 'success',
      error: undefined,
      isFetching: entry.state.isFetching,
      updatedAt: Date.now(),
    }
    this.emit(entry)
    this.scheduleGc(entry)
  }

  /**
   * Marks the key and everything it prefixes as stale.
   *
   * @param key - A key or a key prefix.
   */
  invalidate(key: QueryKey): void {
    for (const entry of this.entries.values()) {
      if (keyStartsWith(entry.key, key)) entry.stale = true
    }
  }

  /**
   * Observes a document, fetching it when absent or stale.
   *
   * @param options - Key, fetch, freshness.
   * @param listener - Called with each state.
   * @returns Stops observing.
   */
  subscribe<T>(options: QueryOptions<T>, listener: (state: QueryState<T>) => void): () => void {
    const entry = this.entry<T>(options.key, options.gcMs)
    entry.listeners.add(listener)
    if (entry.gcTimer) {
      clearTimeout(entry.gcTimer)
      entry.gcTimer = null
    }
    listener(entry.state)
    if (!entry.inflight && !this.isFresh(entry, options.staleMs ?? this.staleMs)) {
      this.start(entry, options).catch(() => {
        // The state carries the error; observers read it from there.
      })
    }
    return () => {
      entry.listeners.delete(listener)
      if (!entry.listeners.size) this.scheduleGc(entry)
    }
  }

  /** Drops every document and every in-flight fetch. */
  clear(): void {
    for (const entry of this.entries.values()) {
      entry.inflight?.controller.abort()
      if (entry.gcTimer) clearTimeout(entry.gcTimer)
    }
    this.entries.clear()
  }
}

/**
 * Creates an in-memory query provider.
 *
 * @param _config - Provider configuration (none today).
 * @returns A query provider.
 */
export function createProvider(_config: MemoryQueryConfig = {}): QueryProvider {
  return {
    name: 'memory',
    createClient(config?: QueryClientConfig): QueryClient {
      return new MemoryQueryClient(config)
    },
  }
}

/** Default in-memory provider instance. */
export const provider: QueryProvider = createProvider()
