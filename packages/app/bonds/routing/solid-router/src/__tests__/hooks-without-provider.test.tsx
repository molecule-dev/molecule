/**
 * The titles of React's `hooks-without-provider.test.tsx`, over this bond's real Solid
 * Router: "under MemoryRouter" is a `<MemoryRouter>` on the bond's
 * `createSolidMemoryHistory`, and every hook runs in a component under it with no
 * `MoleculeRouterProvider`.
 *
 * Where React returns a value and re-renders, the port returns an accessor (Solid runs a
 * component body once); a test reads the accessor.
 */
import {
  HashRouter,
  MemoryRouter,
  Route,
  Router as BrowserRouter,
  useLocation,
} from '@solidjs/router'
import { createSignal, type JSX, onCleanup } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Router } from '@molecule/app-routing'
import {
  createBrowserRouter,
  getRouter,
  navigate as coreNavigate,
  setRouter,
} from '@molecule/app-routing'

import {
  MemoryRouter as PackageMemoryRouter,
  MoleculeRouterProvider,
  useIsActive,
  useMoleculeNavigate,
  useMoleculeQuery,
  useMoleculeRouter,
} from '../index.js'
import { createSolidMemoryHistory } from '../memory-history.js'
import type { SolidMemoryHistory } from '../types.js'

const initialPath = '/settings/team?tab=billing#payment'
const originalBond = getRouter()

// Flush macrotasks so a navigation in flight commits
const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Waits until a navigation in flight has committed.
 *
 * @returns A promise that settles after the router has committed.
 */
const settle = async (): Promise<void> => {
  for (let round = 0; round < 4; round++) await flush()
}

/** How one hook is mounted for a test. */
interface MountOptions {
  /** The paths the memory history starts at; the last one is current. Defaults to `['/']`. */
  entries?: string[]
  /** A memory history to use instead of one built from `entries`. */
  history?: SolidMemoryHistory
  /** Wraps the probe in the router tree under test; defaults to a catch-all route. */
  tree?: (probe: () => JSX.Element, history: SolidMemoryHistory) => JSX.Element
}

/** One mounted hook and how to read what it returned. */
interface Mounted<T> {
  /** Reads the value the hook returned during the component's render. */
  get: () => T
  /** The memory history the native router runs on. */
  history: SolidMemoryHistory
  /** Removes the component and its native router. */
  unmount: () => void
}

/**
 * Renders a component that calls `read` (a hook call) once, under a real Solid Router.
 *
 * @param read - The hook call to run inside the component's render.
 * @param options - Where the memory history starts and the router tree to render in.
 * @returns The value the hook returned, plus the history and unmount helper.
 */
function mount<T>(read: () => T, options: MountOptions = {}): Mounted<T> {
  const container = document.createElement('div')
  const history = options.history ?? createSolidMemoryHistory(options.entries ?? ['/'])
  const results: T[] = []

  const Probe = (): JSX.Element => {
    results[0] = read()
    return <div />
  }

  const dispose = render(
    () =>
      options.tree ? (
        options.tree(Probe, history)
      ) : (
        <MemoryRouter history={history}>
          <Route path="*" component={Probe} />
        </MemoryRouter>
      ),
    container,
  )

  return {
    get: (): T => {
      if (results.length === 0)
        throw new Error('the hook did not run; the component did not render')
      return results[0]
    },
    history,
    unmount: () => dispose(),
  }
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  setRouter(originalBond)
})

/**
 * A settings page that reads all four molecule hooks and navigates the way a tab control
 * would: one query-only change (carrying router state) and one full path change.
 *
 * @returns The page.
 */
function Settings(): JSX.Element {
  const query = useMoleculeQuery()
  const navigate = useMoleculeNavigate()
  const active = useIsActive('/settings', false)
  const router = useMoleculeRouter()
  // The molecule location: the native one also carries the bond's entry key in its state.
  const [location, setLocation] = createSignal(router.getLocation())
  onCleanup(router.subscribe(() => setLocation(router.getLocation())))

  return (
    <>
      <output aria-label="query">{JSON.stringify(query())}</output>
      <output aria-label="active">{String(active())}</output>
      <output aria-label="location">
        {location().pathname + location().search + location().hash}
      </output>
      <output aria-label="state">{JSON.stringify(location().state)}</output>
      <button onClick={() => navigate('?tab=profile', { state: { source: 'tabs' } })}>
        Profile tab
      </button>
      <button onClick={() => router.navigate('/preferences?tab=notifications#email')}>
        Preferences
      </button>
    </>
  )
}

