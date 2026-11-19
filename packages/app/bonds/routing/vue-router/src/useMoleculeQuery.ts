/**
 * The molecule-named query composable.
 *
 * @module
 */

import { computed, type ComputedRef } from 'vue'

import { useMoleculeRouter } from './composables.js'
import type { QueryParams } from './types.js'

/**
 * Composable to get the current query params as a reactive ref, usable inside any Vue
 * Router app with or without `MoleculeRouterProvider`.
 *
 * The ref reads the live route on every access, so it follows links, `router.push` and
 * the browser's back button.
 *
 * @returns Reactive query params ref.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useMoleculeQuery } from '@molecule/app-routing-vue-router'
 *
 * const query = useMoleculeQuery()
 * </script>
 *
 * <template>
 *   <div>Search: {{ query.q }}</div>
 * </template>
 * ```
 */
export function useMoleculeQuery(): ComputedRef<QueryParams> {
  const router = useMoleculeRouter()
  return computed(() => router.value.getQuery())
}
