/**
 * `MoleculeRouterProvider`: bonds the molecule `Router` and provides it to descendants.
 *
 * @module
 */

import { defineComponent, type PropType, provide, ref, type VNode, watch } from 'vue'

import { useMoleculeRouterProvider } from './composables.js'
import { MOLECULE_ROUTER_KEY } from './context.js'
import type { RouteDefinition, Router } from './types.js'

/**
 * Props for {@link MoleculeRouterProvider}.
 */
export interface MoleculeRouterProviderProps {
  /**
   * Optional route definitions for molecule named routes. Pass a stable array; a later,
   * different array registers onto the same router.
   */
  routes?: RouteDefinition[]

  /**
   * Optional callback invoked ONCE with the bonded router, after it is bonded, so a guard
   * or subscription can be registered.
   */
  onRouterReady?: (router: Router) => void
}

/**
 * Provider component that builds ONE molecule `Router` over the current Vue Router and
 * bonds it via `@molecule/app-routing`'s `setRouter`, so `navigate()` / `getRouter()` from
 * core drive the REAL Vue Router. It also provides that exact router under
 * {@link MOLECULE_ROUTER_KEY}, so every descendant's `useMoleculeRouter()` returns it.
 *
 * Bonding happens when the provider's setup runs, so core navigation reaches the native
 * router for the provider's whole mounted life. `onRouterReady` fires once per router: a
 * navigation or a re-render does not fire it again, and neither does changing only the
 * callback.
 *
 * @example
 * ```vue
 * <!-- App.vue -->
 * <script setup lang="ts">
 * import { RouterView } from 'vue-router'
 * import { MoleculeRouterProvider } from '@molecule/app-routing-vue-router'
 * </script>
 *
 * <template>
 *   <MoleculeRouterProvider>
 *     <RouterView />
 *   </MoleculeRouterProvider>
 * </template>
 * ```
 */
export const MoleculeRouterProvider = defineComponent({
  name: 'MoleculeRouterProvider',
  props: {
    routes: { type: Array as PropType<RouteDefinition[]>, default: undefined },
    onRouterReady: { type: Function as PropType<(router: Router) => void>, default: undefined },
  },
  setup(props, { slots }) {
    // Builds the adapter over the injected Vue Router and bonds it (setRouter) at once.
    const router = useMoleculeRouterProvider(props.routes)

    // Descendants read this exact router through useMoleculeRouter.
    provide(MOLECULE_ROUTER_KEY, router)

    // Once per router, with the callback of the run that bonded it: a later callback
    // identity is not a new router.
    const readyRouter = ref<Router | null>(null)
    watch(
      router,
      (current) => {
        if (readyRouter.value === current) return
        readyRouter.value = current
        props.onRouterReady?.(current)
      },
      { immediate: true },
    )

    return (): VNode[] | null => slots.default?.() ?? null
  },
})
