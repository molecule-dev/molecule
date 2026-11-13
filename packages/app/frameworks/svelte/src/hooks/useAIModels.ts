/**
 * Svelte hook for the AI model catalog, porting React's `useAIModels`.
 *
 * Lazily fetches `GET /ai/models` on first mount and caches the result in a
 * module-level singleton so subsequent mounts return synchronously. The picker
 * shows a brief loading state on first open and never refetches afterwards.
 *
 * When a `projectId` is passed, the fetch is project-scoped
 * (`?projectId=<id>`) so servers that support per-project custom
 * ("bring your own AI") models include them; each scope caches independently.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { derived, type Readable, writable } from 'svelte/store'

import type { AppModelDefinition, AppModeModelDefaults } from '@molecule/app-ai-models'
import { loadAIModelCatalog, pickFreeTierModel } from '@molecule/app-ai-models'
import type { HttpClient } from '@molecule/app-http'

import { useHttpClient } from '../context.js'
import { fieldStore } from './live-store.js'

interface CacheState {
  models: AppModelDefinition[] | null
  defaults: AppModeModelDefaults | undefined
  error: Error | null
  inFlight: Promise<AppModelDefinition[]> | null
}

/** One cache entry per scope — `''` for the unscoped catalog, else the projectId. */
const caches = new Map<string, CacheState>()

/**
 * The cache entry for a scope, created on first use.
 *
 * @param scope - `''` for the unscoped catalog, else the projectId.
 * @returns The scope's cache entry.
 */
function cacheFor(scope: string): CacheState {
  let cache = caches.get(scope)
  if (!cache) {
    cache = { models: null, defaults: undefined, error: null, inFlight: null }
    caches.set(scope, cache)
  }
  return cache
}

type Listener = (state: {
  models: AppModelDefinition[] | null
  defaults: AppModeModelDefaults | undefined
  error: Error | null
}) => void
/** Listeners keyed by the same scope as the cache they observe. */
const listenersByScope = new Map<string, Set<Listener>>()

/**
 * The listener set for a scope, created on first use.
 *
 * @param scope - The cache scope.
 * @returns The scope's listener set.
 */
function listenersFor(scope: string): Set<Listener> {
  let set = listenersByScope.get(scope)
  if (!set) {
    set = new Set()
    listenersByScope.set(scope, set)
  }
  return set
}

/**
 * Broadcasts a scope's current cache state to its subscribed listeners.
 *
 * @param scope - The cache scope to notify.
 */
function notify(scope: string): void {
  const cache = cacheFor(scope)
  for (const listener of listenersFor(scope)) {
    listener({ models: cache.models, defaults: cache.defaults, error: cache.error })
  }
}

/**
 * Triggers (or rejoins) the single in-flight fetch of `/ai/models` for a scope
 * and stores the result in that scope's module-level cache.
 *
 * @param http - HTTP client used for the single fetch.
 * @param scope - `''` for the unscoped catalog, else the projectId.
 * @returns The fetched model list.
 */
async function fetchOnce(http: HttpClient, scope: string): Promise<AppModelDefinition[]> {
  const cache = cacheFor(scope)
  if (cache.models) return cache.models
  if (cache.inFlight) return cache.inFlight

  cache.inFlight = loadAIModelCatalog(http, undefined, scope || undefined)
    .then((catalog) => {
      cache.models = catalog.models
      cache.defaults = catalog.defaults
      cache.error = null
      cache.inFlight = null
      notify(scope)
      return catalog.models
    })
    .catch((err: unknown) => {
      cache.error = err instanceof Error ? err : new Error(String(err))
      cache.inFlight = null
      notify(scope)
      throw cache.error
    })

  return cache.inFlight
}

/**
 * Test-only: drops every cached model list so the next `useAIModels` call
 * refetches. Exposed for unit tests; do not call from production code.
 */
export function resetAIModelsCache(): void {
  for (const [scope, cache] of caches) {
    cache.models = null
    cache.defaults = undefined
    cache.error = null
    cache.inFlight = null
    notify(scope)
  }
  caches.clear()
}

/**
 * The cache snapshot one mount observes.
 */
interface CacheSnapshot {
  models: AppModelDefinition[] | null
  defaults: AppModeModelDefaults | undefined
  error: Error | null
}

/**
 * Result returned by `useAIModels`.
 */
export interface UseAIModelsResult {
  /** Available models, or an empty array while loading, as a readable store. */
  models: Readable<AppModelDefinition[]>
  /**
   * Per-mode server default model ids for the requester's tier, or `undefined`
   * while loading or on servers that don't provide them.
   */
  defaults: Readable<AppModeModelDefaults | undefined>
  /** The single model marked `freeTier: true`, or `undefined`. */
  freeTierModel: Readable<AppModelDefinition | undefined>
  /** `true` while the initial fetch is in flight. */
  loading: Readable<boolean>
  /** Error from the initial fetch, or `null`. */
  error: Readable<Error | null>
}

/**
 * Subscribes to the cached AI model catalog, React's `useAIModels` in Svelte's
 * idiom: call it during component init under `setMoleculeContext({ http })`.
 * The first mount of a scope triggers a single `GET /ai/models` fetch;
 * subsequent mounts return the cached result, and a scope whose fetch failed
 * does not refetch on a later mount.
 *
 * @param projectId - Optional project scope: includes that project's custom
 *   ("bring your own AI") models on servers that support them.
 * @returns Models, free-tier model, loading flag, and error, as stores.
 * @example
 * ```svelte
 * <script>
 *   import { useAIModels } from '@molecule/app-svelte'
 *   const { models, freeTierModel, loading } = useAIModels()
 * </script>
 * ```
 */
export function useAIModels(projectId?: string): UseAIModelsResult {
  const http = useHttpClient()
  const scope = projectId ?? ''
  const cache = cacheFor(scope)
  const snapshot = writable<CacheSnapshot>({
    models: cache.models,
    defaults: cache.defaults,
    error: cache.error,
  })

  const listener: Listener = (next) => snapshot.set(next)
  listenersFor(scope).add(listener)
  onDestroy(() => {
    listenersFor(scope).delete(listener)
  })

  // The writable was created from the same cache; this re-read is React's
  // effect resync (its lazy useState init may have raced a scope change).
  snapshot.set({ models: cache.models, defaults: cache.defaults, error: cache.error })

  if (!cache.models && !cache.error) {
    void fetchOnce(http, scope).catch((_error: unknown) => {
      // fetchOnce mirrors the error into cache.error, which the listener delivers.
    })
  }

  const loading = derived(snapshot, (current) => !current.models && !current.error)
  return {
    models: derived(snapshot, (current) => current.models ?? []),
    defaults: fieldStore(snapshot, 'defaults'),
    freeTierModel: derived(snapshot, (current) => pickFreeTierModel(current.models ?? [])),
    loading,
    error: fieldStore(snapshot, 'error'),
  }
}
