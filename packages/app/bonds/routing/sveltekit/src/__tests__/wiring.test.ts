// @vitest-environment jsdom
/**
 * The React bond's `wiring.test.tsx`, carried to the SvelteKit bond.
 *
 * React's file stubs its own bond and React Router to prove that the provider's mount-time
 * `setRouter` carries core navigation into the native router. SvelteKit has no provider
 * component: the app's root layout builds ONE router over kit's client router
 * (`createSvelteKitRouter`) and wires it — `setRouter` for core consumers,
 * `setMoleculeContext({ router })` for Svelte consumers — which is what React's provider
 * did on mount. So each case starts the real kit app, builds the router from its
 * navigation with kit's `goto` spied (the pattern `index.test.ts` uses), performs the
 * layout's wiring step, and watches core `navigate()` reach kit's own `goto`.
 */
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

// Core keeps its real behaviour (createHistoryRouter, getRouter, navigate); setRouter is
// wrapped so a case sees the app's wiring step happen, and still stores the adapter for real.
vi.mock('@molecule/app-routing', async (importOriginal) => {
  const actual = await importOriginal<typeof AppRouting>()
  return {
    ...actual,
    setRouter: vi.fn(actual.setRouter),
  }
})

import type * as AppRouting from '@molecule/app-routing'
import { getRouter, navigate as coreNavigate, type Router, setRouter } from '@molecule/app-routing'

import type { KitGotoOptions } from '../index.js'
import { createSvelteKitRouter, type SvelteKitRouterOptions } from '../index.js'
import { documentUrl, kitBase, kitHash, settle, type StartedKit, startKit } from './start-kit.js'

/** Kit's `goto`, the native navigation function the bond calls. */
type Goto = (url: string, opts?: KitGotoOptions) => Promise<void>

/** A started app, the router its layout builds, and kit's `goto` as the bond calls it. */
interface Wiring {
  /** The started test app. */
  kit: StartedKit
  /** The router the app's root layout builds over kit's navigation. */
  router: Router
  /** Kit's `goto` spy. */
  goto: Mock<Goto>
}

const originalBond = getRouter()
let wiring: Wiring | undefined
let container: HTMLElement | undefined

beforeEach(() => {
  vi.mocked(setRouter).mockClear()
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  wiring?.router.destroy()
  wiring?.kit.stop()
  container?.remove()
  wiring = undefined
  container = undefined
  setRouter(originalBond)
})

/** The URL kit's `goto` receives for an in-app `path`: the base path, or `#`, comes first. */
const kitUrl = (path: string): string => (kitHash ? `#${path}` : kitBase + path)

/**
 * Starts the test app at `/` and builds its layout's router with kit's `goto` spied.
 *
 * @param options - What the layout passes `createSvelteKitRouter`.
 * @returns The started app, its router and the `goto` spy.
 */
async function startRouter(options: SvelteKitRouterOptions = {}): Promise<Wiring> {
  container = document.createElement('div')
  document.body.append(container)
  const kit = await startKit(documentUrl('/'), container)
  const goto = vi.fn<Goto>(kit.app.navigation.goto)
  const router = createSvelteKitRouter({ ...kit.app.navigation, goto }, options)
  wiring = { kit, router, goto }
  await settle(kit.app)
  return wiring
}

describe('MoleculeRouterProvider wiring (sveltekit)', () => {
  it('bonds the adapter via setRouter on mount', async () => {
    const { router } = await startRouter()

    // The root layout's wiring step: React's provider performed both the build and the bond.
    setRouter(router)

    expect(setRouter).toHaveBeenCalledTimes(1)
    const adapter = vi.mocked(setRouter).mock.calls[0][0]
    expect(adapter).toBeDefined()
    expect(adapter.navigate).toBeInstanceOf(Function)
    expect(getRouter()).toBe(adapter)
  })

  it('core navigate() drives the real React Router navigate after mount', async () => {
    // The title keeps React's words; the port's native navigation is kit's own `goto`.
    const { kit } = await startRouter()
    setRouter(wiring!.router)

    // navigate() from @molecule/app-routing — NOT a Svelte reader — must reach kit's
    // client router through the bonded adapter.
    coreNavigate('/dashboard')
    await settle(kit.app)

    const [url, options] = wiring!.goto.mock.calls[0]
    expect(url).toBe(kitUrl('/dashboard'))
    // A push: kit is asked for no `replace`, and the state carries no app value.
    expect(options?.replace).toBeUndefined()
    expect(options?.persistState).toBe(true)
    expect(wiring!.router.getLocation().pathname).toBe('/dashboard')
    expect(wiring!.router.getLocation().state).toBeUndefined()
  })

  it('still invokes the optional onRouterReady callback with the bonded router', async () => {
    const onRouterReady = vi.fn<(router: Router) => void>()
    const { router } = await startRouter({ onRouterReady })
    setRouter(router)

    expect(onRouterReady).toHaveBeenCalledTimes(1)
    expect(onRouterReady.mock.calls[0][0]).toBe(vi.mocked(setRouter).mock.calls[0][0])
  })
})
