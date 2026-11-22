// @vitest-environment jsdom
/**
 * The shared router conformance cases over the bond's real construction path:
 * `useMoleculeRouter` — the public factory a Next app mounts — driving the stand-in
 * Next.js App Router client (`./next-client.ts`) that behaves the way Next 15/16's
 * client does in a browser, over jsdom's real `window.history`. The native side is the
 * stand-in client: a "link" is its `link(path)`, the back button is the real
 * `window.history.back()`, and the native path is read from the document URL.
 */
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { runRouterConformance } from '@molecule/app-framework-conformance/routing'
import { useLocation, useParams } from '@molecule/app-react'
import type { Router } from '@molecule/app-routing'

import { MoleculeRouterProvider } from '../MoleculeRouterProvider.js'
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
/**
 * Stays mounted beside the page and shows the pathname `@molecule/app-react`'s `useLocation`
 * reads.
 *
 * @returns The location reader.
 */
function LocationReader(): ReactNode {
  return createElement('output', { 'data-location': '' }, useLocation().pathname)
}

/**
 * The page of the current route, as the App Router renders it: `/users/[id]` shows the id
 * `@molecule/app-react`'s `useParams` reads.
 *
 * @returns The page.
 */
function Page(): ReactNode {
  const { pathname } = useNextClient()
  const { id } = useParams()
  if (pathname.startsWith('/users/')) return createElement('p', null, `user ${id}`)
  return pages[pathname] ? createElement('p', null, pages[pathname]) : null
}

function Bridge(): ReactNode {
  const { navigation, pathname, searchParams, params } = useNextClient()
  return createElement(MoleculeRouterProvider, {
    navigation,
    pathname,
    searchParams,
    params,
    routes: [],
    onRouterReady: (router: Router) => {
      bridged = router
    },
    children: [
      createElement(LocationReader, { key: 'location' }),
      createElement(Page, { key: 'page' }),
    ],
  })
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
