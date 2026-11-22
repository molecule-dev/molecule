// @vitest-environment jsdom
/**
 * `MoleculeRouterProvider` gives `@molecule/app-solid` its router, under the React bond's
 * titles: the binding's primitives read the bonded router, a layout route gets its page as
 * `props.children` (Solid Router has no outlet, so the bond provides no routed view and
 * `RoutedView` says so), a provider inside another uses the outer one's router, a page reads its
 * route params through `useMoleculeRouter` with no route definitions, and what
 * `useMoleculeRouter` returns shares the bonded router's guards, routes and navigation. One
 * case has no React title: a component kept mounted beside the page already shows the new
 * location when the new page's `onMount` runs.
 */
import { MemoryRouter, type Navigator, Route, useNavigate } from '@solidjs/router'
import { createSignal, type JSX, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nError } from '@molecule/app-i18n'
import { getRouter, type RouteParams, type Router, setRouter } from '@molecule/app-routing'
import { RoutedView, useLocation, useParams, useRouterInstance } from '@molecule/app-solid'

import { MoleculeRouterProvider, useMoleculeRouter } from '../index.js'
import { createSolidMemoryHistory } from '../memory-history.js'

const originalBond = getRouter()
const disposers: (() => void)[] = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  setRouter(originalBond)
  window.history.replaceState(null, '', '/')
})

