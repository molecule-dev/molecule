// @vitest-environment jsdom
/**
 * The React bond's hooks-without-provider titles, ported to the Vue composables.
 *
 * "under MemoryRouter" is Vue Router's own `createMemoryHistory()`: each title drives a
 * real Vue Router and the real molecule adapter built over it, with NO
 * `MoleculeRouterProvider` mounted, exactly as React's hooks need no molecule provider.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type App, type Component, createApp, defineComponent, h, inject, nextTick, ref } from 'vue'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
  type Router as VueRouterInstance,
  type RouteRecordRaw,
  type RouterHistory,
} from 'vue-router'

import {
  getRouter,
  navigate as coreNavigate,
  type RouteDefinition,
  type Router,
  setRouter,
} from '@molecule/app-routing'

import {
  createVueRouter,
  MOLECULE_ROUTER_KEY,
  MoleculeRouterProvider,
  useIsActive,
  useLocation,
  useMoleculeNavigate,
  useMoleculeQuery,
  useMoleculeRouter,
} from '../index.js'

const initialPath = '/settings/team?tab=billing#payment'
const originalBond = getRouter()
const mountedApps: App[] = []
const hosts: HTMLElement[] = []

/** A page the declared routes render (nothing — only routing is under test). */
const Empty = { render: (): null => null }

/** The routes every title below declares: the settings page and its neighbours. */
const routes: RouteRecordRaw[] = [
  { path: '/settings', component: Empty },
  { path: '/settings/:account', component: Empty },
  { path: '/preferences', component: Empty },
  { path: '/other', component: Empty },
]

/** The native histories the four-hook title runs over: memory, browser and hash. */
const histories = [
  { name: 'vue-router memory history', history: (): RouterHistory => createMemoryHistory() },
  { name: 'vue-router web history', history: (): RouterHistory => createWebHistory() },
  { name: 'vue-router hash history', history: (): RouterHistory => createWebHashHistory() },
] as const

/**
 * A page that reads all four molecule composables and navigates the way a tab control
 * would: one query-only change (carrying router state) and one full path change.
 */
const Settings = defineComponent({
  setup() {
    const query = useMoleculeQuery()
    const navigate = useMoleculeNavigate()
    const active = useIsActive('/settings', false)
    const router = useMoleculeRouter()
    const location = useLocation()

    return () =>
      h('div', [
        h('output', { 'aria-label': 'query' }, JSON.stringify(query.value)),
        h('output', { 'aria-label': 'active' }, String(active.value)),
        h(
          'output',
          { 'aria-label': 'location' },
          location.value.pathname + location.value.search + location.value.hash,
        ),
        h('output', { 'aria-label': 'state' }, JSON.stringify(location.value.state)),
        h(
          'button',
          { onClick: () => navigate('?tab=profile', { state: { source: 'tabs' } }) },
          'Profile tab',
        ),
        h(
          'button',
          { onClick: () => router.value.navigate('/preferences?tab=notifications#email') },
          'Preferences',
        ),
      ])
  },
})

/** Waits a macrotask, so Vue Router's promises and Vue's render queue have settled. */
const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Mounts a REAL Vue Router at `path`, then mounts `component` in an app with the router
 * installed — no molecule provider.
 *
 * @param component - The component to mount.
 * @param path - The address the router opens on.
 * @param records - The Vue Router records the address must match.
 * @param history - The native history to create the router over (memory by default).
 * @returns The app, its host element, and the Vue Router.
 */
const mountApp = async (
  component: Component,
  path: string,
  records: RouteRecordRaw[] = routes,
  history: () => RouterHistory = createMemoryHistory,
): Promise<{ app: App; host: HTMLElement; vueRouter: VueRouterInstance }> => {
  const vueRouter = createRouter({ history: history(), routes: records })
  await vueRouter.push(path)
  await vueRouter.isReady()
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(component)
  app.use(vueRouter)
  app.mount(host)
  mountedApps.push(app)
  hosts.push(host)
  return { app, host, vueRouter }
}

/**
 * Unmounts an app and stops tracking it, so the afterEach cleanup does not unmount twice.
 *
 * @param app - The app to unmount.
 */
const unmountApp = (app: App): void => {
  const index = mountedApps.indexOf(app)
  if (index !== -1) mountedApps.splice(index, 1)
  app.unmount()
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
  setRouter(originalBond)
})

