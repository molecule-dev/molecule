/**
 * Binding-case fakes for one area: the shared query cache that `useQuery`,
 * `usePrefetch` and `createQueryResource` read (`@molecule/app-query-react`
 * and its framework counterparts).
 *
 * A case seeds this area through `context.areas.query`. The factory bonds the
 * in-memory query provider (`@molecule/app-query-memory`) and starts from an
 * empty shared client, so every framework observes the same cache. The
 * document loader is the case's own recorded function argument
 * (`fetch: { $fn: 'fetch', resolve: … }`), so each load is a recorded call.
 * `control` steps act on the cache from outside the hook, the way another
 * part of the page does (named `query.<action>`):
 * - `query.set(key, data)` writes a document (a mutation's response).
 * - `query.invalidate(key)` marks a key or key prefix stale.
 * - `query.clear()` drops every document and in-flight fetch.
 * - `query.peek(key)` records the cached state as a `query.state` call.
 *
 * Determinism: the cache stamps documents with `Date.now()` (`updatedAt`) and
 * decides freshness from it. The factory pins the clock at the epoch, so
 * `updatedAt` is `0` in every framework, and fake timers installed later
 * (`fakeTimers` cases, run.ts) start from it: an `advance` step is what makes
 * a document stale.
 *
 * @module
 */

import { vi } from 'vitest'

import {
  configureQueryClient,
  getQueryClient,
  type QueryClientConfig,
  type QueryKey,
  resetQueryClient,
  setProvider as setQueryProvider,
} from '@molecule/app-query'
import { createProvider as createMemoryQueryProvider } from '@molecule/app-query-memory'

import type { AreaFakesFactory } from '../spec.js'
import { saveBonds } from './bonds.js'

/** One document in the cache before the hook mounts. */
export interface QuerySeedDocument {
  /** The document's key. */
  readonly key: QueryKey
  /** The document. */
  readonly data: unknown
}

/** What a case can seed for this area (`context.areas.query`). */
export interface QuerySeed {
  /** Client defaults (`staleMs`, `gcMs`). */
  readonly config?: QueryClientConfig
  /** Documents already cached (fresh) when the hook mounts. */
  readonly cached?: readonly QuerySeedDocument[]
}

/**
 * Builds this area's fakes for one case.
 *
 * @param context - The case context (`context.areas?.query` is this area's seed).
 * @param record - Receives the `query.state` calls `query.peek` makes.
 * @returns The area's controls and cleanup; nothing when the case does not seed the query area.
 */
export const createQueryFakes: AreaFakesFactory = (context, record) => {
  const seed = context.areas?.query
  if (!seed) return {}

  vi.setSystemTime(0)
  const restoreBonds = saveBonds(['query'])
  setQueryProvider(createMemoryQueryProvider())
  configureQueryClient(seed.config)
  resetQueryClient()
  const client = getQueryClient()
  for (const document of seed.cached ?? []) client.set(document.key, document.data)

  return {
    controls: {
      'query.set': (key, data) => {
        client.set(key as QueryKey, data)
      },
      'query.invalidate': (key) => {
        client.invalidate(key as QueryKey)
      },
      'query.clear': () => {
        client.clear()
      },
      'query.peek': (key) => {
        record('query.state', [key, client.getState(key as QueryKey)])
      },
    },
    dispose: () => {
      resetQueryClient()
      configureQueryClient(undefined)
      restoreBonds()
      vi.useRealTimers()
    },
  }
}
