// @vitest-environment jsdom

/**
 * The routing primitives and `RoutedView`, under `@molecule/app-react`'s test titles. A component
 * that stays mounted across a navigation shows the new location in its first update after it; a
 * parent that reads the location shows a navigation its child made in its own `onMount`;
 * `RoutedView` renders the routing bond's routed view and throws when there is none.
 *
 * Each case records what each UPDATE showed, so a stale update fails even though the settled DOM
 * is the same either way.
 *
 * @module
 */

import { createRenderEffect, type JSX, onMount } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import { I18nError } from '@molecule/app-i18n'
import type { Router } from '@molecule/app-routing'
import { createMemoryRouter } from '@molecule/app-routing'

import {
  useLocation,
  useNavigate,
  useParams,
  useQuery,
  useRouterInstance,
} from '../primitives/router.js'
import { RouterProvider } from '../provider.jsx'
import { RoutedView } from '../routed-view.jsx'

const disposers: (() => void)[] = []
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Renders `tree` into a fresh container, catching what it throws while it mounts.
 *
 * @param tree - The tree to render.
 * @returns Its container and the error it threw, if any.
 */
function renderCatching(tree: () => JSX.Element): { container: HTMLElement; thrown: unknown } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  try {
    disposers.push(render(tree, container))
    return { container, thrown: undefined }
  } catch (error) {
    return { container, thrown: error }
  }
}

/** Lets the primitives' deferred store reads settle. */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 3; i++) await Promise.resolve()
}

/**
 * Renders `page` under the binding's `RouterProvider`.
 *
 * @param router - The router.
 * @param page - The page.
 * @returns Its container and the error it threw, if any.
 */
const underRouter = (
  router: Router,
  page: () => JSX.Element,
): { container: HTMLElement; thrown: unknown } =>
  renderCatching(() => <RouterProvider router={router}>{page()}</RouterProvider>)

describe('the routing hooks across a navigation', () => {
  it('render the new location, params and query in the first commit after it', async () => {
    const router = createMemoryRouter({
      initialEntries: ['/items/1?tab=a'],
      routes: [{ path: '/items/:id' }],
    })
    const renders: string[] = []
    /**
     * A page that stays mounted across the navigation.
     *
     * @returns What it shows.
     */
    function Page(): JSX.Element {
      const location = useLocation()
      const params = useParams<{ id: string }>()
      const query = useQuery<{ tab?: string }>()
      const seen = (): string =>
        `${location().pathname}${location().search} id=${params().id} tab=${query().tab}`
      createRenderEffect(() => renders.push(seen()))
      return <p>{seen()}</p>
    }
    underRouter(router, () => <Page />)
    await settle()
    renders.length = 0
    router.navigate('/items/2?tab=b')
    await settle()
    expect(renders.length).toBeGreaterThan(0)
    expect(renders).toEqual(renders.map(() => '/items/2?tab=b id=2 tab=b'))
  })

  it('counterexample: a location that does not change renders no new value', async () => {
    const router = createMemoryRouter({ initialEntries: ['/items/1'] })
    const renders: string[] = []
    /**
     * A page that only reads the location.
     *
     * @returns What it shows.
     */
    function Page(): JSX.Element {
      const location = useLocation()
      createRenderEffect(() => renders.push(location().pathname))
      return <p>{location().pathname}</p>
    }
    underRouter(router, () => <Page />)
    await settle()
    expect(renders).toEqual(['/items/1'])
  })

  it('a parent reading the location shows the navigation a child makes as it mounts', async () => {
    const router = createMemoryRouter({ initialEntries: ['/start'] })
    /**
     * Redirects as it mounts, as a guard does.
     *
     * @returns Nothing.
     */
    function Child(): JSX.Element {
      const navigate = useNavigate()
      onMount(() => navigate('/moved'))
      return null
    }
    /**
     * Shows the path, as a layout computing its active item does.
     *
     * @returns The path and the child.
     */
    function Parent(): JSX.Element {
      const location = useLocation()
      return (
        <p>
          {location().pathname}
          <Child />
        </p>
      )
    }
    const { container } = underRouter(router, () => <Parent />)
    await settle()
    expect(container.textContent).toBe('/moved')
  })
})

describe('RoutedView', () => {
  it("renders the routed view the routing bond's RouterProvider was given", () => {
    const router = createMemoryRouter()
    /**
     * The bond's outlet.
     *
     * @returns The routed page.
     */
    const Outlet = (): JSX.Element => <p>routed page</p>
    const { container, thrown } = renderCatching(() => (
      <RouterProvider router={router} routedView={Outlet}>
        <RoutedView />
      </RouterProvider>
    ))
    expect(thrown).toBeUndefined()
    expect(container.textContent).toBe('routed page')
  })

  it('throws a translatable error naming the fix when the bond has no routed view', () => {
    const router = createMemoryRouter()
    const { thrown } = renderCatching(() => (
      <RouterProvider router={router}>
        <RoutedView />
      </RouterProvider>
    ))
    expect(thrown).toBeInstanceOf(I18nError)
    expect((thrown as I18nError).i18nKey).toBe('solid.error.noRoutedView')
    expect((thrown as Error).message).toMatch(/pass the page as children/)
  })

  it('names the fix when a routing hook runs with no router', () => {
    /**
     * Reads the router with none provided.
     *
     * @returns Nothing.
     */
    function NoRouter(): JSX.Element {
      useRouterInstance()
      return null
    }
    const { thrown } = renderCatching(() => <NoRouter />)
    expect(thrown).toBeInstanceOf(I18nError)
    expect((thrown as I18nError).i18nKey).toBe('solid.error.useRouterOutsideProvider')
    expect((thrown as Error).message).toMatch(/routing bond/)
    // A router mounted by a bond older than this binding gives none: the message names the update.
    expect((thrown as Error).message).toContain(
      'older than this binding: update it (`npm install @molecule/app-routing-solid-router@latest`)',
    )
  })
})
