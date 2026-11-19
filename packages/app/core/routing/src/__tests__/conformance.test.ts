// @vitest-environment jsdom
/**
 * The router conformance cases every routing bond runs, against this package's own
 * routers. Each owns its history, so a "native" link here is the router's own
 * `navigate`; the browser router's back button is the real `window.history.back()`.
 * With no framework to render pages, each harness writes the page of the current route
 * into the container when the router tells its subscribers, as a framework's router view
 * would.
 */
import {
  type RouterHarness,
  runRouterConformance,
} from '@molecule/app-framework-conformance/routing'

import { createBrowserRouter, createMemoryRouter } from '../router.js'
import type { Router } from '../types.js'

const pathOf = (router: Router): string => {
  const { pathname, search, hash } = router.getLocation()
  return pathname + search + hash
}

/**
 * Renders the page of the router's current route into `container` now and on every change.
 *
 * @param router - The router.
 * @param container - Where the page goes.
 * @returns Stops rendering.
 */
const renderPages = (router: Router, container: HTMLElement): (() => void) => {
  const render = (): void => {
    const page = { '/one': 'page one', '/two': 'page two' }[router.getLocation().pathname]
    container.textContent = page ?? ''
  }
  render()
  return router.subscribe(render)
}

/**
 * A harness over one of this package's routers.
 *
 * @param router - The router.
 * @param container - Where its pages render.
 * @param native - How its native side is read and moved.
 * @returns The harness.
 */
const harnessOf = (
  router: Router,
  container: HTMLElement,
  native: Pick<RouterHarness, 'nativeBack' | 'nativePath' | 'nativeHref'>,
): RouterHarness => {
  const stop = renderPages(router, container)
  return {
    router,
    nativePush: (path) => router.navigate(path),
    ...native,
    teardown: () => {
      stop()
      router.destroy()
    },
  }
}

runRouterConformance('memory', (initialPath, { base, container }) => {
  const router = createMemoryRouter({ initialEntries: ['/before', initialPath], basePath: base })
  return harnessOf(router, container, {
    nativeBack: () => router.back(),
    nativePath: () => pathOf(router),
    nativeHref: (path) => base + path,
  })
})

runRouterConformance('browser (history mode)', (initialPath, { base, container }) => {
  window.history.replaceState(null, '', base + initialPath)
  const router = createBrowserRouter({ basePath: base })
  return harnessOf(router, container, {
    nativeBack: () => window.history.back(),
    nativePath: () =>
      window.location.pathname.slice(base.length) + window.location.search + window.location.hash,
    // The URL the History API is handed for the path.
    nativeHref: (path) => base + path,
  })
})

runRouterConformance('browser (hash mode)', (initialPath, { base, container }) => {
  window.history.replaceState(null, '', `${base}/#${initialPath}`)
  const router = createBrowserRouter({ mode: 'hash' })
  return harnessOf(router, container, {
    nativeBack: () => window.history.back(),
    nativePath: () => window.location.hash.slice(1),
    nativeHref: (path) => `#${path}`,
  })
})
