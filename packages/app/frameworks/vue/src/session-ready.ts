/**
 * Hold rendering until the auth client has decided the session.
 *
 * @module
 */

import { defineComponent, renderSlot, type VNode } from 'vue'

import { useAuth } from './composables/useAuth.js'

/**
 * Renders its default slot once `useAuth().status` has left `'loading'` — the session is
 * decided (signed in, signed out, or `'unavailable'`) — and its `fallback` slot until then.
 * It never redirects. An unavailable session is unconfirmed and may still have a null user.
 *
 * After a full page load a returning visitor's session is restored by one request. Until it
 * answers, `useAuth().user.value` is `null` everywhere, so a public page that renders a
 * signed-in action at once lets that action run against "signed out": a Follow button whose
 * handler starts with `if (!user) return` ignores the click, one that redirects to `/login`
 * signs the visitor out of the flow. Wrapping `<RouterView />` in `App.vue` makes every page's
 * first render read the restored user when restoration succeeds.
 *
 * A visitor with no session to restore settles in microtasks without a request. Must render
 * inside an app that installed `moleculePlugin` with `auth` (like every composable consumer, it
 * throws when its service was not provided). A client that nobody initialized starts its
 * restore on this first read. The bundled JWT client bounds each auth request (default
 * 10 seconds), then settles as `'unavailable'` on timeout. Custom clients must also settle
 * their initial session status.
 *
 * Route-level redirects for signed-in-only pages stay with the app's auth route guard
 * (`AuthGuard` in the scaffold).
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { SessionReady } from '@molecule/app-vue'
 * </script>
 *
 * <template>
 *   <SessionReady>
 *     <template #fallback>
 *       <p>Restoring your session…</p>
 *     </template>
 *     <RouterView />
 *   </SessionReady>
 * </template>
 * ```
 */
export const SessionReady = defineComponent({
  name: 'SessionReady',
  setup(_, { slots }): () => VNode {
    const { status } = useAuth()
    return () =>
      status.value === 'loading' ? renderSlot(slots, 'fallback') : renderSlot(slots, 'default')
  },
})
