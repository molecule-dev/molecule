/**
 * React hook for the AI model catalog.
 *
 * Lazily fetches `GET /ai/models` on first mount and caches the result in a
 * module-level singleton so subsequent mounts return synchronously. The picker
 * shows a brief loading state on first open and never refetches afterwards.
 *
 * @module
 */

import { useEffect, useState } from 'react'

import type { AppModelDefinition } from '@molecule/app-core-ai-models'
import { loadAIModels, pickFreeTierModel } from '@molecule/app-core-ai-models'
import type { HttpClient } from '@molecule/app-http'

import { useHttpClient } from './useHttp.js'

interface CacheState {
  models: AppModelDefinition[] | null
  error: Error | null
  inFlight: Promise<AppModelDefinition[]> | null
}

const cache: CacheState = {
  models: null,
  error: null,
  inFlight: null,
}

type Listener = (state: { models: AppModelDefinition[] | null; error: Error | null }) => void
const listeners = new Set<Listener>()

/**
 * Broadcasts the current cache state to every subscribed listener.
 */
function notify(): void {
  for (const listener of listeners) {
    listener({ models: cache.models, error: cache.error })
  }
}

/**
 * Triggers (or rejoins) the single in-flight fetch of `/ai/models` and stores
 * the result in the module-level cache.
 *
 * @param http - HTTP client used for the single fetch.
 * @returns The fetched model list.
 */
async function fetchOnce(http: HttpClient): Promise<AppModelDefinition[]> {
  if (cache.models) return cache.models
  if (cache.inFlight) return cache.inFlight

  cache.inFlight = loadAIModels(http)
    .then((models) => {
      cache.models = models
      cache.error = null
      cache.inFlight = null
      notify()
      return models
    })
    .catch((err) => {
      cache.error = err instanceof Error ? err : new Error(String(err))
      cache.inFlight = null
      notify()
      throw cache.error
    })

  return cache.inFlight
}

/**
 * Test-only: drops the cached model list so the next `useAIModels` call
 * refetches. Exposed for unit tests; do not call from production code.
 */
export function resetAIModelsCache(): void {
  cache.models = null
  cache.error = null
  cache.inFlight = null
  notify()
}

/**
 * Result returned by `useAIModels`.
 */
export interface UseAIModelsResult {
  /** Available models, or an empty array while loading. */
  models: AppModelDefinition[]
  /** The single model marked `freeTier: true`, or `undefined`. */
  freeTierModel: AppModelDefinition | undefined
  /** `true` while the initial fetch is in flight. */
  loading: boolean
  /** Error from the initial fetch, or `null`. */
  error: Error | null
}

/**
 * Subscribes to the cached AI model catalog. The first mount triggers a single
 * `GET /ai/models` fetch; subsequent mounts return the cached result.
 *
 * @returns Models, free-tier model, loading flag, and error.
 */
export function useAIModels(): UseAIModelsResult {
  const http = useHttpClient()
  const [snapshot, setSnapshot] = useState<{
    models: AppModelDefinition[] | null
    error: Error | null
  }>(() => ({ models: cache.models, error: cache.error }))

  useEffect(() => {
    const listener: Listener = (next) => setSnapshot(next)
    listeners.add(listener)

    if (!cache.models && !cache.error) {
      void fetchOnce(http).catch(() => {
        // Error is mirrored into cache.error and propagated via the listener.
      })
    }

    return () => {
      listeners.delete(listener)
    }
  }, [http])

  const models = snapshot.models ?? []
  return {
    models,
    freeTierModel: pickFreeTierModel(models),
    loading: !snapshot.models && !snapshot.error,
    error: snapshot.error,
  }
}
