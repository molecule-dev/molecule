/**
 * Vue composable for Capacitor app initialization.
 *
 * @module
 */

import {
  computed,
  type ComputedRef,
  getCurrentInstance,
  onMounted,
  onScopeDispose,
  shallowRef,
} from 'vue'

import type { CapacitorApp, CapacitorAppOptions, CapacitorAppState } from '@molecule/app-platform'
import { createCapacitorApp } from '@molecule/app-platform'

/**
 * Return type for the useCapacitorApp composable.
 */
export interface UseCapacitorAppReturn {
  ready: ComputedRef<boolean>
  deviceReady: ComputedRef<boolean>
  pushReady: ComputedRef<boolean>
  error: ComputedRef<Error | null>
  initialize: () => Promise<void>
}

/**
 * Composable for Capacitor app initialization.
 *
 * Wraps `createCapacitorApp` from `@molecule/app-platform` with Vue reactivity.
 * Auto-initializes on mount (inside a component) or eagerly (inside an effect scope).
 * Cleans up on scope dispose.
 *
 * @param options - Capacitor app configuration options
 *
 * @example
 * ```vue
 * <script setup>
 * import { useCapacitorApp } from '`@molecule/app-vue`'
 *
 * const { ready, deviceReady, pushReady, error } = useCapacitorApp({
 *   pushNotifications: true,
 *   deepLinks: true,
 *   onDeepLink: (url) => console.log('Deep link:', url),
 *   onReady: () => console.log('App ready!'),
 * })
 * </script>
 *
 * <template>
 *   <div v-if="ready">App is ready!</div>
 *   <div v-else-if="error">Error: {{ error.message }}</div>
 *   <div v-else>Initializing...</div>
 * </template>
 * ```
 * @returns Reactive Capacitor app state including readiness flags, error, and an initialize method.
 */
export function useCapacitorApp(options?: CapacitorAppOptions): UseCapacitorAppReturn {
  const app: CapacitorApp = createCapacitorApp(options)

  const state = shallowRef<CapacitorAppState>(app.getState())

  const unsubscribe = app.subscribe((newState) => {
    state.value = newState
  })

  const doInitialize = (): void => {
    app.initialize().catch(() => {
      // Error is captured in state.error via the subscribe callback
    })
  }

  // Auto-initialize: use onMounted inside a component, otherwise initialize eagerly
  if (getCurrentInstance()) {
    onMounted(doInitialize)
  } else {
    doInitialize()
  }

  onScopeDispose(() => {
    unsubscribe()
    app.destroy()
  })

  const ready = computed(() => state.value.ready)
  const deviceReady = computed(() => state.value.deviceReady)
  const pushReady = computed(() => state.value.pushReady)
  const error = computed(() => state.value.error)

  const initialize = (): Promise<void> => app.initialize()

  return {
    ready,
    deviceReady,
    pushReady,
    error,
    initialize,
  }
}