/** Flushes macrotasks so a navigation in flight commits. */
const settle = async (): Promise<void> => {
  for (let round = 0; round < 4; round++) await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Renders `tree` into a new container.
 *
 * @param tree - The tree.
 * @returns The container.
 */
const mount = (tree: () => JSX.Element): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(tree, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
}

describe('MoleculeRouterProvider and the framework binding', () => {
  it('gives the framework binding the router it bonds', async () => {
    let bonded: Router | undefined
    let seen: Router | undefined
    let go: Navigator | undefined
    const history = createSolidMemoryHistory(['/one'])
    function Probe(): JSX.Element {
      seen = useRouterInstance()
      go = useNavigate()
      const location = useLocation()
      return <span data-probe="">{location().pathname}</span>
    }
    const container = mount(() => (
      <MemoryRouter
        history={history}
        root={(props) => (
          <MoleculeRouterProvider history={history} onRouterReady={(router) => (bonded = router)}>
            <Probe />
            {props.children}
          </MoleculeRouterProvider>
        )}
      >
        <Route path="/one" component={() => <p>page one</p>} />
        <Route path="/two" component={() => <p>page two</p>} />
      </MemoryRouter>
    ))
    await settle()
    expect(seen).toBeDefined()
    expect(seen).toBe(bonded)
    expect(container.querySelector('[data-probe]')?.textContent).toBe('/one')

    await go?.('/two')
    await settle()
    expect(container.querySelector('[data-probe]')?.textContent).toBe('/two')
    expect(container.textContent).toContain('page two')
  })

  it("a component kept mounted beside the page shows the new location when the new page's onMount runs", async () => {
    let go: Navigator | undefined
    const atMount: (string | null | undefined)[] = []
    const history = createSolidMemoryHistory(['/one'])
    function Reader(): JSX.Element {
      go = useNavigate()
      const location = useLocation()
      return <output data-location="">{location().pathname}</output>
    }
    function PageTwo(): JSX.Element {
      onMount(() => atMount.push(document.querySelector('[data-location]')?.textContent))
      return <p>page two</p>
    }
    mount(() => (
      <MemoryRouter
        history={history}
        root={(props) => (
          <MoleculeRouterProvider history={history}>
            <Reader />
            {props.children}
          </MoleculeRouterProvider>
        )}
      >
        <Route path="/one" component={() => <p>page one</p>} />
        <Route path="/two" component={PageTwo} />
      </MemoryRouter>
    ))
    await settle()
    await go?.('/two')
    await settle()
    // The router tells its subscribers in the update that changes the location, so the
    // reader re-renders with the page, before the page's mount effects.
    expect(atMount).toEqual(['/two'])
  })

  it("puts the native router's matched child route where a layout route renders its page", async () => {
    let go: Navigator | undefined
    const history = createSolidMemoryHistory(['/one'])
    function Layout(props: { children?: JSX.Element }): JSX.Element {
      go = useNavigate()
      return <main data-layout="">{props.children}</main>
    }
    const container = mount(() => (
      <MemoryRouter
        history={history}
        root={(props) => (
          <MoleculeRouterProvider history={history}>{props.children}</MoleculeRouterProvider>
        )}
      >
        <Route path="/" component={Layout}>
          <Route path="/one" component={() => <p>page one</p>} />
          <Route path="/two" component={() => <p>page two</p>} />
        </Route>
      </MemoryRouter>
    ))
    await settle()
    expect(container.querySelector('[data-layout]')?.textContent).toBe('page one')

    await go?.('/two')
    await settle()
    expect(container.querySelector('[data-layout]')?.textContent).toBe('page two')
  })

  it('RoutedView under this bond throws the error that names props.children', async () => {
    const history = createSolidMemoryHistory(['/'])
    let thrown: unknown
    function Layout(): JSX.Element {
      try {
        return <RoutedView />
      } catch (error) {
        thrown = error
        return null
      }
    }
    mount(() => (
      <MemoryRouter
        history={history}
        root={(props) => (
          <MoleculeRouterProvider history={history}>{props.children}</MoleculeRouterProvider>
        )}
      >
        <Route path="/" component={Layout} />
      </MemoryRouter>
    ))
    await settle()
    expect(thrown).toBeInstanceOf(I18nError)
    expect((thrown as I18nError).i18nKey).toBe('solid.error.noRoutedView')
    expect((thrown as Error).message).toMatch(/props\.children/)
  })

  it('a provider inside another uses the outer router, registers its routes and calls onRouterReady once', async () => {
    let outer: Router | undefined
    let go: Navigator | undefined
    const innerReady = vi.fn<(router: Router) => void>()
    const routes = [{ path: '/items/:id', name: 'item' }]
    const history = createSolidMemoryHistory(['/'])
    function Home(): JSX.Element {
      go = useNavigate()
      return <p>home</p>
    }
    mount(() => (
      <MemoryRouter
        history={history}
        root={(props) => (
          <MoleculeRouterProvider history={history} onRouterReady={(router) => (outer = router)}>
            <MoleculeRouterProvider routes={routes} onRouterReady={innerReady}>
              {props.children}
            </MoleculeRouterProvider>
          </MoleculeRouterProvider>
        )}
      >
        <Route path="/" component={Home} />
        <Route path="/items/:id" component={() => <p>item</p>} />
      </MemoryRouter>
    ))
    await settle()
    await go?.('/items/7')
    await settle()

    expect(outer).toBeDefined()
    expect(innerReady).toHaveBeenCalledTimes(1)
    expect(innerReady).toHaveBeenCalledWith(outer)
    expect(getRouter()).toBe(outer)
    expect(outer?.getRoutes()).toEqual(expect.arrayContaining(routes))
  })

  it('a page reads its route params through useMoleculeRouter with no route definitions', async () => {
    const seen: { router: RouteParams; binding: RouteParams }[] = []
    let go: Navigator | undefined
    const history = createSolidMemoryHistory(['/settings/team'])
    function Page(): JSX.Element {
      const router = useMoleculeRouter()
      const binding = useParams()
      go = useNavigate()
      return (
        <p>
          {(() => {
            seen.push({ router: router.getParams(), binding: { ...binding() } })
            return binding().account
          })()}
        </p>
      )
    }
    mount(() => (
      <MemoryRouter
        history={history}
        root={(props) => (
          <MoleculeRouterProvider history={history}>{props.children}</MoleculeRouterProvider>
        )}
      >
        <Route path="/settings/:account" component={Page} />
      </MemoryRouter>
    ))
    await settle()
    expect(seen.at(-1)).toEqual({ router: { account: 'team' }, binding: { account: 'team' } })

    seen.length = 0
    await go?.('/settings/personal')
    await settle()
    expect(seen.length).toBeGreaterThan(0)
    // No render paired the new page with the previous params.
    expect(seen).toEqual(
      seen.map(() => ({ router: { account: 'personal' }, binding: { account: 'personal' } })),
    )
  })

  it("useMoleculeRouter shares the bonded router's guards, named routes and navigation", async () => {
    const routes = [{ path: '/settings/:account', name: 'settings' }]
    const returned: Router[] = []
    const [count, setCount] = createSignal(0)
    const history = createSolidMemoryHistory(['/settings/team'])
    function Page(): JSX.Element {
      const router = useMoleculeRouter()
      return (
        <p>
          {(() => {
            returned.push(router)
            return `page ${count()}`
          })()}
        </p>
      )
    }
    mount(() => (
      <MemoryRouter
        history={history}
        root={(props) => (
          <MoleculeRouterProvider history={history} routes={routes}>
            {props.children}
          </MoleculeRouterProvider>
        )}
      >
        <Route path="/settings/:account" component={Page} />
        <Route path="/blocked" component={() => <p>blocked</p>} />
      </MemoryRouter>
    ))
    await settle()
    const router = returned[0]
    expect(router.getRoutes()).toEqual(getRouter().getRoutes())
    expect(router.generatePath('settings', { account: 'personal' })).toBe('/settings/personal')

    await router.navigateTo('settings', { account: 'personal' })
    await settle()
    expect(getRouter().getLocation().pathname).toBe('/settings/personal')

    // A guard added through the component's router stops a navigation the bonded router starts.
    const removeGuard = router.addGuard((to) => !to.pathname.startsWith('/blocked'))
    await getRouter().navigate('/blocked')
    await settle()
    expect(getRouter().getLocation().pathname).toBe('/settings/personal')
    removeGuard()

    setCount(1)
    await settle()
    expect(new Set(returned).size).toBe(1)
  })
})
