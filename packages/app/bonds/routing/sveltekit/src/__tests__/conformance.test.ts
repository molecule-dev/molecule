/**
 * The shared router conformance cases over SvelteKit's real client router: the test app
 * (`./kit-app`) built by kit's own Vite plugin, started with kit's `start` in jsdom, its root
 * layout building the router through `createSvelteKitNavigation` and `createSvelteKitRouter`
 * as an app's does. Each vitest project builds kit with one configuration (the root, the
 * base path `/app`, hash routing), so each runs the cases under its own base.
 *
 * The native side is kit itself: a native link is a click on an anchor kit's own link
 * handler follows, the back button is `window.history.back()` (kit follows popstate), the
 * native path is the document URL read the way kit reads it, and a native href is kit's
 * `resolve(path)`.
 */
import {
  type RouterHarness,
  runRouterConformance,
} from '@molecule/app-framework-conformance/routing'

import {
  awaitNavigation,
  clickLink,
  documentUrl,
  inAppPath,
  kitBase,
  kitHash,
  startKit,
} from './start-kit.js'

/** Lets a task run. */
const macrotask = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

runRouterConformance(
  kitHash ? 'sveltekit (hash routing)' : 'sveltekit',
  async (initialPath, { container }): Promise<RouterHarness> => {
    const kit = await startKit(documentUrl(initialPath), container)
    return {
      router: kit.app.router,
      // A click on an in-app anchor, which kit's document-level link handler follows.
      nativePush: (path) => clickLink(kit.app, container, path),
      nativeBack: () => awaitNavigation(kit.app, () => window.history.back()),
      nativePath: inAppPath,
      nativeHref: (path) => kit.app.resolve(path),
      // Until the router's `goto`s have finished and kit has no navigation in flight.
      settle: async () => {
        for (let i = 0; i < 500 && !kit.app.idle(); i++) await macrotask()
      },
      teardown: () => kit.stop(),
    }
  },
  { bases: [kitBase] },
)