/** The native routers the four-hook title runs under: browser, hash and memory. */
const routers = [
  {
    name: '@solidjs/router Router',
    mount: (): JSX.Element => {
      window.history.replaceState(null, '', initialPath)
      return (
        <BrowserRouter>
          <Route path="*" component={Settings} />
        </BrowserRouter>
      )
    },
  },
  {
    name: '@solidjs/router HashRouter',
    mount: (): JSX.Element => {
      window.history.replaceState(null, '', `/#${initialPath}`)
      return (
        <HashRouter>
          <Route path="*" component={Settings} />
        </HashRouter>
      )
    },
  },
  {
    name: 'package MemoryRouter',
    mount: (): JSX.Element => (
      <PackageMemoryRouter initialEntries={[initialPath]}>
        <Route path="*" component={Settings} />
      </PackageMemoryRouter>
    ),
  },
  {
    name: '@solidjs/router MemoryRouter',
    mount: (): JSX.Element => (
      <MemoryRouter history={createSolidMemoryHistory([initialPath])}>
        <Route path="*" component={Settings} />
      </MemoryRouter>
    ),
  },
] as const

describe('routing hooks without MoleculeRouterProvider', () => {
  it('reads a settings page query under MemoryRouter', () => {
    const mounted = mount(() => useMoleculeQuery(), { entries: [initialPath] })

    expect(mounted.get()()).toEqual({ tab: 'billing' })

    mounted.unmount()
  })

  it('navigates with useMoleculeNavigate under MemoryRouter', async () => {
    const mounted = mount(() => ({ navigate: useMoleculeNavigate(), location: useLocation() }), {
      entries: [initialPath],
    })

    await mounted.get().navigate('/preferences?tab=profile')
    await settle()

    expect(mounted.get().location.pathname).toBe('/preferences')
    expect(mounted.get().location.search).toBe('?tab=profile')

    mounted.unmount()
  })

  it('checks exact and partial active paths under MemoryRouter', () => {
    const mounted = mount(
      () => [
        useIsActive('/settings', false),
        useIsActive('/settings', true),
        useIsActive('/other'),
      ],
      { entries: [initialPath] },
    )

    expect(mounted.get().map((active) => active())).toEqual([true, false, false])

    mounted.unmount()
  })

  it('creates a router with the current location and working navigate under MemoryRouter', async () => {
    const history = createSolidMemoryHistory([initialPath])
    const mounted = mount(() => useMoleculeRouter({ history }), {
      history,
      tree: (probe, memory) => (
        <MemoryRouter history={memory}>
          <Route path="/settings/:account" component={probe} />
        </MemoryRouter>
      ),
    })

    const router = mounted.get()
    expect(router.getQuery()).toEqual({ tab: 'billing' })
    expect(router.getHash()).toBe('#payment')
    expect(router.getParams()).toEqual({ account: 'team' })
    await router.navigate('/settings/personal?tab=security', { state: { source: 'tabs' } })
    await settle()
    expect(router.getLocation().pathname).toBe('/settings/personal')
    expect(router.getQuery()).toEqual({ tab: 'security' })
    expect(router.getParams()).toEqual({ account: 'personal' })
    expect(router.getLocation().state).toEqual({ source: 'tabs' })

    mounted.unmount()
  })

  it.each(routers)('switches settings tabs under $name with all four hooks', async ({ mount }) => {
    // Solid delegates `onClick` to the document, so the page must be attached to it.
    const container = document.body.appendChild(document.createElement('div'))
    const dispose = render(mount, container)
    const output = (label: string): string | null | undefined =>
      container.querySelector(`[aria-label="${label}"]`)?.textContent
    const click = async (name: string): Promise<void> => {
      ;[...container.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === name)
        ?.click()
      await settle()
    }

    expect(output('query')).toBe('{"tab":"billing"}')
    expect(output('active')).toBe('true')
    expect(output('location')).toBe(initialPath)

    await click('Profile tab')
    expect(output('query')).toBe('{"tab":"profile"}')
    expect(output('state')).toBe('{"source":"tabs"}')
    expect(output('location')).toBe('/settings/team?tab=profile')
    expect(output('active')).toBe('true')

    await click('Preferences')
    expect(output('query')).toBe('{"tab":"notifications"}')
    expect(output('active')).toBe('false')
    expect(output('location')).toBe('/preferences?tab=notifications#email')

    dispose()
    container.remove()
  })

  it('does not replace the global bond when several fallback consumers mount or navigate', async () => {
    const bonded = createBrowserRouter()
    setRouter(bonded)
    const firstHistory = createSolidMemoryHistory([initialPath])
    const secondHistory = createSolidMemoryHistory([initialPath])
    const first = mount(() => useMoleculeRouter({ history: firstHistory }), {
      history: firstHistory,
    })
    const second = mount(() => useMoleculeRouter({ history: secondHistory }), {
      history: secondHistory,
    })
    expect(first.get()).not.toBe(second.get())
    expect(getRouter()).toBe(bonded)

    await first.get().navigate('/settings?tab=profile')
    await settle()
    expect(first.get().getQuery()).toEqual({ tab: 'profile' })
    expect(second.get().getQuery()).toEqual({ tab: 'billing' })
    expect(getRouter()).toBe(bonded)
    first.unmount()
    second.unmount()
    expect(getRouter()).toBe(bonded)
    bonded.destroy()
  })
})

