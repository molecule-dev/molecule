// @vitest-environment jsdom
/**
 * The React routing bond's `provider-lifecycle.test.tsx`, carried to the Angular Router
 * bond. Angular's counterpart of `MoleculeRouterProvider` is `provideMoleculeRouter`,
 * which bonds the adapter at bootstrap (React bonds in the provider's mount effect) and
 * calls `onRouterReady` once per router.
 *
 * Angular has no StrictMode and no re-render with a new callback: the port's "callback
 * changes" case creates a second provider scope over the same Angular Router — a lazy
 * route's `providers` array does exactly that — and shows the new callback is not called
 * for a router that is already bonded.
 *
 * @module
 */

import '@angular/compiler'
import { Component } from '@angular/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ROUTER } from '@molecule/app-angular'
import { getRouter, type Router, setRouter } from '@molecule/app-routing'

import { provideMoleculeRouter } from '../index.js'
import { bootApp, type BootedApp, childInjector, Empty } from './angular-app.js'

/** The route names this file navigates to. */
const routes = [
  { path: 'page', component: Empty },
  { path: '**', component: Empty },
]

/** Every path the page below saw in its first render, oldest first. */
const firstRenderPaths: string[] = []

/**
 * The page the navigation mounts. It reads the location the way
 * `@molecule/app-angular`'s `useRouter` does — once, when the component is created.
 */
@Component({
  selector: 'mol-test-lifecycle-page',
  standalone: true,
  template: '<p>page</p>',
})
class PageComponent {
  /** The path `@molecule/app-routing` reported at the page's creation. */
  readonly firstPath: string

  constructor() {
    this.firstPath = getRouter().getLocation().pathname
    firstRenderPaths.push(this.firstPath)
  }
}

const booted: BootedApp[] = []
const originalBond = getRouter()

/**
 * Boots one application and remembers it for teardown.
 *
 * @param options - What the application boots with.
 * @returns The booted application.
 */
const boot = async (options: Parameters<typeof bootApp>[0]): Promise<BootedApp> => {
  const app = await bootApp(options)
  booted.push(app)
  return app
}

beforeEach(() => {
  firstRenderPaths.length = 0
})

afterEach(() => {
  for (const app of booted.splice(0)) app.teardown()
  setRouter(originalBond)
})

describe('provideMoleculeRouter lifecycle', () => {
  it('shows a page mounted by a navigation the new location in its first render', async () => {
    const app = await boot({
      routes: [
        { path: 'page', component: PageComponent },
        { path: '**', component: Empty },
      ],
      initialPath: '/',
      providers: [provideMoleculeRouter()],
    })

    await app.router.navigateByUrl('/page')
    await app.settle()

    expect(firstRenderPaths[0]).toBe('/page')
  })

  it('calls onRouterReady once with the bonded router under StrictMode', async () => {
    // No StrictMode in Angular: one call is asserted across mount (bootstrap), a
    // navigation and three change-detection passes — every point React re-runs at.
    const onRouterReady = vi.fn<(router: Router) => void>()
    const app = await boot({
      routes,
      initialPath: '/',
      providers: [provideMoleculeRouter({ onRouterReady })],
    })

    expect(onRouterReady).toHaveBeenCalledTimes(1)
    expect(onRouterReady.mock.calls[0][0]).toBe(getRouter())

    await app.router.navigateByUrl('/page')
    await app.settle()
    for (let pass = 0; pass < 3; pass += 1) app.appRef.tick()

    expect(onRouterReady).toHaveBeenCalledTimes(1)
    expect(onRouterReady.mock.calls[0][0]).toBe(getRouter())
  })

  it('does not call onRouterReady again when only the callback changes', async () => {
    const first = vi.fn<(router: Router) => void>()
    const second = vi.fn<(router: Router) => void>()
    const app = await boot({
      routes,
      initialPath: '/',
      providers: [provideMoleculeRouter({ onRouterReady: first })],
    })
    expect(first).toHaveBeenCalledTimes(1)

    // A second provider scope over the same Angular Router, with a new callback.
    const scope = childInjector(app, [provideMoleculeRouter({ onRouterReady: second })])

    expect(scope.get(ROUTER)).toBe(getRouter())
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
    scope.destroy()
  })
})
