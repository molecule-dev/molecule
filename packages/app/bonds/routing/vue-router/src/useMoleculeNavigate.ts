/**
 * The molecule-named navigation composable.
 *
 * @module
 */

import type { NavigateOptions } from '@molecule/app-routing'

import { useMoleculeRouter } from './composables.js'
import type { Router } from './types.js'

/**
 * Composable to get a navigate function backed by the bound molecule `Router`, usable
 * inside any Vue Router app with or without `MoleculeRouterProvider`.
 *
 * The returned function accepts molecule's own `NavigateOptions` (`replace`, `state`,
 * `preserveQuery`, `preserveHash`) and drives the native Vue Router.
 *
 * @returns The navigate function.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useMoleculeNavigate } from '@molecule/app-routing-vue-router'
 *
 * const navigate = useMoleculeNavigate()
 * </script>
 * ```
 */
export function useMoleculeNavigate(): Router['navigate'] {
  const router = useMoleculeRouter()
  return (path: string, options?: NavigateOptions) => {
    router.value.navigate(path, options)
  }
}
