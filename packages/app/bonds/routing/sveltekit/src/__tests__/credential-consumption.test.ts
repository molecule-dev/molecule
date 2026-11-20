/**
 * The React bond's `credential-consumption` titles, carried to SvelteKit's real
 * client router and the bond's own `useConsumedSearchParam`.
 *
 * The page the cases open (`kit-app/src/routes/reset-password`, and `/search` for the
 * ordinary-route case) calls the bond's hook during initialisation and publishes the
 * `[value, set]` tuple through `credential-probe.ts`; the case reads and drives it there,
 * as React's `renderHook` reads its hook's tuple.
 *
 * Two mechanisms are React Router's own and have no SvelteKit counterpart:
 *
 * - React's `begin()` writes the entry's app state onto `window.history.state`; kit
 *   owns the history entry and keeps the app's state as `page.state`, which the
 *   router reports as `getLocation().state`, so the state goes on the entry through
 *   the router's `replace`.
 * - `window.location.search`/`.hash` are the browser's, which under kit's hash
 *   routing live inside the fragment; {@link inAppUrl} reads them as kit does.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { Router } from '@molecule/app-routing'

import { type CredentialProbe, credentialProbe } from './kit-app/src/lib/credential-probe.js'
import { documentUrl, inAppUrl, settle, type StartedKit, startKit } from './start-kit.js'

let kit: StartedKit | undefined
let container: HTMLElement | undefined

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  kit?.stop()
  container?.remove()
  kit = undefined
  container = undefined
})

/**
 * Starts the test app at `path` and puts React's `begin()` state on the entry, as
 * `BrowserRouter` carries it: the app's state travels in kit's `page.state`, so it
 * arrives through a replace navigation to the same address. The page's hook consumes the
 * credential the address carried on mount first, as React's effect does, so the replace
 * lands on an address that already had it removed and the hook consumes it again with the
 * state beside it.
 *
 * @param path - The address the app opens on, its query and hash included.
 * @returns The started app, once kit has committed both replacements.
 */
const mount = async (path: string): Promise<StartedKit> => {
  container = document.createElement('div')
  document.body.appendChild(container)
  kit = await startKit(documentUrl(path), container)
  await settle(kit.app)
  await kit.app.router.navigate(path, { replace: true, state: { safe: 'state' } })
  await settle(kit.app)
  return kit
}

/**
 * The mounted page's consumed credential, through the bond's `useConsumedSearchParam`.
 *
 * @param started - The started app.
 * @returns The page's handle: the current value and its setter.
 */
const consume = async (started: StartedKit): Promise<CredentialProbe> => {
  await settle(started.app)
  return credentialProbe()
}

/** The app's molecule router. */
const routerOf = (started: StartedKit): Router => started.app.router

describe('useConsumedSearchParam', () => {
  it('retains the credential in state while router and window agree after cleanup', async () => {
    const started = await mount('/reset-password?token=first-link-secret&safe=byte%20value#section')
    const consumed = await consume(started)

    expect(consumed.value()).toBe('first-link-secret')
    expect(inAppUrl().search).not.toContain('first-link-secret')
    expect(routerOf(started).getLocation().search).toBe(inAppUrl().search)
    expect(inAppUrl().search).toContain('safe=byte+value')
    expect(inAppUrl().hash).toBe('#section')
    // React asserts the entry's top-level `history.state.safe`; kit keeps the
    // entry's app state as `page.state`, which the router reports here.
    expect(routerOf(started).getLocation().state).toEqual({ safe: 'state' })
  })

  it('keeps the consumed credential through query-only navigation', async () => {
    const started = await mount('/reset-password?token=first-link-secret&safe=byte%20value#section')
    const consumed = await consume(started)

    await routerOf(started).navigate('?safe=2')
    await settle(started.app)

    expect(consumed.value()).toBe('first-link-secret')
    expect(routerOf(started).getLocation().search).toBe('?safe=2')
    expect(inAppUrl().search).toBe('?safe=2')
  })

  it('retains a manual token edit until a new link arrives', async () => {
    const started = await mount('/reset-password?token=first-link-secret&safe=byte%20value#section')
    const consumed = await consume(started)

    consumed.set('pasted-token')
    await routerOf(started).navigate('?safe=2')
    await settle(started.app)
    expect(consumed.value()).toBe('pasted-token')

    await routerOf(started).navigate('/reset-password?token=second-link-secret&safe=2')
    await settle(started.app)
    expect(consumed.value()).toBe('second-link-secret')
  })

  it('consumes and cleans a second credential on the same mounted route', async () => {
    const started = await mount('/reset-password?token=first-link-secret&safe=byte%20value#section')
    const consumed = await consume(started)

    await routerOf(started).navigate('/reset-password?token=second-link-secret&safe=2')
    await settle(started.app)

    expect(consumed.value()).toBe('second-link-secret')
    expect(inAppUrl().search).not.toContain('second-link-secret')
    expect(routerOf(started).getLocation().search).toBe(inAppUrl().search)
  })

  it('leaves an ordinary route without the credential parameter unchanged', async () => {
    const started = await mount('/search?safe=1#results')
    const consumed = await consume(started)

    expect(consumed.value()).toBe('')
    expect(routerOf(started).getLocation().search).toBe('?safe=1')
    expect(inAppUrl().search).toBe('?safe=1')
    expect(inAppUrl().hash).toBe('#results')
    expect(routerOf(started).getLocation().state).toEqual({ safe: 'state' })
  })
})
