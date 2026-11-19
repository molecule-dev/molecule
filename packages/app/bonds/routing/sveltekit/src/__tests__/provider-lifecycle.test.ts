// @vitest-environment jsdom
/**
 * The React bond's `provider-lifecycle.test.tsx`, carried to the SvelteKit bond.
 *
 * SvelteKit has no provider component: the app's root layout builds ONE router over kit's
 * client router and wires it. So the cases observe what React's provider lifecycle
 * asserts, at the points a kit app has:
 *
 * - React's state initializer reading `getRouter()` at a page's first render is a kit
 *   page reading its router at component initialisation (`/probe/lifecycle/page`); the
 *   navigation that mounts the page must already have committed the new location.
 * - StrictMode has no counterpart: the one-call assertion is taken across mount, a
 *   navigation and repeated updates — every point React re-runs an effect at.
 * - A provider re-render with a new callback has no counterpart (the router is built
 *   once): the port replaces the callback on the options object the caller kept, which
 *   shows the router keeps the callback it was constructed with.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getRouter, type Router, setRouter } from '@molecule/app-routing'

import { createSvelteKitRouter, type SvelteKitRouterOptions } from '../index.js'
import { clearFirstRenderPaths, firstRenderPaths } from './kit-app/src/lib/lifecycle-probe.js'
import { awaitNavigation, documentUrl, settle, type StartedKit, startKit } from './start-kit.js'

const originalBond = getRouter()
let kit: StartedKit | undefined
let container: HTMLElement | undefined
let router: Router | undefined

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  clearFirstRenderPaths()
})

afterEach(() => {
  router?.destroy()
  kit?.stop()
  container?.remove()
  kit = undefined
  container = undefined
  router = undefined
  setRouter(originalBond)
})

/**
 * Starts the test app at `initial` and returns it, once kit has rendered the page.
 *
 * @param initial - The in-app address kit opens on.
 * @returns The started app.
 */
async function open(initial: string): Promise<StartedKit> {
  container = document.createElement('div')
  document.body.append(container)
  kit = await startKit(documentUrl(initial), container)
  await settle(kit.app)
  return kit
}

/** The element with `id` in the started app. */
const element = (id: string): HTMLElement => {
  const node = container?.querySelector<HTMLElement>(`#${id}`)
  if (!node) throw new Error(`no #${id} in the started app`)
  return node
}

/** Lets a task run. */
const macrotask = (): Promise<void> => new Promise((done) => setTimeout(done, 0))

describe('MoleculeRouterProvider lifecycle (sveltekit)', () => {
  it('shows a page mounted by a navigation the new location in its first render', async () => {
    const started = await open('/probe/lifecycle')
    expect(firstRenderPaths()).toEqual([])

    await awaitNavigation(started.app, () => element('open-page').click())

    // The page read its router when kit created it, after the navigation committed.
    expect(firstRenderPaths()[0]).toBe('/probe/lifecycle/page')
  })

  it('calls onRouterReady once with the bonded router under StrictMode', async () => {
    const started = await open('/')
    const onRouterReady = vi.fn<(ready: Router) => void>()
    router = createSvelteKitRouter(started.app.navigation, { onRouterReady })
    setRouter(router)

    expect(onRouterReady).toHaveBeenCalledTimes(1)
    expect(onRouterReady.mock.calls[0][0]).toBe(getRouter())

    // No StrictMode, so no double-invoked mount: the call is asserted across the mount, a
    // navigation and repeated updates instead.
    await router.navigate('/probe/lifecycle/page')
    await settle(started.app)
    for (let turn = 0; turn < 3; turn++) {
      await macrotask()
      await settle(started.app)
    }

    expect(onRouterReady).toHaveBeenCalledTimes(1)
    expect(onRouterReady.mock.calls[0][0]).toBe(getRouter())
  })

  it('does not call onRouterReady again when only the callback changes', async () => {
    const started = await open('/')
    const first = vi.fn<(ready: Router) => void>()
    const second = vi.fn<(ready: Router) => void>()
    const options: SvelteKitRouterOptions = { onRouterReady: first }
    router = createSvelteKitRouter(started.app.navigation, options)

    // React re-rendered the provider with a new callback; the layout's router is built
    // once, so the caller replaces the callback on the options it kept.
    options.onRouterReady = second
    await router.navigate('/probe/lifecycle/page')
    await settle(started.app)

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
  })
})
