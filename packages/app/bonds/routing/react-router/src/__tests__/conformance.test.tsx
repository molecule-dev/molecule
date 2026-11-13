// @vitest-environment jsdom
/**
 * The router conformance cases every routing bond runs, over this package's real
 * React Router: once under `MemoryRouter`, and once under `BrowserRouter` over jsdom's
 * `window.history`. The molecule router is the one `MoleculeRouterProvider` builds and
 * hands to `onRouterReady`; the native side is React Router's own hooks and history.
 */
import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { BrowserRouter, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'

import {
  type RouterHarness,
  type RouterHarnessFactory,
  runRouterConformance,
} from '@molecule/app-framework-conformance/routing'
import type { Router } from '@molecule/app-routing'

import { MoleculeRouterProvider } from '../hooks.js'

// React 19 reports updates outside `act()` while a test environment is declared; the
// harness drives every navigation through `act()` or `settle()`.
const actEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
actEnvironment.IS_REACT_ACT_ENVIRONMENT = true

/**
 * What the `Capture` child hands back: React Router's own `useNavigate()`/`useLocation()`
 * of the latest render, so the harness can drive and read the NATIVE router.
 */
interface NativeCapture {
  /**
   * React Router's navigate function.
   */
  navigate: ReturnType<typeof useNavigate>
  /**
   * React Router's current location.
   */
  location: ReturnType<typeof useLocation>
}

/**
 * Records React Router's own navigate and location on every render.
 *
 * @param props - The shared slot the harness reads the capture from.
 * @returns Nothing; the component renders nothing.
 */
function Capture(props: { capture: { current: NativeCapture | undefined } }): null {
  props.capture.current = { navigate: useNavigate(), location: useLocation() }
  return null
}

/**
 * How one conformance run mounts its native router and drives it from the outside.
 */
interface NativeRouterSetup {
  /**
   * Wraps the app in the native router, starting at `initialPath`.
   *
   * @param children - The provider and the capture child.
   * @param initialPath - Where the native router starts.
   * @returns The router element to render.
   */
  element: (children: ReactElement, initialPath: string) => ReactElement

  /**
   * Moves the native router back one entry, as the browser's back button does.
   *
   * @param capture - The native navigate/location of the latest render.
   */
  nativeBack: (capture: NativeCapture) => void

  /**
   * Points the native router at `initialPath` before the render (jsdom's URL).
   *
   * @param initialPath - Where the native router starts.
   */
  prepare?: (initialPath: string) => void

  /**
   * Restores the native state the run changed, at teardown.
   */
  restore?: () => void
}

/**
 * Builds a harness whose native router is a real React Router router rendered with
 * `createRoot`: the molecule router is the one `MoleculeRouterProvider` bonds and hands
 * to `onRouterReady`, native navigations go through React Router's own `navigate`, and
 * `settle` awaits an `act` flush.
 *
 * @param native - How the run mounts and drives its native router.
 * @returns The harness factory for `runRouterConformance`.
 */
const createHarnessOver =
  (native: NativeRouterSetup): RouterHarnessFactory =>
  (initialPath) => {
    native.prepare?.(initialPath)

    let bonded: Router | undefined
    let root: Root | undefined
    const capture: { current: NativeCapture | undefined } = { current: undefined }
    const container = document.createElement('div')
    document.body.appendChild(container)

    const app = (
      <MoleculeRouterProvider
        onRouterReady={(router) => {
          bonded = router
        }}
      >
        <Capture capture={capture} />
        <Routes>
          <Route path="/users/:id" element={null} />
          <Route path="*" element={null} />
        </Routes>
      </MoleculeRouterProvider>
    )

    act(() => {
      root = createRoot(container)
      root.render(native.element(app, initialPath))
    })

    const currentCapture = (): NativeCapture => {
      if (!capture.current) throw new Error('React Router never rendered the capture child')
      return capture.current
    }

    const harness: RouterHarness = {
      get router(): Router {
        if (!bonded) throw new Error('the molecule router never became ready')
        return bonded
      },
      nativePush: (path) => {
        act(() => {
          currentCapture().navigate(path)
        })
      },
      nativeBack: () => native.nativeBack(currentCapture()),
      nativePath: () => {
        const { pathname, search, hash } = currentCapture().location
        return pathname + search + hash
      },
      settle: () => act(async () => {}),
      teardown: () => {
        act(() => {
          root?.unmount()
        })
        container.remove()
        native.restore?.()
      },
    }
    return harness
  }

runRouterConformance(
  'react-router (MemoryRouter)',
  createHarnessOver({
    element: (children, initialPath) => (
      <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
    ),
    nativeBack: (capture) => {
      act(() => {
        capture.navigate(-1)
      })
    },
  }),
)

runRouterConformance(
  'react-router (BrowserRouter over jsdom history)',
  createHarnessOver({
    element: (children) => <BrowserRouter>{children}</BrowserRouter>,
    prepare: (initialPath) => {
      window.history.replaceState(null, '', initialPath)
    },
    nativeBack: () => {
      window.history.back()
    },
    restore: () => {
      window.history.replaceState(null, '', '/')
    },
  }),
)
