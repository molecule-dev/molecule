// @vitest-environment jsdom
/**
 * The router conformance cases over a real Angular Router (`@angular/router` 22).
 *
 * Each case boots a real Angular application (`createApplication` + `appRef.bootstrap`,
 * which runs Angular's own initial navigation through its bootstrap listener) with
 * Angular's route config (`users/:id` + a catch-all), the location mocks of
 * `@angular/common/testing`, and {@link provideMoleculeRouter}; the harness then drives
 * both sides — the molecule `Router` the bond builds, and the Angular Router directly
 * (`navigateByUrl`, `Location.back`), the way a link or the back button would.
 *
 * The mock `SpyLocation` keeps its own history stack, so cases are isolated from each
 * other and from `window.history` (nothing to restore); `setInitialPath` before
 * bootstrap makes the FIRST history entry the case's `initialPath`, which the
 * `go(-2)` case needs.
 *
 * @module
 */

import '@angular/compiler'
import { Location } from '@angular/common'
import { provideLocationMocks, SpyLocation } from '@angular/common/testing'
import { Component, provideZonelessChangeDetection, type Type } from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  provideRouter,
  Router as AngularRouter,
  RouterOutlet,
} from '@angular/router'

import { ROUTER } from '@molecule/app-angular'
import type { RouterHarness } from '@molecule/app-framework-conformance/routing'
import { runRouterConformance } from '@molecule/app-framework-conformance/routing'

import { provideMoleculeRouter } from '../providers.js'

/** A route target with no markup; routes are matched, never rendered. */
const Empty: Type<unknown> = Component({
  selector: 'mol-conformance-empty',
  standalone: true,
  template: '',
})(class EmptyRouteComponent {})

/** The bootstrap root: an outlet so Angular can activate matched routes. */
const Root: Type<unknown> = Component({
  selector: 'mol-conformance-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})(class RootComponent {})

/** A settled macrotask: Angular chains popstate moves through a `setTimeout`. */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Waits until no Angular navigation is in flight — a `NavigationStart` was answered
 * by its terminal event (`NavigationEnd`/`NavigationCancel`/`NavigationError`/
 * `NavigationSkipped`) and a following macrotask starts nothing new.
 *
 * @returns The idle `settle` wait and the `stop` for its event counting.
 */
const waitUntilIdle = (
  angularRouter: AngularRouter,
): { settle: () => Promise<void>; stop: () => void } => {
  let inFlight = 0
  const stopCounting = angularRouter.events.subscribe((event) => {
    if (event instanceof NavigationStart) {
      inFlight += 1
    } else if (
      event instanceof NavigationEnd ||
      event instanceof NavigationCancel ||
      event instanceof NavigationError ||
      event instanceof NavigationSkipped
    ) {
      inFlight = Math.max(0, inFlight - 1)
    }
  })
  const settle = async (): Promise<void> => {
    for (let round = 0; round < 50; round += 1) {
      await tick()
      if (inFlight === 0) {
        await tick()
        if (inFlight === 0) return
      }
    }
    throw new Error(`the Angular Router never went idle (${inFlight} navigations in flight)`)
  }
  return {
    settle,
    stop: () => stopCounting.unsubscribe(),
  }
}

runRouterConformance('angular-router', async (initialPath): Promise<RouterHarness> => {
  const appRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([
        { path: 'users/:id', component: Empty },
        { path: '**', component: Empty },
      ]),
      provideLocationMocks(),
      // `provideLocationMocks` registers the spy under `Location`; register the class
      // too so the harness can call `setInitialPath` (a SpyLocation-only method).
      { provide: SpyLocation, useExisting: Location },
      // No initial molecule routes: the cases register what they name, and
      // `getRoutes()` must answer only those (the reference harnesses do the same).
      provideMoleculeRouter(),
    ],
  })

  const spyLocation = appRef.injector.get(SpyLocation)
  spyLocation.setInitialPath(initialPath)

  // Getting the router first subscribes the idle counter, so the initial
  // navigation's NavigationStart (emitted during bootstrap) is counted too.
  const angularRouter = appRef.injector.get(AngularRouter)
  const { settle, stop } = waitUntilIdle(angularRouter)

  // Unlike `bootstrapApplication`, `ApplicationRef.bootstrap` does not create the
  // host element — it queries the document for the component's selector.
  const host = document.createElement('mol-conformance-root')
  document.body.appendChild(host)

  appRef.bootstrap(Root, host)
  await settle()

  const router = appRef.injector.get(ROUTER)

  return {
    router,
    nativePush: async (path) => {
      await angularRouter.navigateByUrl(path)
    },
    nativeBack: () => spyLocation.back(),
    nativePath: () => angularRouter.url,
    settle,
    teardown: async () => {
      // The `destroy` case already destroyed it; the bond's destroy is idempotent.
      router.destroy()
      stop()
      appRef.destroy()
      host.remove()
    },
  }
})
