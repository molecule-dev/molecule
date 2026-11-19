/**
 * The React bond's `credential-consumption` titles, carried to SvelteKit's real
 * client router.
 *
 * React's hook is `useConsumedSearchParam`; the Svelte bindings'
 * `useConsumedSearchParam` is a store over `@molecule/app-routing`'s
 * `createConsumedSearchParam(router, name)`, exactly as React's hook holds the same
 * core consumer. The SvelteKit bond supplies the router, so these cases drive the
 * core consumer over it — what a caller of this bond observes — and read
 * `useLocation()`'s place with the router's own `getLocation()`.
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

import {
  type ConsumedSearchParam,
  createConsumedSearchParam,
  type Router,
} from '@molecule/app-routing'

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
 * arrives through a replace navigation to the same address.
 *
 * @param path - The address the app opens on, its query and hash included.
 * @returns The started app, once kit has committed the replace.
 */
const mount = async (path: string): Promise<StartedKit> => {
  container = document.createElement('div')
  document.body.appendChild(container)
  kit = await startKit(documentUrl(path), container)
  await kit.app.router.navigate(path, { replace: true, state: { safe: 'state' } })
  await settle(kit.app)
  return kit
}

/**
 * Consumes `token` through the router, as the Svelte bindings' hook does on mount.
 *
 * @param started - The started app.
 * @returns The core consumer, once its first consumption has been committed.
 */
const consume = async (started: StartedKit): Promise<ConsumedSearchParam> => {
  const param = createConsumedSearchParam(started.app.router, 'token')
  param.connect()
  await settle(started.app)
  return param
}

/** The app's molecule router. */
const routerOf = (started: StartedKit): Router => started.app.router

describe('useConsumedSearchParam', () => {
  it('retains the credential in state while router and window agree after cleanup', async () => {
    const started = await mount('/reset-password?token=first-link-secret&safe=byte%20value#section')
    const consumed = await consume(started)

    expect(consumed.get()).toBe('first-link-secret')
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

    expect(consumed.get()).toBe('first-link-secret')
    expect(routerOf(started).getLocation().search).toBe('?safe=2')
    expect(inAppUrl().search).toBe('?safe=2')
  })

  it('retains a manual token edit until a new link arrives', async () => {
    const started = await mount('/reset-password?token=first-link-secret&safe=byte%20value#section')
    const consumed = await consume(started)

    consumed.set('pasted-token')
    await routerOf(started).navigate('?safe=2')
    await settle(started.app)
    expect(consumed.get()).toBe('pasted-token')

    await routerOf(started).navigate('/reset-password?token=second-link-secret&safe=2')
    await settle(started.app)
    expect(consumed.get()).toBe('second-link-secret')
  })

  it('consumes and cleans a second credential on the same mounted route', async () => {
    const started = await mount('/reset-password?token=first-link-secret&safe=byte%20value#section')
    const consumed = await consume(started)

    await routerOf(started).navigate('/reset-password?token=second-link-secret&safe=2')
    await settle(started.app)

    expect(consumed.get()).toBe('second-link-secret')
    expect(inAppUrl().search).not.toContain('second-link-secret')
    expect(routerOf(started).getLocation().search).toBe(inAppUrl().search)
  })

  it('leaves an ordinary route without the credential parameter unchanged', async () => {
    const started = await mount('/search?safe=1#results')
    const consumed = await consume(started)

    expect(consumed.get()).toBe('')
    expect(routerOf(started).getLocation().search).toBe('?safe=1')
    expect(inAppUrl().search).toBe('?safe=1')
    expect(inAppUrl().hash).toBe('#results')
    expect(routerOf(started).getLocation().state).toEqual({ safe: 'state' })
  })
})
