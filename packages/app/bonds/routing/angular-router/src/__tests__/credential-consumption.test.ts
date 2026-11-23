// @vitest-environment jsdom
/**
 * `credential-consumption.test.tsx`, carried to the Angular Router bond: the bond's
 * `useConsumedSearchParam` works over a real Angular Router on the browser history.
 *
 * Every case boots a REAL Angular application through {@link bootApp} on jsdom's
 * browser history (`PathLocationStrategy` under an empty base). "React StrictMode" has
 * no Angular counterpart, and a mount here already runs the entry's consume once; the
 * assertions are React's, read from the page's tuple instead of a hook result.
 *
 * @module
 */

import '@angular/compiler'
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core'
import { afterEach, describe, expect, it } from 'vitest'

import { useConsumedSearchParam, useMoleculeRouter } from '../index.js'
import { bootApp, type BootedApp, Empty } from './angular-app.js'

/** The page React's `renderHook` mounted: the consumed credential and the committed location. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-consumed-page',
  standalone: true,
  template: '',
})
class ConsumedPage {
  /** The credential, in the binding's tuple shape. */
  readonly consumed = useConsumedSearchParam('token')
  private readonly molecule = useMoleculeRouter()
  private readonly location = signal(this.molecule.getLocation())

  constructor() {
    const stop = this.molecule.subscribe(() => this.location.set(this.molecule.getLocation()))
    inject(DestroyRef).onDestroy(stop)
  }

  /**
   * The committed query, as the native router reports it.
   *
   * @returns The location's search string.
   */
  search(): string {
    return this.location().search
  }
}

const INITIAL = '/reset-password?token=first-link-secret&safe=byte%20value#section'

let app: BootedApp | undefined

/**
 * Boots the app at a credential URL, carrying the app's own history state.
 *
 * @param path - The URL to start at.
 * @returns The mounted page.
 */
const mount = async (path: string = INITIAL): Promise<{ app: BootedApp; page: ConsumedPage }> => {
  app = await bootApp({
    routes: [{ path: '**', component: Empty }],
    root: ConsumedPage,
    initialPath: path,
    initialState: { safe: 'state' },
  })
  return { app, page: app.componentRef.instance as ConsumedPage }
}

afterEach(() => {
  app?.teardown()
  app = undefined
})

describe('useConsumedSearchParam', () => {
  it('retains the credential in state while router and window agree after cleanup', async () => {
    const { page } = await mount()

    expect(page.consumed[0]).toBe('first-link-secret')
    expect(window.location.search).not.toContain('first-link-secret')
    // The native router re-encodes the value (`%20` where React Router kept `+`); the
    // decoded value is the one the assertion is about.
    expect(new URLSearchParams(window.location.search).get('safe')).toBe('byte value')
    expect(page.search()).toBe(window.location.search)
    expect(window.location.hash).toBe('#section')
    expect(window.history.state.safe).toBe('state')
  })

  it('keeps the consumed credential through query-only navigation', async () => {
    const { app, page } = await mount()

    await app.router.navigate([], { queryParams: { safe: '2' } })
    await app.settle()

    expect(page.consumed[0]).toBe('first-link-secret')
    expect(page.search()).toBe('?safe=2')
    expect(window.location.search).toBe('?safe=2')
  })

  it('retains a manual token edit until a new link arrives', async () => {
    const { app, page } = await mount()

    page.consumed[1]('pasted-token')
    await app.router.navigate([], { queryParams: { safe: '2' } })
    await app.settle()
    expect(page.consumed[0]).toBe('pasted-token')

    await app.router.navigateByUrl('/reset-password?token=second-link-secret&safe=2')
    await app.settle()
    expect(page.consumed[0]).toBe('second-link-secret')
  })

  it('consumes and cleans a second credential on the same mounted route', async () => {
    const { app, page } = await mount()

    await app.router.navigateByUrl('/reset-password?token=second-link-secret&safe=2')
    await app.settle()

    expect(page.consumed[0]).toBe('second-link-secret')
    expect(window.location.search).not.toContain('second-link-secret')
    expect(page.search()).toBe(window.location.search)
  })

  it('leaves an ordinary route without the credential parameter unchanged', async () => {
    const { page } = await mount('/search?safe=1#results')

    expect(page.consumed[0]).toBe('')
    expect(page.search()).toBe('?safe=1')
    expect(window.location.search).toBe('?safe=1')
    expect(window.location.hash).toBe('#results')
    expect(window.history.state.safe).toBe('state')
  })
})
