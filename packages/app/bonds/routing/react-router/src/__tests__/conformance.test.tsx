// @vitest-environment jsdom
/**
 * The router conformance cases every routing bond runs, over this package's real
 * React Router: once under `MemoryRouter`, and once under `BrowserRouter` over jsdom's
 * `window.history`. The molecule router is the one `MoleculeRouterProvider` builds and
 * hands to `onRouterReady`; the native side is React Router's own hooks and history.
 *
 * This package's `ListRouteNav` is the reference for the kit's ListRouteNav DOM cases:
 * `RECORD_GOLDENS=1 npx vitest run src/__tests__/conformance.test.tsx` records them.
 */
import { act, type ReactElement, useEffect, useLayoutEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  BrowserRouter,
  Link,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router'

import {
  type ListRouteNavMount,
  listRouteNavRoutes,
  type RouterHarness,
  type RouterHarnessFactory,
  runListRouteNavConformance,
  runRouterConformance,
} from '@molecule/app-framework-conformance/routing'
import {
  useLocation as useBindingLocation,
  useParams as useBindingParams,
} from '@molecule/app-react'
import type { Router } from '@molecule/app-routing'

import { MoleculeRouterProvider } from '../hooks.js'
import { ListRouteNav } from '../ListRouteNav.js'

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
 * @param props - The callback that receives each commit's capture.
 * @returns Nothing; the component renders nothing.
 */
function Capture(props: { onCapture: (capture: NativeCapture) => void }): null {
  const { onCapture } = props
  const navigate = useNavigate()
  const location = useLocation()
  // Before the paint of each commit, so `nativePath()` is what React Router has committed at
  // every task boundary a case samples.
  useLayoutEffect(() => {
    onCapture({ navigate, location })
  })
  return null
}

/**
 * Renders React Router's own `<Link>` to the path the harness asks about, so
 * `nativeHref` reads the href React Router writes.
 *
 * @param props - The callback that receives the setter of the probed path.
 * @returns The link, once a path is asked about.
 */
function HrefProbe(props: {
  onSetter: (set: (path: string) => void) => void
}): ReactElement | null {
  const [to, setTo] = useState<string | null>(null)
  const { onSetter } = props
  useEffect(() => {
    onSetter(setTo)
  }, [onSetter])
  return to === null ? null : <Link to={to} data-href-probe="" />
}

/**
 * How one conformance run mounts its native router and drives it from the outside.
 */
/**
 * Stays mounted beside the pages and shows the pathname `@molecule/app-react`'s `useLocation`
 * reads.
 *
 * @returns The location reader.
 */
function LocationReader(): ReactElement {
  return <output data-location="">{useBindingLocation().pathname}</output>
}

/**
 * The page of `/users/:id`: the id `@molecule/app-react`'s `useParams` reads.
 *
 * @returns The page.
 */
function UserPage(): ReactElement {
  return <p>user {useBindingParams().id}</p>
}

interface NativeRouterSetup {
  /**
   * Wraps the app in the native router, starting at `initialPath` under `base`.
   *
   * @param children - The provider and the capture child.
   * @param initialPath - Where the native router starts, within the app.
   * @param base - The basename (`''` for none).
   * @returns The router element to render.
   */
  element: (children: ReactElement, initialPath: string, base: string) => ReactElement

  /**
   * Moves the native router back one entry, as the browser's back button does.
   *
   * @param capture - The native navigate/location of the latest render.
   */
  nativeBack: (capture: NativeCapture) => void

  /**
   * Points the native router at `initialPath` under `base` before the render (jsdom's URL).
   *
   * @param initialPath - Where the native router starts, within the app.
   * @param base - The basename (`''` for none).
   */
  prepare?: (initialPath: string, base: string) => void

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
  (initialPath, { base, container }) => {
    native.prepare?.(initialPath, base)

    let bonded: Router | undefined
    let root: Root | undefined
    let probe: ((path: string) => void) | undefined
    const capture: { current: NativeCapture | undefined } = { current: undefined }

    const app = (
      <MoleculeRouterProvider
        onRouterReady={(router) => {
          bonded = router
        }}
      >
        <Capture
          onCapture={(value) => {
            capture.current = value
          }}
        />
        <HrefProbe
          onSetter={(set) => {
            probe = set
          }}
        />
        <LocationReader />
        <Routes>
          <Route path="/users/:id" element={<UserPage />} />
          <Route path="/one" element={<p>page one</p>} />
          <Route path="/two" element={<p>page two</p>} />
          <Route path="*" element={null} />
        </Routes>
      </MoleculeRouterProvider>
    )

    act(() => {
      root = createRoot(container)
      root.render(native.element(app, initialPath, base))
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
      nativeHref: (path) => {
        act(() => {
          probe?.(path)
        })
        const link = container.querySelector('[data-href-probe]')
        if (!link) throw new Error('React Router never rendered the href probe')
        return link.getAttribute('href') ?? ''
      },
      settle: () => act(async () => {}),
      teardown: () => {
        act(() => {
          root?.unmount()
        })
        native.restore?.()
      },
    }
    return harness
  }

runRouterConformance(
  'react-router (MemoryRouter)',
  createHarnessOver({
    element: (children, initialPath, base) => (
      <MemoryRouter basename={base || undefined} initialEntries={[base + initialPath]}>
        {children}
      </MemoryRouter>
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
    element: (children, _initialPath, base) => (
      <BrowserRouter basename={base || undefined}>{children}</BrowserRouter>
    ),
    prepare: (initialPath, base) => {
      window.history.replaceState(null, '', base + initialPath)
    },
    nativeBack: () => {
      window.history.back()
    },
    restore: () => {
      window.history.replaceState(null, '', '/')
    },
  }),
)

/**
 * Mounts this package's `ListRouteNav` under a `MemoryRouter` declaring the kit's routes,
 * every one rendering the same `ListRouteNav`, with no molecule provider.
 *
 * @param container - Where the app renders.
 * @param initialPath - Where the router starts.
 * @param props - The case's props.
 * @returns The mounted nav.
 */
const mountListRouteNav: ListRouteNavMount = async (container, initialPath, props) => {
  const capture: { current: NativeCapture | undefined } = { current: undefined }
  const { attrs, children, ...rest } = props
  const nav = (
    <ListRouteNav {...attrs} {...rest}>
      {children && ((route) => <output data-testid="children">{children(route)}</output>)}
    </ListRouteNav>
  )
  let root: Root | undefined
  act(() => {
    root = createRoot(container)
    root.render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Capture
          onCapture={(value) => {
            capture.current = value
          }}
        />
        <Routes>
          {listRouteNavRoutes.map((path) => (
            <Route key={path} path={path} element={nav} />
          ))}
        </Routes>
      </MemoryRouter>,
    )
  })
  const current = (): NativeCapture => {
    if (!capture.current) throw new Error('React Router never rendered the capture child')
    return capture.current
  }
  return {
    nativePath: () => {
      const { pathname, search, hash } = current().location
      return pathname + search + hash
    },
    nativeBack: () => current().navigate(-1),
    nativeForward: () => current().navigate(1),
    perform: (action) =>
      act(async () => {
        await action()
      }),
    unmount: async () => {
      act(() => {
        root?.unmount()
      })
    },
  }
}

runListRouteNavConformance('react-router', mountListRouteNav, { reference: true })