describe('MoleculeRouterProvider compatibility', () => {
  it('drives the bonded router with its named routes and onRouterReady', async () => {
    const routes = [{ name: 'settings', path: '/settings/:account' }]
    const onRouterReady = vi.fn<(router: Router) => void>()
    const history = createSolidMemoryHistory([initialPath])
    const mounted = mount(() => useMoleculeRouter(), {
      history,
      tree: (probe, memory) => (
        <MemoryRouter
          history={memory}
          root={(props) => (
            <MoleculeRouterProvider history={memory} routes={routes} onRouterReady={onRouterReady}>
              {props.children}
            </MoleculeRouterProvider>
          )}
        >
          <Route path="/settings/:account" component={probe} />
        </MemoryRouter>
      ),
    })

    const router = mounted.get()
    expect(router).toBe(onRouterReady.mock.lastCall?.[0])
    expect(router).toBe(getRouter())
    expect(router.getRoutes()).toEqual(routes)
    expect(router.generatePath('settings', { account: 'personal' })).toBe('/settings/personal')

    await router.navigateTo('settings', { account: 'personal' }, { tab: 'security' })
    await settle()
    expect(router).toBe(onRouterReady.mock.lastCall?.[0])
    expect(router).toBe(getRouter())
    expect(router.getLocation().pathname).toBe('/settings/personal')
    expect(router.getQuery()).toEqual({ tab: 'security' })
    expect(router.getRoutes()).toEqual(routes)

    await coreNavigate('/settings/work?tab=profile')
    await settle()
    expect(router.getLocation().pathname).toBe('/settings/work')
    expect(router.getQuery()).toEqual({ tab: 'profile' })
    expect(router).toBe(getRouter())
    expect(router).toBe(onRouterReady.mock.lastCall?.[0])

    mounted.unmount()
  })
})

describe('routing hooks outside any router', () => {
  const OUTSIDE_ROUTER =
    '`useMoleculeRouter` must be used within a Solid Router router. Mount `Router`, `HashRouter` or `MemoryRouter`.'

  it.each([
    ['useMoleculeRouter', () => useMoleculeRouter()],
    ['useMoleculeQuery', () => useMoleculeQuery()],
    ['useMoleculeNavigate', () => useMoleculeNavigate()],
    ['useIsActive', () => useIsActive('/settings')],
  ] as const)('%s names the router to mount', (_name, useHook) => {
    const mount = (): unknown =>
      render(() => {
        useHook()
        return null
      }, document.createElement('div'))
    expect(mount).toThrow(OUTSIDE_ROUTER)
    // The key travels with the error, so whatever shows it can translate it.
    expect(mount).toThrow(
      expect.objectContaining({
        i18nKey: 'routing.solidRouter.error.useMoleculeRouterOutsideRouter',
      }),
    )
  })
})
