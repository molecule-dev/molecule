/**
 * `useConsumedSearchParam` over Vue Router: the consumption rules come from
 * `@molecule/app-routing`'s `createConsumedSearchParam`, which every framework's
 * composable shares.
 *
 * @module
 */

import { computed, type ComputedRef, onMounted, onUnmounted, ref } from 'vue'

import { createConsumedSearchParam } from '@molecule/app-routing'

import { useMoleculeRouter } from './composables.js'

/**
 * Consume a credential query parameter into composable state and remove only that
 * parameter from the address through Vue Router. The value survives local re-renders,
 * failed-submit retries and later query-only navigation; a newly arriving value on the
 * same mounted route is consumed too and shows one commit later. Path, hash, unrelated
 * query values and router location state are retained, and Back/Forward restore the value
 * consumed on each entry.
 *
 * Vue Router owns the URL replacement, so the molecule router's location and
 * `window.location` agree.
 *
 * @param name - The credential query key to consume, for example `token` or `code`.
 * @returns A computed ref of the consumed value (`''` before first consumption) and a
 * state setter; the form clears it after a successful submit.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useConsumedSearchParam } from '@molecule/app-routing-vue-router'
 *
 * const consumed = useConsumedSearchParam('token')
 * // The form submits consumed.value[0] after the address no longer contains it,
 * // then clears it with consumed.value[1]('').
 * </script>
 * ```
 */
export function useConsumedSearchParam(
  name: string,
): ComputedRef<readonly [string, (value: string) => void]> {
  const router = useMoleculeRouter()
  const param = createConsumedSearchParam(router.value, name)
  const value = ref(param.get())
  const unsubscribe = param.subscribe((next) => {
    value.value = next
  })
  let disconnect: (() => void) | null = null
  // Following the router needs the committed mount, as React's effect does.
  onMounted(() => {
    disconnect = param.connect()
  })
  onUnmounted(() => {
    unsubscribe()
    disconnect?.()
    disconnect = null
  })
  return computed(() => [value.value, param.set] as const)
}
