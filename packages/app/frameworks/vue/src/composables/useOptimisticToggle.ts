/**
 * Vue composable for a server-backed boolean toggle rendered with the app's own markup.
 *
 * @module
 */
import { type MaybeRefOrGetter, toValue } from 'vue'

import type { UseOptimisticToggleOptions, UseOptimisticToggleResult } from '../types.js'
import { useOptimisticValue } from './useOptimisticValue.js'

/**
 * Owns the state and save ordering of a follow, favorite, star or subscription control
 * while all markup stays in the app. Bind `toggle` straight to the click handler: it
 * takes no argument and flips the value shown now, including clicks made before the
 * component re-renders. `commit(desired)` receives the value to SAVE, never the old one,
 * and returns the server's boolean answer. Only the newest failure rolls the shown value
 * back.
 *
 * Saves run one at a time; clicks during a save coalesce to the newest desired value. Use
 * `pending` for feedback, not to disable the control or drop a click. Mount it only after
 * the record loads, key it by record identity, and keep it mounted through refetches. For
 * a flag with a related count, use `useOptimisticValue` with both fields in one value.
 *
 * @param options - The server value, the save and an optional error callback (or a ref or
 *   getter of them: a new `value` syncs in while nothing is saving).
 * @returns The value to render, `pending` and `error` as refs, and the stable `toggle`.
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useHttpClient, useOptimisticToggle, useTranslation } from '@molecule/app-vue'
 *
 * const props = defineProps<{ thread: { id: string; subscribed: boolean } }>()
 * const http = useHttpClient()
 * const { t } = useTranslation()
 * const subscription = useOptimisticToggle(() => ({
 *   value: props.thread.subscribed,
 *   commit: async (desired) => {
 *     const path = `/threads/${encodeURIComponent(props.thread.id)}/subscription`
 *     const response = desired
 *       ? await http.put<{ subscribed: boolean }>(path)
 *       : await http.delete<{ subscribed: boolean }>(path)
 *     return response.data.subscribed
 *   },
 * }))
 * </script>
 *
 * <template>
 *   <button type="button" :aria-pressed="subscription.value.value"
 *     :aria-busy="subscription.pending.value" @click="subscription.toggle">
 *     {{ subscription.value.value
 *       ? t('thread.unsubscribe', undefined, { defaultValue: 'Unsubscribe' })
 *       : t('thread.subscribe', undefined, { defaultValue: 'Subscribe' }) }}
 *   </button>
 * </template>
 * ```
 */
export function useOptimisticToggle(
  options: MaybeRefOrGetter<UseOptimisticToggleOptions>,
): UseOptimisticToggleResult {
  // `commit` gets only the desired boolean, never the previous value or a confirm callback.
  const { value, pending, error, update } = useOptimisticValue<boolean>(() => {
    const current = toValue(options)
    return { ...current, commit: (desired: boolean) => current.commit(desired) }
  })
  const toggle = (): void => update((current) => !current)
  return { value, pending, error, toggle }
}
