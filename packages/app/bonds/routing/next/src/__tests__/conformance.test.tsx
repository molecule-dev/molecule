// @vitest-environment jsdom
/**
 * The shared router conformance cases over the bond's real construction path:
 * `useMoleculeRouter` — the public factory a Next app mounts — driving the stand-in
 * Next.js App Router client (`./next-client.tsx`) that behaves the way Next 15/16's
 * client does in a browser, over jsdom's real `window.history`. The native side is the
 * stand-in client: a "link" is its `link(path)`, the back button is the real
 * `window.history.back()`, and the native path is read from the document URL.
 */
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { runRouterConformance } from '@molecule/app-framework-conformance/routing'
import type { Router } from '@molecule/app-routing'

import { useMoleculeRouter } from '../hooks.js'
import { createNextClient, useNextClient } from './next-client.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

/** The routes the native stand-in declares: `/users/:id` plus a catch-all, so any path is routable. */
const routes = [{ path: '/users/:id' }, { path: '*' }]

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
  bridged = useMoleculeRouter({ navigation, pathname, searchParams, params, routes: [] })
  return null
}

runRouterConformance('next', (initialPath) => {
  const client = createNextClient({ initialPath, routes })
  const host = document.createElement('div')
  document.body.append(host)
  const root: Root = createRoot(host)
  act(() => {
    root.render(
      <client.Provider>
        <Bridge />
      </client.Provider>,
    )
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
    settle: async () => {
      await act(async () => {})
    },
    teardown: () => {
      act(() => {
        root.unmount()
      })
      host.remove()
      client.destroy()
      bridged = undefined
      // Hand jsdom's window back the way this client found it.
      window.history.replaceState(null, '', '/')
    },
  }
})
