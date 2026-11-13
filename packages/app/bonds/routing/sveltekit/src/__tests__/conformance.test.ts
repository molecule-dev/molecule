// @vitest-environment jsdom
/**
 * The shared router conformance cases over the bond's real construction path:
 * `createSvelteKitRouter` — the public factory — driving a stand-in SvelteKit client
 * (`./kit-client.ts`) that behaves the way `@sveltejs/kit` 2.63's client router does in
 * a browser, over jsdom's real `window.history`. The native side is the stand-in client:
 * a "link" is its `link(path)`, the back button is the real `window.history.back()`, and
 * the native path is read from the client's own `page` url.
 */
import { runRouterConformance } from '@molecule/app-framework-conformance/routing'

import { createSvelteKitNavigation, createSvelteKitRouter } from '../provider.js'
import type { KitClientRoute } from './kit-client.js'
import { createKitClient } from './kit-client.js'

/** The routes the native stand-in declares: `/users/:id` plus a catch-all, so any path is routable. */
const routes: KitClientRoute[] = [{ path: '/users/:id' }, { path: '*' }]

runRouterConformance('sveltekit', (initialPath) => {
  const client = createKitClient({ initialPath, routes })
  const router = createSvelteKitRouter(
    createSvelteKitNavigation({
      goto: client.goto,
      replaceState: client.replaceState,
      page: client.page,
      afterNavigate: client.afterNavigate,
    }),
  )
  return {
    router,
    nativePush: (path) => client.link(path),
    nativeBack: () => {
      window.history.back()
    },
    nativePath: () => client.path(),
    teardown: () => {
      router.destroy()
      client.destroy()
    },
  }
})
