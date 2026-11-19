// @vitest-environment jsdom
/**
 * The React bond's wiring titles, ported to `MoleculeRouterProvider`: the provider's
 * mount-time bond is proved against a REAL Vue Router over a memory history, with only
 * core's `setRouter` observed (it still performs the real bond).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type App, createApp, defineComponent, h } from 'vue'
import {
  createMemoryHistory,
  createRouter,
  type Router as VueRouterInstance,
  type RouteRecordRaw,
} from 'vue-router'

// core keeps its real behaviour (createHistoryRouter, getRouter, navigate); setRouter is
// wrapped so the tests can see the bond happen, and still stores the adapter for real.
vi.mock('@molecule/app-routing', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    setRouter: vi.fn(actual.setRouter as (router: unknown) => void),
  }
})

import { getRouter, navigate as coreNavigate, type Router, setRouter } from '@molecule/app-routing'

import { MoleculeRouterProvider } from '../index.js'

const originalBond = getRouter()
const mountedApps: App[] = []
const hosts: HTMLElement[] = []

/** A page the declared routes render (nothing — only routing is under test). */
const Empty = { render: (): null => null }

/** A catch-all route, so every navigation below matches a record. */
const routes: RouteRecordRaw[] = [{ path: '/:rest(.*)*', component: Empty }]

/** Waits a macrotask, so Vue Router's promises and Vue's render queue have settled. */
const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Mounts `MoleculeRouterProvider` in an app with a REAL Vue Router over a memory history.
 *
 * @param props - The provider props to mount it with.
 * @returns The Vue Router the provider bonded over.
 */
const mountProvider = async (
  props: {
    onRouterReady?: (router: Router) => void
  } = {},
): Promise<VueRouterInstance> => {
  const vueRouter = createRouter({ history: createMemoryHistory(), routes })
  await vueRouter.push('/')
  await vueRouter.isReady()
  const Root = defineComponent({
    setup() {
      return () => h(MoleculeRouterProvider, props, { default: () => h('p', 'app') })
    },
  })
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(Root)
  app.use(vueRouter)
  app.mount(host)
  mountedApps.push(app)
  hosts.push(host)
  return vueRouter
}

beforeEach(() => {
  vi.mocked(setRouter).mockClear()
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
  setRouter(originalBond)
})

describe('MoleculeRouterProvider wiring (vue-router)', () => {
  it('bonds the adapter via setRouter on mount', async () => {
    await mountProvider()

    expect(setRouter).toHaveBeenCalledTimes(1)
    const adapter = vi.mocked(setRouter).mock.calls[0][0]
    expect(adapter).toBeDefined()
    expect(adapter.navigate).toBeInstanceOf(Function)
    expect(getRouter()).toBe(adapter)
  })

  it('core navigate() drives the real React Router navigate after mount', async () => {
    // The title keeps React's words; the body drives the port's real Vue Router push.
    const vueRouter = await mountProvider()
    const push = vi.spyOn(vueRouter, 'push')

    // navigate() from @molecule/app-routing — NOT a composable — must reach the real
    // Vue Router through the bonded adapter.
    coreNavigate('/dashboard')
    await flush()

    expect(push).toHaveBeenCalledWith('/dashboard')
  })

  it('still invokes the optional onRouterReady callback with the bonded router', async () => {
    const onRouterReady = vi.fn<(router: Router) => void>()
    await mountProvider({ onRouterReady })

    expect(onRouterReady).toHaveBeenCalledTimes(1)
    expect(onRouterReady.mock.calls[0][0]).toBe(vi.mocked(setRouter).mock.calls[0][0])
  })

  it('core navigate({ replace }) drives Vue Router replace', async () => {
    const vueRouter = await mountProvider()
    const replace = vi.spyOn(vueRouter, 'replace')

    coreNavigate('/login', { replace: true })
    await flush()

    expect(replace).toHaveBeenCalledWith('/login')
  })
})
