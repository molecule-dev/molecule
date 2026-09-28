/**
 * Client-side query cache types for molecule.dev.
 *
 * The contract every query bond implements: a cache of documents keyed by
 * structured keys, filled by the app's own `fetch` functions, readable
 * synchronously, warmable ahead of a navigation, and observable.
 *
 * @module
 */

/**
 * A query key: an array of parts, compared by value (`['package', 'api-auth']`
 * equals another `['package', 'api-auth']`; an object part equals another with
 * the same entries). A key PREFIXES every longer key that starts with its
 * parts, which is what {@link QueryClient.invalidate} uses.
 */
export type QueryKey = readonly unknown[]

/**
 * How one document is fetched and how long it stays fresh.
 */
export interface QueryOptions<T> {
  /** What identifies the document. */
  key: QueryKey

  /** Loads the document. The signal aborts when nobody wants the result any more. */
  fetch: (signal: AbortSignal) => Promise<T>

  /** How long a cached document is fresh (no refetch). Defaults to the client's, then 5 minutes. */
  staleMs?: number

  /** How long an unused document stays in memory. Defaults to the client's, then 30 minutes. */
  gcMs?: number
}

/** Where a document stands. */
export type QueryStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * One document's state, as observers see it.
 */
export interface QueryState<T> {
  /** The document, when it has ever been loaded or set. */
  data: T | undefined

  /** `idle` before anything happened, `loading` with nothing cached yet, then `success` or `error`. */
  status: QueryStatus

  /** The last fetch's error, when `status` is `error`. */
  error: unknown

  /** A fetch is in flight (also while stale data is shown). */
  isFetching: boolean

  /** When `data` was last written, in milliseconds since the epoch. */
  updatedAt: number | undefined
}

/**
 * The cache. One per app (see `getQueryClient`), shared by every page.
 */
export interface QueryClient {
  /**
   * The cached document, synchronously, whether fresh or stale. Never fetches.
   *
   * @param key - The document's key.
   * @returns The document, or `undefined` when nothing is cached.
   */
  get<T>(key: QueryKey): T | undefined

  /**
   * The document's full state, synchronously.
   *
   * @param key - The document's key.
   * @returns The state; `idle` with no data for an unknown key.
   */
  getState<T>(key: QueryKey): QueryState<T>

  /**
   * The document: resolved at once when cached and fresh, shared with a
   * fetch already in flight, otherwise fetched and cached. Rejects when the
   * fetch fails; a failure is never cached, so the next call tries again.
   *
   * @param options - Key, fetch, freshness.
   * @returns The document.
   */
  fetch<T>(options: QueryOptions<T>): Promise<T>

  /**
   * Warms the cache for a document likely to be needed next. Never throws
   * and never rejects; does nothing when the document is cached and fresh
   * or already being fetched.
   *
   * @param options - Key, fetch, freshness.
   */
  prefetch<T>(options: QueryOptions<T>): void

  /**
   * Seeds the cache, for example from a JSON island the server rendered.
   *
   * @param key - The document's key.
   * @param data - The document.
   */
  set<T>(key: QueryKey, data: T): void

  /**
   * Marks the document, and every document whose key starts with this key,
   * as stale: the next `fetch` or `subscribe` refetches it.
   *
   * @param key - A key or a key prefix.
   */
  invalidate(key: QueryKey): void

  /**
   * Observes a document: emits its state now and on every change, starting
   * a fetch when the document is absent or stale.
   *
   * @param options - Key, fetch, freshness.
   * @param listener - Called with each state.
   * @returns Stops observing.
   */
  subscribe<T>(options: QueryOptions<T>, listener: (state: QueryState<T>) => void): () => void

  /** Drops every document and every in-flight fetch. */
  clear(): void
}

/**
 * Defaults a client applies to every query that does not say otherwise.
 */
export interface QueryClientConfig {
  /** Default freshness. Defaults to 5 minutes. */
  staleMs?: number

  /** Default time an unused document stays in memory. Defaults to 30 minutes. */
  gcMs?: number
}

/**
 * Query provider interface. All query bonds implement this.
 */
export interface QueryProvider {
  /** Provider name identifier (e.g. `'tanstack'`, `'memory'`). */
  readonly name: string

  /**
   * Creates a cache.
   *
   * @param config - Defaults for every query.
   * @returns A client.
   */
  createClient(config?: QueryClientConfig): QueryClient
}
