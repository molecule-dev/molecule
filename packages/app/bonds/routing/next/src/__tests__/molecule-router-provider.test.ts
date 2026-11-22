// @vitest-environment jsdom
/**
 * `MoleculeRouterProvider` over the Next.js App Router (the stand-in client of
 * `./next-client.ts`), under the React Router bond's titles where they apply: it gives
 * `@molecule/app-react` the router it bonds, a provider inside another joins the outer one,
 * and `onRouterReady` runs once per router. Next has no outlet, so `RoutedView` throws under
 * it; and the router is bonded before the pages run their effects.
 *
 * @module
 */

import { act, Component, createElement, type ReactNode, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RoutedView, useLocation, useRouterInstance } from '@molecule/app-react'
import { getRouter, type Router, setRouter } from '@molecule/app-routing'

import {
  MoleculeRouterProvider,
  type MoleculeRouterProviderProps,
} from '../MoleculeRouterProvider.js'
import { createNextClient, type NextClient, useNextClient } from './next-client.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const originalBond = getRouter()
let root: Root | undefined
let client: NextClient | undefined
let container: HTMLElement | undefined

afterEach(() => {
  act(() => root?.unmount())
  client?.destroy()
  container?.remove()
  root = undefined
  client = undefined
  container = undefined
  setRouter(originalBond)
  window.history.replaceState(null, '', '/')
})

/** The provider's props other than the `next/navigation` values. */
type OwnProps = Omit<
  MoleculeRouterProviderProps,
  'navigation' | 'pathname' | 'searchParams' | 'params'
>

/**
 * The app's client component: the provider, fed the stand-in's `next/navigation` values.
 *
 * @param props - The provider's own props.
 * @returns The provider.
 */
function Providers(props: OwnProps): ReactNode {
  const { navigation, pathname, searchParams, params } = useNextClient()
  return createElement(MoleculeRouterProvider, {
    ...props,
    navigation,
    pathname,
    searchParams,
    params,
  })
}

/**
 * Mounts `app` under the stand-in client at `initialPath`.
 *
 * @param initialPath - Where the document starts.
 * @param app - What the root layout renders.
 * @returns The container.
 */
const mount = (initialPath: string, app: ReactNode): HTMLElement => {
  client = createNextClient({ initialPath, routes: [{ path: '/items/:id' }, { path: '*' }] })
  container = document.createElement('div')
  document.body.appendChild(container)
  const created = createRoot(container)
  root = created
  const { Provider } = client
  act(() => created.render(createElement(Provider, null, app)))
  return container
}

/**
 * Follows a `<Link>` to `path`.
 *
 * @param path - The path.
 */
const link = async (path: string): Promise<void> => {
  await act(async () => {
    client?.link(path)
  })
}

/** Keeps what a render threw, as an error boundary does. */
class Catch extends Component<
  { children: ReactNode; onError: (error: unknown) => void },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  componentDidCatch(error: unknown): void {
    this.props.onError(error)
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children
  }
}

describe('MoleculeRouterProvider (next)', () => {
  it('gives the framework binding the router it bonds', async () => {
    let bonded: Router | undefined
    const seen: Router[] = []
    function Probe(): ReactNode {
      seen.push(useRouterInstance())
      return createElement('span', { 'data-probe': '' }, useLocation().pathname)
    }
    const host = mount(
      '/one',
      createElement(
        Providers,
        { onRouterReady: (router: Router) => (bonded = router) },
        createElement(Probe),
      ),
    )
    expect(bonded).toBeDefined()
    expect(new Set(seen)).toEqual(new Set([bonded]))
    expect(getRouter()).toBe(bonded)
    expect(host.querySelector('[data-probe]')?.textContent).toBe('/one')

    await link('/two')
    expect(host.querySelector('[data-probe]')?.textContent).toBe('/two')
  })

  it('a provider inside another uses the outer router, registers its routes and calls onRouterReady once', async () => {
    let outer: Router | undefined
    const innerReady = vi.fn<(router: Router) => void>()
    const routes = [{ path: '/items/:id', name: 'item' }]
    mount(
      '/',
      createElement(
        Providers,
        { onRouterReady: (router: Router) => (outer = router) },
        createElement(MoleculeRouterProvider, { routes, onRouterReady: innerReady }),
      ),
    )
    await link('/items/7')

    expect(outer).toBeDefined()
    expect(innerReady).toHaveBeenCalledTimes(1)
    expect(innerReady).toHaveBeenCalledWith(outer)
    expect(getRouter()).toBe(outer)
    expect(outer?.getRoutes()).toEqual(expect.arrayContaining(routes))
    expect(outer?.generatePath('item', { id: '8' })).toBe('/items/8')
  })

  it('calls onRouterReady once with the bonded router, whatever the callback of a later render', async () => {
    const first = vi.fn<(router: Router) => void>()
    const second = vi.fn<(router: Router) => void>()
    let swap: (() => void) | undefined
    function App(): ReactNode {
      // Boxed, so React stores the callback instead of calling it as an updater.
      const [ready, setReady] = useState(() => ({ callback: first }))
      swap = () => setReady({ callback: second })
      return createElement(Providers, { onRouterReady: ready.callback })
    }
    mount('/', createElement(App))
    expect(first).toHaveBeenCalledTimes(1)
    expect(first).toHaveBeenCalledWith(getRouter())

    act(() => swap?.())
    await link('/two')
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
  })

  it('bonds the router before the pages run their effects', () => {
    let bonded: Router | undefined
    const atPageEffect: Router[] = []
    function Page(): ReactNode {
      useEffect(() => {
        atPageEffect.push(getRouter())
      }, [])
      return null
    }
    mount(
      '/',
      createElement(
        Providers,
        { onRouterReady: (router: Router) => (bonded = router) },
        createElement(Page),
      ),
    )
    expect(atPageEffect).toHaveLength(1)
    // The provider's router, not the fallback a page reaches before the bond.
    expect(atPageEffect[0]).toBe(bonded)
  })

  it("tells subscribers about a navigation before the new page's effects run", async () => {
    const heard: string[] = []
    const atPageEffect: string[][] = []
    function Page(): ReactNode {
      const { pathname } = useNextClient()
      useEffect(() => {
        atPageEffect.push([pathname, ...heard])
      }, [pathname])
      return null
    }
    mount(
      '/one',
      createElement(
        Providers,
        {
          onRouterReady: (router: Router) =>
            router.subscribe((location) => heard.push(location.pathname)),
        },
        createElement(Page),
      ),
    )
    await link('/two')
    // A page's effect runs after the commit that shows it, so a subscriber that is told in an
    // effect after its children's (the paint already done) would not be heard yet.
    expect(atPageEffect).toEqual([['/one'], ['/two', '/two']])
  })

  it('RoutedView says a Next.js layout renders its page as children', () => {
    let thrown: unknown
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mount(
      '/',
      createElement(
        Providers,
        null,
        createElement(Catch, {
          onError: (caught: unknown) => (thrown = caught),
          children: createElement(RoutedView),
        }),
      ),
    )
    error.mockRestore()
    expect(thrown).toMatchObject({ i18nKey: 'react.error.noRoutedView' })
  })
})
