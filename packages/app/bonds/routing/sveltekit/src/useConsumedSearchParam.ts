/**
 * `useConsumedSearchParam`: a one-time credential query parameter (a reset `token`, an
 * OAuth `code`) taken out of the URL and kept in memory, React's hook of the same name in
 * Svelte's idiom.
 *
 * The value lives over `@molecule/app-routing`'s `createConsumedSearchParam`, so every
 * framework's hook holds the same core consumer. React's hook re-adds the top-level
 * `window.history.state` keys React Router drops on a replace (`retainingHistoryState`);
 * this bond needs no such step — the SvelteKit history keeps the app's state as kit's
 * `page.state`, and the replace the consumer makes carries the location state through it.
 *
 * @module
 */

import { onDestroy, onMount } from 'svelte'
import { type Readable, writable } from 'svelte/store'

import { createConsumedSearchParam } from '@molecule/app-routing'

import { useMoleculeRouter } from './useMoleculeRouter.js'

/** The store {@link useConsumedSearchParam} returns: the current `[value, set]` tuple. */
export type UseConsumedSearchParamStore = Readable<readonly [string, (value: string) => void]>

/**
 * Takes a one-time credential (a reset `token`, an OAuth `code`) out of the URL and keeps
 * it in memory, React's `useConsumedSearchParam` in Svelte's idiom: a readable store of
 * the `[value, set]` tuple, through the router the nearest `MoleculeRouterProvider` built
 * over the app's SvelteKit navigation. The parameter is removed with a replace navigation
 * that keeps the path, the hash, the other query values and the location state; the value
 * survives renders and later query-only navigation, Back to an entry restores the value
 * consumed there, and a new value arriving on the same mounted route is consumed too.
 *
 * Call it during a component's initialisation, where Svelte reads context. It connects on
 * mount, as React's effect does, so a server render never navigates.
 *
 * @param name - The query key to consume, for example `token` or `code`.
 * @returns A readable store of the consumed value (`''` before the parameter was ever
 * present) and a setter (a form clears it after a successful submit).
 * @throws {I18nError} `routing.sveltekit.error.useMoleculeRouterOutsideRouter` when no
 * `MoleculeRouterProvider` is above the caller.
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useConsumedSearchParam } from '@molecule/app-routing-sveltekit'
 *
 *   const token = useConsumedSearchParam('token')
 *   // The form submits $token[0] after the address no longer contains it.
 * </script>
 * ```
 */
export function useConsumedSearchParam(name: string): UseConsumedSearchParamStore {
  const router = useMoleculeRouter()
  const param = createConsumedSearchParam(router, name)
  const tuple = writable<readonly [string, (value: string) => void]>([param.get(), param.set])
  const unsubscribe = param.subscribe((value) => tuple.set([value, param.set]))
  onDestroy(unsubscribe)
  // connect() consumes what the URL holds now and follows the router; its return stops
  // both. It runs once mounted, as React's `useEffect(() => param.connect(), [param])`
  // does, so a server render never navigates.
  onMount(() => param.connect())
  return tuple
}
