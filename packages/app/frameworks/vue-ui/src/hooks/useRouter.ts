/**
 * Internal routing composables mirroring the react-router pieces the React UI
 * components use (`useLocation`, `Navigate`, links), backed by the injected
 * `@molecule/app-routing` router the same way React's adapter installs it.
 *
 * @module
 */

import { inject, onMounted, onUnmounted, type Ref, ref } from 'vue'

import type { RouteLocation, Router } from '@molecule/app-routing'
import { RouterKey } from '@molecule/app-vue'

/**
 * Accesses the router from injection.
 *
 * @returns The router.
 * @throws {Error} When no router was installed.
 */
export function useMoleculeRouter(): Router {
  const router = inject(RouterKey)
  if (!router) {
    throw new Error('useLocation must be used within a router provider')
  }
  return router
}

/**
 * The current route location, kept current through the router's subscription.
 *
 * @returns A ref holding the current `RouteLocation`.
 */
export function useLocation(): Ref<RouteLocation> {
  const router = useMoleculeRouter()
  const location = ref<RouteLocation>({ ...router.getLocation() })
  let unsubscribe: (() => void) | null = null
  onMounted(() => {
    unsubscribe = router.subscribe(() => {
      location.value = { ...router.getLocation() }
    })
  })
  onUnmounted(() => {
    unsubscribe?.()
  })
  return location
}

/**
 * Navigates imperatively (React's `<Navigate replace state>` equivalent).
 *
 * @param to - The target path (may carry a query string).
 * @param options - `replace` and `state`, like `NavigateOptions`.
 */
export function navigate(to: string, options?: { replace?: boolean; state?: unknown }): void {
  useMoleculeRouter().navigate(to, options)
}
