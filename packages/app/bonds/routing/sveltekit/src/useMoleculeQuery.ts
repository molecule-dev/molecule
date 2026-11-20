/**
 * `useMoleculeQuery`: the provider router's query values as a Svelte store.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { type Readable, writable } from 'svelte/store'

import type { QueryParams } from '@molecule/app-routing'

import { useMoleculeRouter } from './useMoleculeRouter.js'

/**
 * The current query params as a readable store, React's `useMoleculeQuery()` in
 * `@molecule/app-svelte`'s shape: the store re-emits after every navigation the router
 * commits, so a component reading `$query` re-renders on a link click, a back button or a
 * navigation made here.
 *
 * Call it during a component's initialisation, where Svelte reads context.
 *
 * @param T - The query record type.
 * @returns A readable store of the current query parameters.
 * @throws {I18nError} `routing.sveltekit.error.useMoleculeRouterOutsideRouter` when no
 * `MoleculeRouterProvider` is above the caller.
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useMoleculeQuery } from '@molecule/app-routing-sveltekit'
 *
 *   const query = useMoleculeQuery()
 * </script>
 *
 * <p>Search: {$query.q}</p>
 * ```
 */
export function useMoleculeQuery<T extends QueryParams = QueryParams>(): Readable<T> {
  const router = useMoleculeRouter()
  const store = writable<T>(router.getQuery() as T)
  const stop = router.subscribe(() => {
    store.set(router.getQuery() as T)
  })
  onDestroy(stop)
  return { subscribe: store.subscribe }
}
