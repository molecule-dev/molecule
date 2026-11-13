/**
 * The AI model catalog hook, under React's hook name.
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

import { type Accessor, createSignal, onCleanup } from 'solid-js'

import type { AppModelDefinition, AppModeModelDefaults } from '@molecule/app-ai-models'
import { loadAIModelCatalog, pickFreeTierModel } from '@molecule/app-ai-models'

import { useHttpClient } from './http.js'

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
async function fetchOnce(
  http: Parameters<typeof loadAIModelCatalog>[0],
  scope: string,
): Promise<AppModelDefinition[]> {
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
 * What {@link useAIModels} returns: the catalog fields as accessors (the same
 * names React returns).
 */
export interface UseAIModelsResult {
  /** Available models (an empty array while loading), as an accessor. */
  models: Accessor<AppModelDefinition[]>
  /** Per-mode server default model ids, or undefined while loading, as an accessor. */
  defaults: Accessor<AppModeModelDefaults | undefined>
  /** The single enabled model marked `freeTier: true`, as an accessor. */
  freeTierModel: Accessor<AppModelDefinition | undefined>
  /** Whether the initial fetch is in flight, as an accessor. */
  loading: Accessor<boolean>
  /** Error from the initial fetch, as an accessor. */
  error: Accessor<Error | null>
}

/**
 * Subscribes to the cached AI model catalog, under React's hook name. The
 * first mount of a scope triggers a single `GET /ai/models` fetch; subsequent
 * mounts return the cached result.
 *
 * @param projectId - Optional project scope: includes that project's custom
 *   ("bring your own AI") models on servers that support them.
 * @returns Models, free-tier model, loading flag, and error, as accessors.
 */
export function useAIModels(projectId?: string): UseAIModelsResult {
  const http = useHttpClient()
  const scope = projectId ?? ''

  const initial = cacheFor(scope)
  const [snapshot, setSnapshot] = createSignal<{
    models: AppModelDefinition[] | null
    defaults: AppModeModelDefaults | undefined
    error: Error | null
  }>({ models: initial.models, defaults: initial.defaults, error: initial.error })

  const listener: Listener = (next) => setSnapshot(() => next)
  listenersFor(scope).add(listener)
  // The scope may have changed since the lazy read above — resync.
  {
    const cache = cacheFor(scope)
    setSnapshot(() => ({ models: cache.models, defaults: cache.defaults, error: cache.error }))
  }

  if (!initial.models && !initial.error) {
    void fetchOnce(http, scope).catch((_error: unknown) => {
      // fetchOnce mirrors the error into cache.error, which the listener delivers.
    })
  }

  onCleanup(() => {
    listenersFor(scope).delete(listener)
  })

  return {
    models: () => snapshot().models ?? [],
    defaults: () => snapshot().defaults,
    freeTierModel: () => pickFreeTierModel(snapshot().models ?? []),
    loading: () => !snapshot().models && !snapshot().error,
    error: () => snapshot().error,
  }
}
