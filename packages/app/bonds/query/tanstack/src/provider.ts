/**
 * TanStack Query-backed query client.
 *
 * @module
 */

import type { QueryKey as TanstackKey } from '@tanstack/query-core'
import { QueryClient as TanstackQueryClient, QueryObserver } from '@tanstack/query-core'

import type {
  QueryClient,
  QueryClientConfig,
  QueryKey,
  QueryOptions,
  QueryProvider,
  QueryState,
} from '@molecule/app-query'

import type { TanstackQueryConfig } from './types.js'

const DEFAULT_STALE_MS = 5 * 60 * 1000
const DEFAULT_GC_MS = 30 * 60 * 1000

/**
 * The molecule contract over one TanStack `QueryClient`.
 */
class TanstackClient implements QueryClient {
  private readonly qc: TanstackQueryClient
  private readonly staleMs: number
  private readonly gcMs: number

  /**
   * Wraps a TanStack client.
   *
   * @param qc - The TanStack client.
   * @param config - Defaults for every query.
   */
  constructor(qc: TanstackQueryClient, config: QueryClientConfig = {}) {
    this.qc = qc
    this.staleMs = config.staleMs ?? DEFAULT_STALE_MS
    this.gcMs = config.gcMs ?? DEFAULT_GC_MS
  }

  /**
   * The molecule options as TanStack query options.
   *
   * @param options - Key, fetch, freshness.
   * @returns TanStack options with retries off.
   */
  private tsOptions<T>(options: QueryOptions<T>): {
    queryKey: TanstackKey
    queryFn: (context: { signal: AbortSignal }) => Promise<T>
    staleTime: number
    gcTime: number
    retry: false
  } {
    return {
      queryKey: options.key as TanstackKey,
      queryFn: ({ signal }: { signal: AbortSignal }) => options.fetch(signal),
      staleTime: options.staleMs ?? this.staleMs,
      gcTime: options.gcMs ?? this.gcMs,
      retry: false as const,
    }
  }

  /**
   * The cached document, synchronously, fresh or stale.
   *
   * @param key - The document's key.
   * @returns The document, or `undefined`.
   */
  get<T>(key: QueryKey): T | undefined {
    return this.qc.getQueryData<T>(key as TanstackKey)
  }

  /**
   * The document's full state, synchronously.
   *
   * @param key - The document's key.
   * @returns The state; `idle` for an unknown key.
   */
  getState<T>(key: QueryKey): QueryState<T> {
    const q = this.qc.getQueryCache().find<T>({ queryKey: key as TanstackKey, exact: true })
    if (!q) {
      return {
        data: undefined,
        status: 'idle',
        error: undefined,
        isFetching: false,
        updatedAt: undefined,
      }
    }
    const s = q.state
    const status: QueryState<T>['status'] =
      s.status === 'pending' ? (s.fetchStatus === 'fetching' ? 'loading' : 'idle') : s.status
    return {
      data: s.data,
      status,
      error: s.error ?? undefined,
      isFetching: s.fetchStatus === 'fetching',
      updatedAt: s.dataUpdatedAt || undefined,
    }
  }

  /**
   * The document: cached-and-fresh at once, a fetch in flight shared, otherwise fetched.
   *
   * @param options - Key, fetch, freshness.
   * @returns The document.
   */
  fetch<T>(options: QueryOptions<T>): Promise<T> {
    return this.qc.fetchQuery(this.tsOptions(options))
  }

  /**
   * Warms the cache; never throws; skips a fresh or in-flight document.
   *
   * @param options - Key, fetch, freshness.
   */
  prefetch<T>(options: QueryOptions<T>): void {
    // prefetchQuery never rejects, and skips a fresh or in-flight query.
    void this.qc.prefetchQuery(this.tsOptions(options))
  }

  /**
   * Seeds the cache.
   *
   * @param key - The document's key.
   * @param data - The document.
   */
  set<T>(key: QueryKey, data: T): void {
    this.qc.setQueryData<T>(key as TanstackKey, data)
  }

  /**
   * Marks the key and everything it prefixes as stale.
   *
   * @param key - A key or a key prefix.
   */
  invalidate(key: QueryKey): void {
    // Not exact: every query whose key starts with these parts.
    void this.qc.invalidateQueries({ queryKey: key as TanstackKey, refetchType: 'none' })
  }

  /**
   * Observes a document, fetching it when absent or stale.
   *
   * @param options - Key, fetch, freshness.
   * @param listener - Called with each state.
   * @returns Stops observing.
   */
  subscribe<T>(options: QueryOptions<T>, listener: (state: QueryState<T>) => void): () => void {
    const observer = new QueryObserver<T>(this.qc, this.tsOptions(options))
    const relay = (): void => listener(this.getState<T>(options.key))
    relay()
    // The observer refetches when the query is stale or absent; it also
    // notifies on every state change until unsubscribed.
    return observer.subscribe(relay)
  }

  /** Drops every document and every in-flight fetch. */
  clear(): void {
    this.qc.cancelQueries().catch(() => {
      // Cancelling is best effort; the cache is cleared regardless.
    })
    this.qc.clear()
  }
}

/**
 * Creates a TanStack Query provider.
 *
 * @param config - Provider configuration.
 * @returns A query provider.
 */
export function createProvider(config: TanstackQueryConfig = {}): QueryProvider {
  return {
    name: 'tanstack',
    createClient(clientConfig?: QueryClientConfig): QueryClient {
      const qc =
        config.client ??
        new TanstackQueryClient({
          defaultOptions: {
            queries: {
              staleTime: clientConfig?.staleMs ?? DEFAULT_STALE_MS,
              gcTime: clientConfig?.gcMs ?? DEFAULT_GC_MS,
              retry: false,
            },
          },
        })
      return new TanstackClient(qc, clientConfig)
    },
  }
}

/** Default TanStack Query provider instance. */
export const provider: QueryProvider = createProvider()
