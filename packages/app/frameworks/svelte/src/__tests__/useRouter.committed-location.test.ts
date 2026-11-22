// @vitest-environment jsdom

/**
 * The routing hooks and `RoutedView`, under `@molecule/app-react`'s test titles. A component that
 * stays mounted across a navigation shows the new location in its first update after it; a parent
 * that reads the location shows a navigation its child made in its own `onMount`; `RoutedView`
 * renders the routing bond's routed view and throws when there is none.
 *
 * Each case records what each UPDATE showed, so a stale update fails even though the settled DOM
 * is the same either way.
 *
 * @module
 */

import { type Component, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { I18nError } from '@molecule/app-i18n'
import { createMemoryRouter, type Router } from '@molecule/app-routing'

import NoRouter from './routed-view/NoRouter.svelte'
import Outlet from './routed-view/Outlet.svelte'
import RecordsLocation from './routed-view/RecordsLocation.svelte'
import RouterHost from './routed-view/RouterHost.svelte'
import ShowsPath from './routed-view/ShowsPath.svelte'

/** The props RouterHost takes for one page's props. */
interface RouterHostProps<PageProps extends Record<string, unknown>> {
  /** The router the binding's RouterProvider is given. */
  router: Router
  /** The routing bond's routed view, when the case has one. */
  routedView?: Component
  /** The page rendered under the provider; RoutedView when absent. */
  page?: Component<PageProps>
  /** The page's props. */
  pageProps: PageProps
}

const mounted: { instance: Record<string, unknown>; container: HTMLElement }[] = []
afterEach(async () => {
  for (const { instance, container } of mounted.splice(0)) {
    await unmount(instance)
    container.remove()
  }
})

/**
 * Mounts a tree, catching what it throws while it mounts.
 *
 * @param mountInto - Mounts the tree into the container it is given.
 * @returns Its container and the error it threw, if any.
 */
function mountCatching(mountInto: (target: HTMLElement) => Record<string, unknown>): {
  container: HTMLElement
  thrown: unknown
} {
  const container = document.createElement('div')
  document.body.appendChild(container)
  try {
    const instance = mountInto(container)
    flushSync()
    mounted.push({ instance, container })
    return { container, thrown: undefined }
  } catch (error) {
    container.remove()
    return { container, thrown: error }
  }
}

/**
 * Mounts RouterHost. The type arguments are explicit because `mount` infers a component's props
 * from the component itself, and RouterHost's vary with the page's (as context-host.ts does).
 *
 * @param props - The router, routed view, page and page props.
 * @returns Its container and the error it threw, if any.
 */
const underRouter = <PageProps extends Record<string, unknown>>(
  props: RouterHostProps<PageProps>,
): { container: HTMLElement; thrown: unknown } =>
  mountCatching((target) =>
    mount<RouterHostProps<PageProps>, Record<never, never>>(RouterHost, { target, props }),
  )

describe('the routing hooks across a navigation', () => {
  it('render the new location, params and query in the first commit after it', () => {
    const router = createMemoryRouter({
      initialEntries: ['/items/1?tab=a'],
      routes: [{ path: '/items/:id' }],
    })
    const renders: string[] = []
    underRouter({ router, page: RecordsLocation, pageProps: { renders } })
    renders.length = 0
    router.navigate('/items/2?tab=b')
    flushSync()
    expect(renders.length).toBeGreaterThan(0)
    expect(renders).toEqual(renders.map(() => '/items/2?tab=b id=2 tab=b'))
  })

  it('counterexample: a location that does not change renders no new value', () => {
    const router = createMemoryRouter({ initialEntries: ['/items/1'] })
    const renders: string[] = []
    underRouter({ router, page: RecordsLocation, pageProps: { renders, full: false } })
    expect(renders).toEqual(['/items/1'])
  })

  it('a parent reading the location shows the navigation a child makes as it mounts', () => {
    const router = createMemoryRouter({ initialEntries: ['/start'] })
    const { container } = underRouter({ router, page: ShowsPath, pageProps: {} })
    expect(container.textContent?.trim()).toBe('/moved')
  })
})

describe('RoutedView', () => {
  it("renders the routed view the routing bond's RouterProvider was given", () => {
    const router = createMemoryRouter()
    const { container, thrown } = underRouter({ router, routedView: Outlet, pageProps: {} })
    expect(thrown).toBeUndefined()
    expect(container.textContent?.trim()).toBe('routed page')
  })

  it('throws a translatable error naming the fix when the bond has no routed view', () => {
    const router = createMemoryRouter()
    const { thrown } = underRouter({ router, pageProps: {} })
    expect(thrown).toBeInstanceOf(I18nError)
    expect((thrown as I18nError).i18nKey).toBe('svelte.error.noRoutedView')
    expect((thrown as Error).message).toMatch(/pass `\{@render children\(\)\}`/)
  })

  it('names the fix when a routing hook runs with no router', () => {
    const { thrown } = mountCatching((target) => mount(NoRouter, { target }))
    expect(thrown).toBeInstanceOf(I18nError)
    expect((thrown as I18nError).i18nKey).toBe('svelte.error.useRouterOutsideProvider')
    expect((thrown as Error).message).toMatch(/routing bond/)
  })
})
