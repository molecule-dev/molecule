/**
 * `useListRoute` over Vue Router: the list rules come from `@molecule/app-routing`'s
 * `resolveListRoute`, which every framework's `useListRoute` shares.
 *
 * @module
 */

import { computed, type ComputedRef, type MaybeRefOrGetter, onMounted, toValue, watch } from 'vue'

import { listRouteRedirect, resolveListRoute } from '@molecule/app-routing'

import { useMoleculeRouter } from './composables.js'
import type { ListRouteOptions, ListRouteResult } from './list-types.js'

/**
 * Own URL-backed pagination, filters and selected views without mirrored state or navigation
 * effects. Works inside any Vue Router router — a plain `createRouter` app with no molecule
 * provider, or one wrapped in `MoleculeRouterProvider`. Ordinary links, direct visits, and
 * Back/Forward all read the same URL. Page links retain path parameters and unrelated
 * queries; changing filters or views resets the page atomically. Protected views wait for
 * auth and redirect only a confirmed signed-out session, with `state.returnTo` set.
 *
 * The options may be reactive (a ref, a reactive object or a getter), so an auth status
 * going from `loading` to `unauthenticated` performs the sign-in redirect on the same
 * component, the way React re-renders `useListRoute` with new options.
 *
 * @param options - App-owned filter sources, view paths, pagination and optional auth readiness.
 * @returns A computed ref of the list state plus link builders and navigation actions. Gate
 * data queries with `canLoad`.
 * @throws {Error} When `pageSize` is not a positive safe integer, a protected selection has no
 * `auth`, or a link change names an unknown selection, filter or page.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { computed } from 'vue'
 * import { useListRoute } from '@molecule/app-routing-vue-router'
 *
 * const list = useListRoute({ pageSize: 10, filters: { tag: {} } })
 * const nextPageHref = computed(() => list.value.href({ page: list.value.page + 1 }))
 * </script>
 * ```
 */
export function useListRoute<Filter extends string = string, Selection extends string = string>(
  options: MaybeRefOrGetter<ListRouteOptions<Filter, Selection>> = {},
): ComputedRef<ListRouteResult<Filter, Selection>> {
  const router = useMoleculeRouter()
  // Vue Router's `currentRoute` is the reactive source: reading the molecule router's
  // location and params inside these computeds follows every navigation it commits.
  const location = computed(() => router.value.getLocation())
  const params = computed(() => router.value.getParams())
  const list = computed(() =>
    resolveListRoute<Filter, Selection>(
      { location: location.value, routeParams: params.value },
      toValue(options),
      (path, navigateOptions) => router.value.navigate(path, navigateOptions),
    ),
  )
  // Resolve once in setup, like React's first render: a bad pageSize or a protected
  // selection without `auth` throws from the composable call itself, not at the first
  // read (which the renderer does after mount, where the throw would be unhandled).
  void list.value
  const redirect = computed(() => listRouteRedirect(list.value, location.value))
  const performRedirect = (next: ReturnType<typeof listRouteRedirect>): void => {
    if (!next) return
    void router.value.navigate(next.to, next.options)
  }
  // React's redirect effect runs after every render the redirect target changed in; the
  // watcher covers those changes, and the mounted hook covers a redirect already due at
  // mount.
  watch(redirect, performRedirect)
  onMounted(() => performRedirect(redirect.value))
  return list
}
