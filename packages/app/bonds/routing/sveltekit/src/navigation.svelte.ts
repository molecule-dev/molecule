/**
 * `createSvelteKitNavigation`: the {@link SvelteKitNavigation} an app builds from kit's own
 * exports in its root layout. It tells the router about each change of kit's `page` from a
 * Svelte pre-effect, so this module is a `.svelte.ts` module (runes compile only there).
 *
 * @module
 */

import { untrack } from 'svelte'

import type {
  KitNavigateListener,
  KitPageChange,
  KitPageState,
  SvelteKitExports,
  SvelteKitNavigation,
} from './types.js'

/**
 * Builds the {@link SvelteKitNavigation} that `createSvelteKitRouter` takes, from kit's own
 * exports. Call it during the root layout's component initialisation (Svelte creates the
 * effect it uses only then, and throws `effect_orphan` anywhere else).
 *
 * It watches kit's `page` once, with a pre-effect, and passes each move to a new URL or a new
 * `page.state` to every listener the router adds. Svelte runs a component's pre-effects
 * before the components below it update, so the router's subscribers (the binding's stores,
 * a layout's active item) read the new location in the same update that renders the new
 * page: no component shows the previous location beside it. A navigation kit cancelled never
 * changes `page`, so it is never heard, and an invalidation that keeps the URL and the state
 * is not heard either.
 *
 * @param kit - Kit's `goto`, `page`, `navigating` and `resolve('/')`.
 * @returns The navigation pieces for `createSvelteKitRouter`.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { goto } from '$app/navigation'
 *   import { resolve } from '$app/paths'
 *   import { navigating, page } from '$app/state'
 *   import { createSvelteKitNavigation, createSvelteKitRouter } from '@molecule/app-routing-sveltekit'
 *
 *   const router = createSvelteKitRouter(
 *     createSvelteKitNavigation({ goto, page, navigating, rootHref: resolve('/') }),
 *   )
 * </script>
 * ```
 */
export const createSvelteKitNavigation = (kit: SvelteKitExports): SvelteKitNavigation => {
  // Each subscription is its own entry, and the list is replaced, never changed in place, so a
  // listener that subscribes or unsubscribes while being told changes only the next round. It
  // is plain state on purpose: no effect reads it.
  let subscriptions: readonly { listener: KitNavigateListener }[] = []
  let seen: { href: string; state: KitPageState } | undefined

  $effect.pre(() => {
    const { pathname, search, hash } = kit.page.url
    const now = { href: pathname + search + hash, state: kit.page.state }
    const previous = seen
    seen = now
    // The first run is the page kit started on, not a navigation.
    if (!previous || (previous.href === now.href && previous.state === now.state)) return
    // Listeners read and write other state; only kit's page decides when this runs again.
    untrack(() => {
      const change: KitPageChange = { type: kit.navigating.type }
      for (const { listener } of subscriptions) listener(change)
    })
  })

  return {
    goto: kit.goto,
    page: kit.page,
    rootHref: kit.rootHref,
    onNavigate(listener) {
      const subscription = { listener }
      subscriptions = [...subscriptions, subscription]
      return () => {
        subscriptions = subscriptions.filter((entry) => entry !== subscription)
      }
    },
  }
}
