// @vitest-environment jsdom
/**
 * The shared router conformance cases over the bond's real construction path:
 * `useMoleculeRouter` — the public factory a Next app mounts — driving the stand-in
 * Next.js App Router client (`./next-client.ts`) that behaves the way Next 15/16's
 * client does in a browser, over jsdom's real `window.history`. The native side is the
 * stand-in client: a "link" is its `link(path)`, the back button is the real
 * `window.history.back()`, and the native path is read from the document URL.
 */
import { act, createElement, type ReactNode, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { runRouterConformance } from '@molecule/app-framework-conformance/routing'
import type { Router } from '@molecule/app-routing'

import { useMoleculeRouter } from '../hooks.js'
import { createNextClient, useNextClient } from './next-client.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

/** The routes the native stand-in declares: `/users/:id`, the two pages, and a catch-all. */
const routes = [{ path: '/users/:id' }, { path: '/one' }, { path: '/two' }, { path: '*' }]

/** The page each routed path renders, as the app's page files would. */
const pages: Record<string, string> = { '/one': 'page one', '/two': 'page two' }

/** The router the rendered bridge bonded; set inside the `act` that mounts it. */
let bridged: Router | undefined

/**
 * The app's bridge component: one `useMoleculeRouter` per mount, fed with the stand-in's
 * hook values.
 *
 * @returns The element (none — it only bonds).
 */
function Bridge(): ReactNode {
  const { navigation, pathname, searchParams, params } = useNextClient()
  const router = useMoleculeRouter({ navigation, pathname, searchParams, params, routes: [] })
  useEffect(() => {
    bridged = router
  }, [router])
  return pages[pathname] ? createElement('p', null, pages[pathname]) : null
}

runRouterConformance('next', (initialPath, { base, container }) => {
  // A Next build compiles `next.config`'s basePath in as this define; the app passes none.
  process.env.__NEXT_ROUTER_BASEPATH = base
  const client = createNextClient({ initialPath, routes, basePath: base })
  const root: Root = createRoot(container)
  act(() => {
    // `createElement`, not JSX: this package's tsconfig sets no `jsx` option, so the
    // test type-checks as plain `.ts`.
    root.render(createElement(client.Provider, null, createElement(Bridge)))
  })
  if (!bridged) throw new Error('the bridge did not bond a router')

  return {
    router: bridged,
    nativePush: (path) => {
      act(() => {
        client.link(path)
      })
    },
    nativeBack: () => {
      act(() => {
        window.history.back()
      })
    },
    nativePath: () => client.path(),
    nativeHref: (path) => client.href(path),
    settle: async () => {
      await act(async () => {})
    },
    teardown: () => {
      act(() => {
        root.unmount()
      })
      client.destroy()
      bridged = undefined
      delete process.env.__NEXT_ROUTER_BASEPATH
      // Hand jsdom's window back the way this client found it.
      window.history.replaceState(null, '', '/')
    },
  }
})
