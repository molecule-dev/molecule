/**
 * `useMoleculeRouter`: the router the app's `MoleculeRouterProvider` mounted.
 *
 * @module
 */

import { I18nError } from '@molecule/app-i18n'
import type { Router } from '@molecule/app-routing'

import { readMoleculeRouter } from './router-context.js'

/**
 * The molecule `Router` the nearest `MoleculeRouterProvider` built over the app's
 * SvelteKit navigation. React's `useMoleculeRouter()` with no per-component fallback:
 * SvelteKit's client router is reachable only through the app's `$app/*` modules, so the
 * bond cannot build one here — without a provider there is no router to return.
 *
 * Call it during a component's initialisation, where Svelte reads context; the returned
 * router is the same object for the provider's whole mounted life.
 *
 * @returns The provider's router.
 * @throws {I18nError} `routing.sveltekit.error.useMoleculeRouterOutsideRouter` when no
 * `MoleculeRouterProvider` is above the caller.
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useMoleculeRouter } from '@molecule/app-routing-sveltekit'
 *
 *   const router = useMoleculeRouter()
 * </script>
 *
 * <button onclick={() => router.navigate('/dashboard')}>Go to Dashboard</button>
 * ```
 */
export function useMoleculeRouter(): Router {
  const router = readMoleculeRouter()
  if (!router) {
    throw new I18nError(
      'routing.sveltekit.error.useMoleculeRouterOutsideRouter',
      undefined,
      '`useMoleculeRouter` must be used inside a `MoleculeRouterProvider`. Render `MoleculeRouterProvider` in your root layout, around the page.',
    )
  }
  return router
}
