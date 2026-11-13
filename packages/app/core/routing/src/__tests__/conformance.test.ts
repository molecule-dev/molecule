// @vitest-environment jsdom
/**
 * The router conformance cases every routing bond runs, against this package's own
 * routers. Each owns its history, so a "native" link here is the router's own
 * `navigate`; the browser router's back button is the real `window.history.back()`.
 */
import { runRouterConformance } from '@molecule/app-framework-conformance/routing'

import { createBrowserRouter, createMemoryRouter } from '../router.js'
import type { Router } from '../types.js'

const pathOf = (router: Router): string => {
  const { pathname, search, hash } = router.getLocation()
  return pathname + search + hash
}

runRouterConformance('memory', (initialPath) => {
  const router = createMemoryRouter({ initialEntries: ['/before', initialPath] })
  return {
    router,
    nativePush: (path) => router.navigate(path),
    nativeBack: () => router.back(),
    nativePath: () => pathOf(router),
    teardown: () => router.destroy(),
  }
})

runRouterConformance('browser (history mode)', (initialPath) => {
  window.history.replaceState(null, '', initialPath)
  const router = createBrowserRouter()
  return {
    router,
    nativePush: (path) => router.navigate(path),
    nativeBack: () => window.history.back(),
    nativePath: () => window.location.pathname + window.location.search + window.location.hash,
    teardown: () => router.destroy(),
  }
})

runRouterConformance('browser (hash mode, under a base path)', (initialPath) => {
  window.history.replaceState(null, '', `/app#${initialPath}`)
  const router = createBrowserRouter({ mode: 'hash', basePath: '/app' })
  return {
    router,
    nativePush: (path) => router.navigate(path),
    nativeBack: () => window.history.back(),
    nativePath: () => window.location.hash.slice(1),
    teardown: () => router.destroy(),
  }
})
