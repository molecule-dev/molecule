/**
 * `useIsActive`: whether a path is active, as a Svelte store.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { type Readable, writable } from 'svelte/store'

import { useMoleculeRouter } from './useMoleculeRouter.js'

/**
 * Whether `path` is the current location (or a prefix of it), React's `useIsActive()` in
 * `@molecule/app-svelte`'s shape: a readable store that re-evaluates after every
 * navigation the router commits, so a nav link reading `$isActive` updates on a link
 * click, a back button or a navigation made here.
 *
 * Call it during a component's initialisation, where Svelte reads context.
 *
 * @param path - The path to check.
 * @param exact - Whether to require an exact match (default: a prefix match).
 * @returns A readable store of whether the path is active.
 * @throws {I18nError} `routing.sveltekit.error.useMoleculeRouterOutsideRouter` when no
 * `MoleculeRouterProvider` is above the caller.
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useIsActive } from '@molecule/app-routing-sveltekit'
 *
 *   const isSettingsActive = useIsActive('/settings')
 * </script>
 *
 * <a href="/settings" class={$isSettingsActive ? 'active' : ''}>Settings</a>
 * ```
 */
export function useIsActive(path: string, exact = false): Readable<boolean> {
  const router = useMoleculeRouter()
  const store = writable(router.isActive(path, exact))
  const stop = router.subscribe(() => {
    store.set(router.isActive(path, exact))
  })
  onDestroy(stop)
  return { subscribe: store.subscribe }
}