describe('routing composables without MoleculeRouterProvider', () => {
  it('reads a settings page query under MemoryRouter', async () => {
    let query: unknown
    const Probe = defineComponent({
      setup() {
        const current = useMoleculeQuery()
        return () => {
          query = current.value
          return h('output', JSON.stringify(current.value))
        }
      },
    })

    const { host } = await mountApp(Probe, initialPath)

    expect(query).toEqual({ tab: 'billing' })
    expect(host.querySelector('output')?.textContent).toBe('{"tab":"billing"}')
  })

  it('navigates with useMoleculeNavigate under MemoryRouter', async () => {
    let navigate!: ReturnType<typeof useMoleculeNavigate>
    const Probe = defineComponent({
      setup() {
        navigate = useMoleculeNavigate()
        const location = useLocation()
        return () => h('output', `${location.value.pathname}${location.value.search}`)
      },
    })

    const { host, vueRouter } = await mountApp(Probe, initialPath)

    navigate('/preferences?tab=profile')
    await nextTick()
    await flush()

    expect(host.querySelector('output')?.textContent).toBe('/preferences?tab=profile')
    expect(vueRouter.currentRoute.value.path).toBe('/preferences')
    expect(vueRouter.currentRoute.value.fullPath).toBe('/preferences?tab=profile')
  })

  it('checks exact and partial active paths under MemoryRouter', async () => {
    let values: boolean[] = []
    const Probe = defineComponent({
      setup() {
        const partial = useIsActive('/settings', false)
        const exact = useIsActive('/settings', true)
        const other = useIsActive('/other')
        return () => {
          values = [partial.value, exact.value, other.value]
          return h('output', JSON.stringify(values))
        }
      },
    })

    await mountApp(Probe, initialPath)

    expect(values).toEqual([true, false, false])
  })

  it.each(histories)(
    'switches settings tabs under $name with all four hooks',
    async ({ history }) => {
      const { host } = await mountApp(Settings, initialPath, routes, history)

      const output = (label: string): string | null | undefined =>
        host.querySelector(`[aria-label="${label}"]`)?.textContent

      expect(output('query')).toBe('{"tab":"billing"}')
      expect(output('active')).toBe('true')
      expect(output('location')).toBe(initialPath)

      const click = async (name: string): Promise<void> => {
        const button = [...host.querySelectorAll('button')].find(
          (candidate) => candidate.textContent?.trim() === name,
        )
        button?.click()
        await nextTick()
        await flush()
      }

      await click('Profile tab')
      expect(output('query')).toBe('{"tab":"profile"}')
      expect(output('state')).toBe('{"source":"tabs"}')
      expect(output('location')).toBe('/settings/team?tab=profile')
      expect(output('active')).toBe('true')

      await click('Preferences')
      expect(output('query')).toBe('{"tab":"notifications"}')
      expect(output('active')).toBe('false')
      expect(output('location')).toBe('/preferences?tab=notifications#email')
    },
  )

  it('creates a router with the current location and working navigate under MemoryRouter', async () => {
    let molecule!: Router
    const Probe = defineComponent({
      setup() {
        molecule = useMoleculeRouter().value
        return () => null
      },
    })

    await mountApp(Probe, initialPath)

    expect(molecule.getQuery()).toEqual({ tab: 'billing' })
    expect(molecule.getHash()).toBe('#payment')
    expect(molecule.getParams()).toEqual({ account: 'team' })

    molecule.navigate('/settings/personal?tab=security', { state: { source: 'tabs' } })
    await nextTick()
    await flush()

    expect(molecule.getLocation().pathname).toBe('/settings/personal')
    expect(molecule.getQuery()).toEqual({ tab: 'security' })
    expect(molecule.getParams()).toEqual({ account: 'personal' })
    expect(molecule.getLocation().state).toEqual({ source: 'tabs' })
  })

  it('does not replace the global bond when several fallback consumers mount or navigate', async () => {
    const bonded = createVueRouter()
    setRouter(bonded)

    let first!: Router
    let second!: Router
    const probe = (assign: (router: Router) => void): Component =>
      defineComponent({
        setup() {
          assign(useMoleculeRouter().value)
          return () => null
        },
      })

    const firstApp = await mountApp(
      probe((router) => {
        first = router
      }),
      initialPath,
    )
    const secondApp = await mountApp(
      probe((router) => {
        second = router
      }),
      initialPath,
    )

    expect(first).not.toBe(second)
    expect(getRouter()).toBe(bonded)

    first.navigate('/settings?tab=profile')
    await nextTick()
    await flush()

    expect(first.getQuery()).toEqual({ tab: 'profile' })
    expect(second.getQuery()).toEqual({ tab: 'billing' })
    expect(getRouter()).toBe(bonded)

    unmountApp(firstApp.app)
    unmountApp(secondApp.app)
    expect(getRouter()).toBe(bonded)
  })

  it('returns the exact bonded router with named routes and onRouterReady', async () => {
    const definitions: RouteDefinition[] = [{ name: 'settings', path: '/settings/:account' }]
    const onRouterReady = vi.fn<(router: Router) => void>()

    let molecule!: Router
    const Child = defineComponent({
      setup() {
        molecule = useMoleculeRouter().value
        return () => h('p', 'settings')
      },
    })
    const Root = defineComponent({
      setup() {
        return () =>
          h(
            MoleculeRouterProvider,
            { routes: definitions, onRouterReady },
            {
              default: () => h(Child),
            },
          )
      },
    })

    await mountApp(Root, initialPath)

    expect(molecule).toBe(onRouterReady.mock.lastCall?.[0])
    expect(molecule).toBe(getRouter())
    expect(molecule.getRoutes()).toEqual(definitions)
    expect(molecule.generatePath('settings', { account: 'personal' })).toBe('/settings/personal')

    molecule.navigateTo('settings', { account: 'personal' }, { tab: 'security' })
    await nextTick()
    await flush()

    expect(molecule).toBe(onRouterReady.mock.lastCall?.[0])
    expect(molecule).toBe(getRouter())
    expect(molecule.getLocation().pathname).toBe('/settings/personal')
    expect(molecule.getQuery()).toEqual({ tab: 'security' })
    expect(molecule.getRoutes()).toEqual(definitions)

    coreNavigate('/settings/work?tab=profile')
    await nextTick()
    await flush()

    expect(molecule.getLocation().pathname).toBe('/settings/work')
    expect(molecule.getQuery()).toEqual({ tab: 'profile' })
    expect(molecule).toBe(getRouter())
    expect(molecule).toBe(onRouterReady.mock.lastCall?.[0])
  })
})

