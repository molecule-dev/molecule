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
 * `resolve(path)`. The `ListRouteNav` DOM cases mount the bond's real component through one
 * probe route and compare it with react-router's recorded goldens.
 */
import {
  type ListRouteNavMount,
  type RouterHarness,
  runListRouteNavConformance,
  runRouterConformance,
} from '@molecule/app-framework-conformance/routing'

import { showLocationReader } from './kit-app/src/lib/location-reader.js'
import { setNavCase } from './kit-app/src/lib/nav-case.js'
import {
  awaitNavigation,
  clickLink,
  documentUrl,
  inAppPath,
  kitBase,
  kitHash,
  settle,
  startKit,
} from './start-kit.js'

/** Lets a task run. */
const macrotask = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

runRouterConformance(
  kitHash ? 'sveltekit (hash routing)' : 'sveltekit',
  async (initialPath, { container }): Promise<RouterHarness> => {
    showLocationReader(true)
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

/** The mount path the `ListRouteNav` probe route serves every case path under. */
const NAV_PREFIX = '/probe/nav'

/**
 * Mounts this bond's `ListRouteNav` over kit's real client router on the app's real history:
 * the probe route renders it with the case's props and nothing else. React's mount declares
 * the case's routes on a memory router; kit's routes are files, so every case path maps onto
 * one catch-all probe route (`/probe/nav/[...rest]`) and the recorded path is mapped back.
 *
 * @param container - Where the app renders.
 * @param initialPath - The case's starting path.
 * @param props - The case's props, in react-router's spelling.
 * @returns The mounted nav, driving kit's client router itself.
 */
const mountListRouteNav: ListRouteNavMount = async (container, initialPath, props) => {
  showLocationReader(false)
  setNavCase(props)
  const kit = await startKit(documentUrl(NAV_PREFIX + initialPath), container)
  /**
   * kit's app shell renders a live region (`#svelte-announcer`, `@sveltejs/kit`
   * `src/runtime/components/root.svelte`) beside the page it renders. It belongs to kit,
   * not to the component under comparison (React's `MemoryRouter` mount has no such
   * element), so it moves out of the compared container as kit re-renders it.
   */
  /** The live region taken out of the container, removed again when the case ends. */
  let detachedAnnouncer: Element | null = null
  const detachAnnouncer = (): void => {
    const announcer = container.querySelector('#svelte-announcer')
    if (!announcer) return
    detachedAnnouncer = announcer
    document.body.append(announcer)
  } /** Waits until kit has no navigation in flight, then leaves only the page in the container. */
  const settleApp = async (): Promise<void> => {
    await settle(kit.app)
    detachAnnouncer()
  }
  await settleApp()
  /** The in-app path the case's own router would report. */
  const casePath = (): string => {
    const path = inAppPath()
    return path.startsWith(NAV_PREFIX) ? path.slice(NAV_PREFIX.length) || '/' : path
  }
  const perform = async (action: () => unknown): Promise<void> => {
    let committed = (): void => {}
    const navigated = new Promise<void>((resolve) => {
      committed = resolve
    })
    const stop = kit.app.navigation.onNavigate(() => committed())
    try {
      await action()
      await Promise.race([navigated, macrotask()])
      await settleApp()
    } finally {
      stop()
    }
  }
  return {
    nativePath: casePath,
    nativeBack: () => perform(() => window.history.back()),
    nativeForward: () => perform(() => window.history.forward()),
    perform,
    unmount: async () => {
      kit.stop()
      detachedAnnouncer?.remove()
    },
  }
}

// The recorded goldens are react-router's own URLs: the app's root, with no base path and
// no `#` prefix. kit's `createHref` prefixes the base (or `#`) it is built with, as its own
// links do, so the DOM cases run under the root configuration where a kit href and a
// react-router href are the same string; the base and hash projects still run the router
// cases above, which compare in-app paths.
if (kitBase === '' && !kitHash) runListRouteNavConformance('sveltekit', mountListRouteNav)
