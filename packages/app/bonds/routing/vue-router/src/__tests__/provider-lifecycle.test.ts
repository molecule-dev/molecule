// @vitest-environment jsdom
/**
 * The React bond's provider-lifecycle titles, ported to `MoleculeRouterProvider`.
 *
 * Vue has no StrictMode, so "under StrictMode" keeps its title while the body runs the
 * same mount, navigation and re-render on a normal mount.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type App, type Component, createApp, defineComponent, h, nextTick, ref } from 'vue'
import {
  createMemoryHistory,
  createRouter,
  type Router as VueRouterInstance,
  type RouteRecordRaw,
  RouterView,
} from 'vue-router'

import { getRouter, type Router, setRouter } from '@molecule/app-routing'

import { MoleculeRouterProvider } from '../index.js'

const originalBond = getRouter()
const mountedApps: App[] = []
const hosts: HTMLElement[] = []

/** A page the declared routes render (nothing — only routing is under test). */
const Empty = { render: (): null => null }

/** The routes each title mounts: `/` and the page a navigation lands on. */
const routes: RouteRecordRaw[] = [
  { path: '/', component: Empty },
  { path: '/page', component: Empty },
]

/** Waits a macrotask, so Vue Router's promises and Vue's render queue have settled. */
const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Mounts a real Vue Router over a memory history and returns it, ready at `/`.
 *
 * @returns The ready Vue Router.
 */
const memoryRouter = async (): Promise<VueRouterInstance> => {
  const vueRouter = createRouter({ history: createMemoryHistory(), routes })
  await vueRouter.push('/')
  await vueRouter.isReady()
  return vueRouter
}

/**
 * Mounts `component` in an app with `vueRouter` installed.
 *
 * @param component - The component to mount.
 * @param vueRouter - The Vue Router to install.
 * @returns The app and its host element.
 */
const mountApp = (
  component: Component,
  vueRouter: VueRouterInstance,
): { app: App; host: HTMLElement } => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(component)
  app.use(vueRouter)
  app.mount(host)
  mountedApps.push(app)
  hosts.push(host)
  return { app, host }
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
  setRouter(originalBond)
})

describe('MoleculeRouterProvider lifecycle', () => {
  it('shows a page mounted by a navigation the new location in its first render', async () => {
    const firstRenderPaths: string[] = []
    // Reads the location the way `@molecule/app-vue`'s `useRouter` does: in the page's
    // setup, before its first render.
    const Page = defineComponent({
      setup() {
        firstRenderPaths.push(getRouter().getLocation().pathname)
        return () => null
      },
    })
    const vueRouter = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: Empty },
        { path: '/page', component: Page },
      ],
    })
    await vueRouter.push('/')
    await vueRouter.isReady()

    const Root = defineComponent({
      setup() {
        return () => h(MoleculeRouterProvider, null, { default: () => h(RouterView) })
      },
    })
    mountApp(Root, vueRouter)

    await vueRouter.push('/page')
    await nextTick()
    await flush()

    expect(firstRenderPaths[0]).toBe('/page')
  })

  it('calls onRouterReady once with the bonded router under StrictMode', async () => {
    const onRouterReady = vi.fn<(router: Router) => void>()
    const tick = ref(0)
    const vueRouter = await memoryRouter()

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            MoleculeRouterProvider,
            { onRouterReady },
            { default: () => h('p', String(tick.value)) },
          )
      },
    })
    mountApp(Root, vueRouter)

    expect(onRouterReady).toHaveBeenCalledTimes(1)
    expect(onRouterReady.mock.calls[0][0]).toBe(getRouter())

    await vueRouter.push('/page')
    await nextTick()
    await flush()
    expect(onRouterReady).toHaveBeenCalledTimes(1)

    tick.value += 1
    await nextTick()
    expect(onRouterReady).toHaveBeenCalledTimes(1)
    expect(onRouterReady.mock.calls[0][0]).toBe(getRouter())
  })

  it('does not call onRouterReady again when only the callback changes', async () => {
    const first = vi.fn<(router: Router) => void>()
    const second = vi.fn<(router: Router) => void>()
    const callback = ref<(router: Router) => void>(first)
    const vueRouter = await memoryRouter()

    const Root = defineComponent({
      setup() {
        return () =>
          h(
            MoleculeRouterProvider,
            { onRouterReady: callback.value },
            { default: () => h('p', 'app') },
          )
      },
    })
    mountApp(Root, vueRouter)

    callback.value = second
    await nextTick()

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
  })
})
