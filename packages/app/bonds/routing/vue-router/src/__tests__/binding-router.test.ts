// @vitest-environment jsdom
/**
 * `MoleculeRouterProvider` gives `@molecule/app-vue` its router and Vue Router's `RouterView`
 * as the routed view, under the React bond's titles: the binding's composables read the bonded
 * router, `RoutedView` in a layout route renders the matched child (Vue Router's nested
 * `RouterView`), a provider inside another uses the outer one's router, a page reads its route
 * params through `useMoleculeRouter` with no route definitions, and what `useMoleculeRouter`
 * returns shares the bonded router's guards, routes and navigation.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { type App, type Component, createApp, defineComponent, h, nextTick, ref } from 'vue'
import {
  createMemoryHistory,
  createRouter,
  type Router as VueRouterInstance,
  type RouteRecordRaw,
  RouterView,
} from 'vue-router'

import { getRouter, type RouteParams, type Router, setRouter } from '@molecule/app-routing'
import { RoutedView, useLocation, useParams, useRouterInstance } from '@molecule/app-vue'

import { MoleculeRouterProvider, useMoleculeRouter } from '../index.js'

const originalBond = getRouter()
const mountedApps: App[] = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
  setRouter(originalBond)
})

/** Waits a macrotask, so Vue Router's promises and Vue's render queue have settled. */
const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * A page with its text.
 *
 * @param text - What it renders.
 * @returns The page component.
 */
const page = (text: string): Component => ({ render: () => h('p', text) })

/**
 * Mounts `root` in an app with a memory Vue Router over `routes`, started at `start`.
 *
 * @param root - The app's root component.
 * @param routes - Vue Router's routes.
 * @param start - Where the router starts.
 * @returns The Vue Router and the host element.
 */
const mountWithRouter = async (
  root: Component,
  routes: RouteRecordRaw[],
  start: string,
): Promise<{ vueRouter: VueRouterInstance; host: HTMLElement }> => {
  const vueRouter = createRouter({ history: createMemoryHistory(), routes })
  await vueRouter.push(start)
  await vueRouter.isReady()
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(root)
  app.use(vueRouter)
  app.mount(host)
  mountedApps.push(app)
  hosts.push(host)
  await nextTick()
  return { vueRouter, host }
}

