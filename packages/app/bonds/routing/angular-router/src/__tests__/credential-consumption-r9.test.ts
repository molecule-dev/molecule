// @vitest-environment jsdom
/**
 * `credential-consumption-r9.test.tsx`, carried to the Angular Router bond.
 *
 * React's case runs under `StrictMode` (its double effect mount and replay); Angular has
 * no StrictMode, so the port runs the same Back/Forward sequence on a normal mount over a
 * real Angular Router on the browser history.
 *
 * @module
 */

import '@angular/compiler'
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core'
import { afterEach, expect, it } from 'vitest'

import { useConsumedSearchParam, useMoleculeRouter } from '../index.js'
import { bootApp, type BootedApp, Empty, historyMove } from './angular-app.js'

/** The mounted page: the consumed credential and the committed location. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-test-consumed-r9-page',
  standalone: true,
  template: '',
})
class ConsumedR9Page {
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

let app: BootedApp | undefined

afterEach(() => {
  app?.teardown()
  app = undefined
})

it('associates consumed values with their cleaned entries through Back and Forward', async () => {
  app = await bootApp({
    routes: [{ path: '**', component: Empty }],
    root: ConsumedR9Page,
    initialPath: '/reset-password?token=token-A&link=A',
    initialState: {},
  })
  const page = app.componentRef.instance as ConsumedR9Page
  expect(page.consumed[0]).toBe('token-A')

  await app.router.navigateByUrl('/reset-password?token=token-B&link=B')
  await app.settle()
  expect(page.consumed[0]).toBe('token-B')

  await historyMove(app, -1)
  expect(page.search()).toBe('?link=A')
  expect(page.consumed[0]).toBe('token-A')

  await historyMove(app, 1)
  expect(page.search()).toBe('?link=B')
  expect(page.consumed[0]).toBe('token-B')
})
