/**
 * `useMoleculeNavigate`: the provider router's navigate function.
 *
 * @module
 */

import type { NavigateOptions, Router } from '@molecule/app-routing'

import { useMoleculeRouter } from './useMoleculeRouter.js'

/**
 * A navigate function backed by the provider's molecule `Router`, React's
 * `useMoleculeNavigate()` in Svelte's idiom. It takes molecule's own `NavigateOptions`
 * (`replace`, `state`, `preserveQuery`, `preserveHash`) and drives SvelteKit's client
 * router through the bond.
 *
 * Call it during a component's initialisation, where Svelte reads context.
 *
 * @returns A function that navigates to a path.
 * @throws {I18nError} `routing.sveltekit.error.useMoleculeRouterOutsideRouter` when no
 * `MoleculeRouterProvider` is above the caller.
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useMoleculeNavigate } from '@molecule/app-routing-sveltekit'
 *
 *   const navigate = useMoleculeNavigate()
 * </script>
 *
 * <button onclick={() => navigate('/settings', { state: { from: '/profile' } })}>Settings</button>
 * ```
 */
export function useMoleculeNavigate(): Router['navigate'] {
  const router = useMoleculeRouter()
  return (path: string, options?: NavigateOptions) => {
    router.navigate(path, options)
  }
}
