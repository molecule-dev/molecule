// @vitest-environment jsdom
/**
 * The React routing bond's `wiring.test.tsx`, carried to the Angular Router bond.
 *
 * React's file stubs its own bond and React Router to prove the provider's mount-time
 * `setRouter` carries core navigation into the native router. Angular needs no stub: the
 * bond is provided by `provideMoleculeRouter` into a real application, so the case calls
 * `navigate()` from `@molecule/app-routing` and watches Angular's own
 * `Router.navigateByUrl` receive it.
 *
 * @module
 */

import '@angular/compiler'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ROUTER } from '@molecule/app-angular'
import { getRouter, navigate as coreNavigate, type Router, setRouter } from '@molecule/app-routing'

import { provideMoleculeRouter } from '../index.js'
import { bootApp, type BootedApp, Empty } from './angular-app.js'

/** The route table, so every path a case navigates to matches. */
const routes = [{ path: '**', component: Empty }]

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

afterEach(() => {
  for (const app of booted.splice(0)) app.teardown()
  setRouter(originalBond)
})

describe('provideMoleculeRouter wiring (angular-router)', () => {
  it('bonds the adapter via setRouter on mount', async () => {
    // Bootstrapping with the bond IS the mount: its environment initializer calls
    // `setRouter`, so core's `getRouter()` answers with the Angular adapter.
    const app = await boot({ routes, providers: [provideMoleculeRouter()] })

    const adapter = getRouter()
    expect(adapter).toBe(app.injector.get(ROUTER))
    expect(adapter.navigate).toBeInstanceOf(Function)
  })

  it('core navigate() drives the real React Router navigate after mount', async () => {
    // React's title names the React Router navigate; the port's native navigate is
    // Angular's own `Router.navigateByUrl`, which the bonded adapter must call.
    const app = await boot({ routes, providers: [provideMoleculeRouter()] })
    const nativeNavigate = vi.spyOn(app.router, 'navigateByUrl')

    coreNavigate('/dashboard')
    await app.settle()

    expect(nativeNavigate).toHaveBeenCalledWith(
      '/dashboard',
      expect.objectContaining({ replaceUrl: false }),
    )
  })

  it('still invokes the optional onRouterReady callback with the bonded router', async () => {
    const onRouterReady = vi.fn<(router: Router) => void>()
    await boot({ routes, providers: [provideMoleculeRouter({ onRouterReady })] })

    expect(onRouterReady).toHaveBeenCalledTimes(1)
    expect(onRouterReady.mock.calls[0][0]).toBe(getRouter())
  })
})