describe('MoleculeRouterProvider inputs take effect', () => {
  it('registers route definitions a later useMoleculeRouter call passes', async () => {
    let molecule!: Router
    const first: RouteDefinition[] = [{ name: 'settings', path: '/settings/:account' }]
    const later: RouteDefinition[] = [{ name: 'preferences', path: '/preferences' }]

    const Probe = defineComponent({
      setup() {
        // The first array creates the router; the later one must register onto it.
        useMoleculeRouter(first)
        molecule = useMoleculeRouter(later).value
        return () => null
      },
    })

    await mountApp(Probe, initialPath)

    expect(molecule.getRoutes()).toEqual([...first, ...later])
    expect(molecule.generatePath('preferences')).toBe('/preferences')
  })

  it('provides MOLECULE_ROUTER_KEY with the bonded router', async () => {
    let injected: unknown
    let bonded!: Router
    const Child = defineComponent({
      setup() {
        injected = inject(MOLECULE_ROUTER_KEY)
        bonded = getRouter()
        return () => h('p', 'app')
      },
    })
    const Root = defineComponent({
      setup() {
        return () => h(MoleculeRouterProvider, null, { default: () => h(Child) })
      },
    })

    await mountApp(Root, initialPath)

    // The provider supplies its reactive router ref under the key.
    expect(injected).toBeDefined()
    expect((injected as { value?: Router }).value).toBe(bonded)
  })
})

describe('routing composables with a re-rendering provider tree', () => {
  it('keeps one molecule router when the calling component re-renders', async () => {
    const tick = ref(0)
    let first: Router | undefined
    let second: Router | undefined
    const Probe = defineComponent({
      setup() {
        const router = useMoleculeRouter()
        return () => {
          const current = router.value
          if (tick.value === 0) first = current
          else second = current
          return h('p', String(tick.value))
        }
      },
    })

    await mountApp(Probe, initialPath)
    tick.value += 1
    await nextTick()

    expect(first).toBeDefined()
    expect(second).toBe(first)
  })
})

describe('routing hooks outside any router', () => {
  const OUTSIDE_ROUTER =
    "`useMoleculeRouter` must be called in a component's `setup` of a Vue app with Vue Router installed. Install it with `app.use(router)`."

  /**
   * Calls `useHook` in the root component's `setup` of an app without Vue Router.
   *
   * @param useHook - The composable call.
   * @returns What the setup threw.
   */
  const thrownInSetup = (useHook: () => unknown): unknown => {
    let error: unknown
    const app = createApp(
      defineComponent({
        setup() {
          useHook()
          return () => null
        },
      }),
    )
    app.config.errorHandler = (caught) => {
      error = caught
    }
    app.mount(document.createElement('div'))
    app.unmount()
    return error
  }

  it.each([
    ['useMoleculeRouter', () => useMoleculeRouter()],
    ['useMoleculeQuery', () => useMoleculeQuery()],
    ['useMoleculeNavigate', () => useMoleculeNavigate()],
    ['useIsActive', () => useIsActive('/settings')],
  ] as const)('%s names the router to mount', (_name, useHook) => {
    // The key travels with the error, so whatever shows it can translate it.
    expect(thrownInSetup(useHook)).toEqual(
      expect.objectContaining({
        message: OUTSIDE_ROUTER,
        i18nKey: 'routing.vueRouter.error.useMoleculeRouterOutsideRouter',
      }),
    )
    // Outside any component's `setup` too, where Vue's `inject` would only warn.
    expect(useHook).toThrow(OUTSIDE_ROUTER)
  })
})
