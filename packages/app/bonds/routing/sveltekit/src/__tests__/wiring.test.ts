// @vitest-environment jsdom
/**
 * The React bond's `wiring.test.tsx`, carried to the SvelteKit bond.
 *
 * React's file stubbed its own bond and React Router to prove that the provider's
 * mount-time `setRouter` carries core navigation into the native router. SvelteKit has no
 * provider component to stub around, so the port starts the real kit app: the bond's
 * `MoleculeRouterProvider` in the root layout builds ONE router over kit's client router,
 * calls `setRouter` with it during initialisation, and hands it to `onRouterReady`. The
 * cases read that router through the app's own `getRouter()` (`bonded()`), drive core
 * `navigate()` in the same module graph, and watch kit's `goto` — the port's native
 * navigation — receive the URL.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getRouter, setRouter } from '@molecule/app-routing'

import { clearProviderProbe, providerReadyCalls } from './kit-app/src/lib/probe.js'
import { documentUrl, kitBase, kitHash, settle, type StartedKit, startKit } from './start-kit.js'

const originalBond = getRouter()
let kit: StartedKit | undefined
let container: HTMLElement | undefined

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  clearProviderProbe()
})

afterEach(() => {
  kit?.stop()
  container?.remove()
  kit = undefined
  container = undefined
  setRouter(originalBond)
})

/** The URL kit's `goto` receives for an in-app `path`: the base path, or `#`, comes first. */
const kitUrl = (path: string): string => (kitHash ? `#${path}` : kitBase + path)

/**
 * Starts the test app at `initial` and returns it, once kit has rendered the page.
 *
 * @param initial - The in-app address kit opens on.
 * @returns The started app.
 */
async function open(initial = '/'): Promise<StartedKit> {
  container = document.createElement('div')
  document.body.append(container)
  kit = await startKit(documentUrl(initial), container)
  await settle(kit.app)
  return kit
}

describe('MoleculeRouterProvider wiring (sveltekit)', () => {
  it('bonds the adapter via setRouter on mount', async () => {
    const started = await open()

    // The provider calls `setRouter` during its initialisation, before it renders the page:
    // the app's own `getRouter()` already returns the router it built.
    expect(started.app.bonded()).toBe(started.app.router)
    expect(started.app.bonded().navigate).toBeInstanceOf(Function)
  })

  it('core navigate() drives the real React Router navigate after mount', async () => {
    // The title keeps React's words; the port's native navigation is kit's own `goto`.
    const started = await open()

    // navigate() from @molecule/app-routing — NOT a Svelte reader — must reach kit's
    // client router through the bonded adapter.
    started.app.navigate('/dashboard')
    await settle(started.app)

    const calls = started.app.gotoCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(kitUrl('/dashboard'))
    // A push: kit is asked for no `replace`, and the state carries no app value.
    expect(calls[0].options).toBeDefined()
    expect(calls[0].options!.replace).toBeUndefined()
    expect(calls[0].options?.persistState).toBe(true)
    expect(started.app.router.getLocation().pathname).toBe('/dashboard')
    expect(started.app.router.getLocation().state).toBeUndefined()
  })

  it('still invokes the optional onRouterReady callback with the bonded router', async () => {
    const started = await open()

    expect(providerReadyCalls()).toHaveLength(1)
    expect(providerReadyCalls()[0]).toBe(started.app.router)
    expect(providerReadyCalls()[0]).toBe(started.app.bonded())
  })
})