describe('MoleculeRouterProvider and the framework binding', () => {
  it('gives the framework binding the router it bonds', async () => {
    let bonded: Router | undefined
    let seen: Router | undefined
    const Probe = defineComponent({
      setup() {
        seen = useRouterInstance()
        const location = useLocation()
        return () => h('span', { 'data-probe': '' }, location.value.pathname)
      },
    })
    const Root = defineComponent({
      setup: () => () =>
        h(
          MoleculeRouterProvider,
          { onRouterReady: (router: Router) => (bonded = router) },
          { default: () => [h(Probe), h(RouterView)] },
        ),
    })
    const { vueRouter, host } = await mountWithRouter(
      Root,
      [
        { path: '/one', component: page('page one') },
        { path: '/two', component: page('page two') },
      ],
      '/one',
    )
    expect(seen).toBeDefined()
    expect(seen).toBe(bonded)
    expect(host.querySelector('[data-probe]')?.textContent).toBe('/one')

    await vueRouter.push('/two')
    await flush()
    expect(host.querySelector('[data-probe]')?.textContent).toBe('/two')
    expect(host.textContent).toContain('page two')
  })

  it("puts the native router's matched child route where a layout route renders its page", async () => {
    const Layout = defineComponent({
      setup: () => () => h('main', { 'data-layout': '' }, [h(RoutedView)]),
    })
    const Root = defineComponent({
      setup: () => () => h(MoleculeRouterProvider, null, { default: () => h(RouterView) }),
    })
    const { vueRouter, host } = await mountWithRouter(
      Root,
      [
        {
          path: '/',
          component: Layout,
          children: [
            { path: 'one', component: page('page one') },
            { path: 'two', component: page('page two') },
          ],
        },
      ],
      '/one',
    )
    expect(host.querySelector('[data-layout]')?.textContent).toBe('page one')

    await vueRouter.push('/two')
    await flush()
    expect(host.querySelector('[data-layout]')?.textContent).toBe('page two')
  })

  it('a provider inside another uses the outer router, registers its routes and calls onRouterReady once', async () => {
    let outer: Router | undefined
    const innerReady = vi.fn<(router: Router) => void>()
    const routes = [{ path: '/items/:id', name: 'item' }]
    const Root = defineComponent({
      setup: () => () =>
        h(
          MoleculeRouterProvider,
          { onRouterReady: (router: Router) => (outer = router) },
          {
            default: () =>
              h(
                MoleculeRouterProvider,
                { routes, onRouterReady: innerReady },
                { default: () => h(RouterView) },
              ),
          },
        ),
    })
    const { vueRouter } = await mountWithRouter(
      Root,
      [
        { path: '/', component: page('home') },
        { path: '/items/:id', component: page('item') },
      ],
      '/',
    )
    await vueRouter.push('/items/7')
    await flush()

    expect(outer).toBeDefined()
    expect(innerReady).toHaveBeenCalledTimes(1)
    expect(innerReady).toHaveBeenCalledWith(outer)
    expect(getRouter()).toBe(outer)
    expect(outer?.getRoutes()).toEqual(expect.arrayContaining(routes))
  })

  it('a page reads its route params through useMoleculeRouter with no route definitions', async () => {
    const seen: { router: RouteParams; binding: RouteParams }[] = []
    const Page = defineComponent({
      setup() {
        const router = useMoleculeRouter()
        const binding = useParams()
        return () => {
          seen.push({ router: router.value.getParams(), binding: { ...binding.value } })
          return h('p', binding.value.account)
        }
      },
    })
    const Root = defineComponent({
      setup: () => () => h(MoleculeRouterProvider, null, { default: () => h(RouterView) }),
    })
    const { vueRouter } = await mountWithRouter(
      Root,
      [{ path: '/settings/:account', component: Page }],
      '/settings/team',
    )
    expect(seen.at(-1)).toEqual({ router: { account: 'team' }, binding: { account: 'team' } })

    seen.length = 0
    await vueRouter.push('/settings/personal')
    await flush()
    expect(seen.length).toBeGreaterThan(0)
    // No render paired the new page with the previous params.
    expect(seen).toEqual(
      seen.map(() => ({ router: { account: 'personal' }, binding: { account: 'personal' } })),
    )
  })

  it("useMoleculeRouter shares the bonded router's guards, named routes and navigation", async () => {
    const routes = [{ path: '/settings/:account', name: 'settings' }]
    const returned: Router[] = []
    const count = ref(0)
    const Page = defineComponent({
      setup() {
        const router = useMoleculeRouter()
        return () => {
          returned.push(router.value)
          return h('p', `page ${count.value}`)
        }
      },
    })
    const Root = defineComponent({
      setup: () => () => h(MoleculeRouterProvider, { routes }, { default: () => h(RouterView) }),
    })
    await mountWithRouter(
      Root,
      [
        { path: '/settings/:account', component: Page },
        { path: '/blocked', component: page('blocked') },
      ],
      '/settings/team',
    )
    const router = returned[0]
    expect(router.getRoutes()).toEqual(getRouter().getRoutes())
    expect(router.generatePath('settings', { account: 'personal' })).toBe('/settings/personal')

    await router.navigateTo('settings', { account: 'personal' })
    await flush()
    expect(getRouter().getLocation().pathname).toBe('/settings/personal')

    // A guard added through the component's router stops a navigation the bonded router starts.
    const removeGuard = router.addGuard((to) => !to.pathname.startsWith('/blocked'))
    await getRouter().navigate('/blocked')
    await flush()
    expect(getRouter().getLocation().pathname).toBe('/settings/personal')
    removeGuard()

    count.value++
    await flush()
    expect(new Set(returned).size).toBe(1)
  })
})
