/**
 * A real Angular application for the bond's tests: `createApplication` plus Angular's own
 * `provideRouter`, bootstrapped like `bootstrapApplication` does, with the URL either on
 * jsdom's browser history (`PathLocationStrategy` under `APP_BASE_HREF`) or on Angular's
 * memory history (`provideLocationMocks()`), and a `settle()` that waits for the router to
 * go idle.
 *
 * @module
 */

import '@angular/compiler'
import { APP_BASE_HREF, Location } from '@angular/common'
import { provideLocationMocks } from '@angular/common/testing'
import {
  type ApplicationRef,
  Component,
  type ComponentRef,
  type EnvironmentInjector,
  type EnvironmentProviders,
  type Provider,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  provideRouter,
  type Route,
  Router as AngularRouter,
  type RouterConfigOptions,
  RouterOutlet,
  withHashLocation,
  withRouterConfig,
} from '@angular/router'

/** A route target with no markup; a test path that only needs to match renders nothing. */
export const Empty: Type<unknown> = Component({
  selector: 'mol-test-empty',
  standalone: true,
  template: '',
})(class EmptyRouteComponent {})

/** The default bootstrap root: an outlet, so Angular can activate the matched route. */
export const Root: Type<unknown> = Component({
  selector: 'mol-test-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})(class RootComponent {})

/** One settled macrotask: Angular chains a navigation's work through timers. */
export const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/** A booted application under test. */
export interface BootedApp {
  /** The application. */
  readonly appRef: ApplicationRef
  /** Angular's own Router. */
  readonly router: AngularRouter
  /** Angular's Location over the same history. */
  readonly location: Location
  /** The application's injector, for a test that builds a child scope. */
  readonly injector: EnvironmentInjector
  /** The element the root component was bootstrapped into. */
  readonly host: HTMLElement
  /** The bootstrap root's component reference, for a case that drives its instance. */
  readonly componentRef: ComponentRef<unknown>
  /** Waits until no navigation is in flight, and renders one change detection. */
  settle(): Promise<void>
  /** Destroys the application and removes its host element. */
  teardown(): void
}

/** How to boot one application. */
export interface BootAppOptions {
  /** Angular's route table. */
  routes?: Route[]
  /** Extra router configuration, as `provideRouter`'s `withRouterConfig` takes it. */
  routerConfig?: RouterConfigOptions
  /** Extra providers, after the router's own (a bond provider, a callback token). */
  providers?: Array<Provider | EnvironmentProviders>
  /** Use Angular's memory history (`provideLocationMocks()`) instead of the browser's. */
  memory?: boolean
  /** Keep the path in the URL's hash (`withHashLocation()`) on the browser's history. */
  hash?: boolean
  /** The path the app starts at (`pathname + search + hash`). */
  initialPath?: string
  /** The `history.state` the start entry already carries (a browser-history app). */
  initialState?: unknown
  /** The path the app is served under. */
  base?: string
  /** The bootstrap root (an outlet by default). */
  root?: Type<unknown>
  /**
   * The element to bootstrap into (the caller creates and places it). Without one a new
   * `mol-test-root` element is appended to the document body.
   */
  hostElement?: HTMLElement
}

/**
 * Boots a real Angular application with `provideRouter`, the way an app's `main.ts` does.
 *
 * @param options - The route table, extra providers, history flavour and start URL.
 * @returns The booted application.
 */
export const bootApp = async (options: BootAppOptions = {}): Promise<BootedApp> => {
  const { routes = [{ path: '**', component: Empty }], providers = [], memory = false } = options
  const initialPath = options.initialPath ?? '/'
  const base = options.base ?? ''
  if (!memory)
    window.history.replaceState(
      options.initialState ?? null,
      '',
      options.hash ? `${base}/#${initialPath}` : `${base}${initialPath}`,
    )

  const appRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter(
        routes,
        ...(options.routerConfig ? [withRouterConfig(options.routerConfig)] : []),
        ...(options.hash ? [withHashLocation()] : []),
      ),
      { provide: APP_BASE_HREF, useValue: base },
      ...(memory ? provideLocationMocks() : []),
      ...providers,
    ],
  })

  // Subscribe the idle counter before bootstrapping, so the initial navigation counts.
  const router = appRef.injector.get(AngularRouter)
  const { settle: settleNavigations, stop } = countNavigations(router)
  const injector = appRef.injector
  const location = injector.get(Location)
  // The memory history starts empty; the app's first URL is written before the initial
  // navigation, as a browser tab's address already holds it.
  if (memory) location.replaceState(initialPath, '', options.initialState ?? null)

  const host = options.hostElement ?? document.createElement('mol-test-root')
  if (!options.hostElement) document.body.appendChild(host)
  const componentRef = appRef.bootstrap(options.root ?? Root, host)

  const settle = async (): Promise<void> => {
    await settleNavigations()
    appRef.tick()
  }
  await settle()

  return {
    appRef,
    router,
    location,
    injector,
    host,
    componentRef,
    settle,
    teardown: () => {
      stop()
      appRef.destroy()
      host.remove()
    },
  }
}

/**
 * Moves the booted application through its history the way the back and forward buttons
 * do: the platform reports the popstate a macrotask later, so wait for the URL the native
 * router commits and then settle the navigations it starts. `Location.historyGo` drives
 * whichever history the app has — jsdom's browser history, or the memory history
 * `provideLocationMocks()` supplies.
 *
 * @param app - The booted application.
 * @param delta - `-1` for Back, `1` for Forward.
 */
export const historyMove = async (app: BootedApp, delta: -1 | 1): Promise<void> => {
  const before = app.router.url
  app.location.historyGo(delta)
  for (let round = 0; round < 50 && app.router.url === before; round += 1) await tick()
  await app.settle()
}

/**
 * Counts the navigations the native router has in flight.
 *
 * @param router - The booted Angular Router.
 * @returns The `settle` wait and the `stop` for the counter's subscription.
 */
const countNavigations = (
  router: AngularRouter,
): { settle: () => Promise<void>; stop: () => void } => {
  let inFlight = 0
  const subscription = router.events.subscribe((event) => {
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
  return { settle, stop: () => subscription.unsubscribe() }
}
