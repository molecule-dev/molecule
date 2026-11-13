/**
 * Angular function for the AI model catalog, mirroring `useAIModels` and
 * `resetAIModelsCache` from `@molecule/app-react`.
 *
 * The catalog cache is a module-level singleton shared by every instance of
 * this package, exactly like React's: the first mount of a scope fetches, and
 * later mounts (including a re-created host at the same site) read the cache.
 *
 * @module
 */

import { computed, DestroyRef, inject, type Signal, signal } from '@angular/core'

import type { AppModelDefinition, AppModeModelDefaults } from '@molecule/app-ai-models'
import { loadAIModelCatalog, pickFreeTierModel } from '@molecule/app-ai-models'
import type { HttpClient } from '@molecule/app-http'

import { useHttpClient } from './use-http.js'

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
 * Test-only: drops every cached model list so the next {@link useAIModels}
 * call refetches. Exposed for unit tests; do not call from production code.
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
 * The cache state one subscription sees.
 */
interface AIModelsSnapshot {
  /** The cached catalog, `null` before one lands. */
  models: AppModelDefinition[] | null
  /** The cached per-mode defaults. */
  defaults: AppModeModelDefaults | undefined
  /** The cached fetch failure. */
  error: Error | null
}

/**
 * Result returned by {@link useAIModels}: every field as a signal.
 */
export interface UseAIModelsResult {
  /** Available models, or an empty array while loading. */
  readonly models: Signal<AppModelDefinition[]>
  /**
   * Per-mode server default model ids for the requester's tier, or `undefined`
   * while loading or on servers that don't provide them.
   */
  readonly defaults: Signal<AppModeModelDefaults | undefined>
  /** The single model marked `freeTier: true`, or `undefined`. */
  readonly freeTierModel: Signal<AppModelDefinition | undefined>
  /** `true` while the initial fetch is in flight. */
  readonly loading: Signal<boolean>
  /** Error from the initial fetch, or `null`. */
  readonly error: Signal<Error | null>
}

/**
 * Subscribes to the cached AI model catalog. The first mount of a scope
 * triggers a single `GET /ai/models` fetch; subsequent mounts return the
 * cached result. Call it in an injection context.
 *
 * @param projectId - Optional project scope: includes that project's custom
 *   ("bring your own AI") models on servers that support them.
 * @returns Models, free-tier model, loading flag, and error as signals.
 */
export function useAIModels(projectId?: string): UseAIModelsResult {
  const http = useHttpClient()
  const scope = projectId ?? ''
  const destroyRef = inject(DestroyRef)

  const cache = cacheFor(scope)
  const snapshot = signal<AIModelsSnapshot>({
    models: cache.models,
    defaults: cache.defaults,
    error: cache.error,
  })

  const listener: Listener = (next) => snapshot.set(next)
  listenersFor(scope).add(listener)
  destroyRef.onDestroy(() => {
    listenersFor(scope).delete(listener)
  })

  if (!cache.models && !cache.error) {
    fetchOnce(http, scope).catch((_error: unknown) => {
      // fetchOnce mirrors the error into cache.error, which the listener delivers.
    })
  }

  const models = computed(() => snapshot().models ?? [])
  return {
    models,
    defaults: computed(() => snapshot().defaults),
    freeTierModel: computed(() => pickFreeTierModel(models())),
    loading: computed(() => !snapshot().models && !snapshot().error),
    error: computed(() => snapshot().error),
  }
}
