// @vitest-environment jsdom
/**
 * The React bond's `provider-lifecycle.test.tsx`, carried to the SvelteKit bond.
 *
 * React's cases mount `MoleculeRouterProvider` (inside a `MemoryRouter`) and observe its
 * lifecycle. The port mounts the bond's provider in the test app's root layout, over kit's
 * real client router, and observes the same points:
 *
 * - React's state initializer reading `getRouter()` at a page's first render is a kit page
 *   reading its router at component initialisation (`/probe/lifecycle/page`); the
 *   navigation that mounts the page must already have committed the new location.
 * - StrictMode has no counterpart: the one-call assertion is taken across mount, a
 *   navigation and repeated updates — every point React re-runs an effect at.
 * - A provider re-render with a new callback is a kit page (`/probe/provider-callback`)
 *   that mounts the bond's provider itself and changes the callback it passes; the router
 *   is built once during initialisation, so the second callback is never called.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getRouter, setRouter } from '@molecule/app-routing'

import { clearFirstRenderPaths, firstRenderPaths } from './kit-app/src/lib/lifecycle-probe.js'
import {
  callbackReadyCalls,
  clearProviderProbe,
  providerReadyCalls,
} from './kit-app/src/lib/probe.js'
import { awaitNavigation, documentUrl, settle, type StartedKit, startKit } from './start-kit.js'

const originalBond = getRouter()
let kit: StartedKit | undefined
let container: HTMLElement | undefined

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  clearFirstRenderPaths()
  clearProviderProbe()
})

afterEach(() => {
  kit?.stop()
  container?.remove()
  kit = undefined
  container = undefined
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

    expect(providerReadyCalls()).toHaveLength(1)
    expect(providerReadyCalls()[0]).toBe(started.app.router)
    // "Bonded": the provider's `setRouter` call, in the app's own module graph.
    expect(providerReadyCalls()[0]).toBe(started.app.bonded())

    // No StrictMode, so no double-invoked mount: the call is asserted across the mount, a
    // navigation and repeated updates instead.
    await started.app.navigate('/probe/lifecycle/page')
    await settle(started.app)
    for (let turn = 0; turn < 3; turn++) {
      await macrotask()
      await settle(started.app)
    }

    expect(providerReadyCalls()).toHaveLength(1)
    expect(providerReadyCalls()[0]).toBe(started.app.bonded())
  })

  it('does not call onRouterReady again when only the callback changes', async () => {
    const started = await open('/probe/provider-callback')

    // The page mounted the provider with the first callback; the router was built once.
    expect(callbackReadyCalls('first')).toHaveLength(1)
    expect(callbackReadyCalls('first')[0]).toBeDefined()

    // React re-rendered the provider with a new callback; the page swaps the one it passes.
    element('swap-callback').click()
    await macrotask()
    await settle(started.app)

    expect(callbackReadyCalls('first')).toHaveLength(1)
    expect(callbackReadyCalls('second')).toHaveLength(0)
  })
})
