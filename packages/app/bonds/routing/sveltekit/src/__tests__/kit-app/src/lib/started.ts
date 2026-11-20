/**
 * The hand-off between the test app's root layout and the harness that started kit: the
 * layout calls {@link kitStarted} with what it built; the harness awaits
 * {@link whenKitStarted}. Module state is fresh for every started app, because the harness
 * resets the module registry before each start.
 *
 * @module
 */

import type { NavigateOptions, NavigationAction, Router } from '@molecule/app-routing'

import type { SvelteKitNavigation } from '../../../../types.js'

/** The `goto` options a case reads back. */
export interface GotoCallOptions {
  /** Whether the router asked kit to replace the current history entry. */
  replace?: boolean
  /** Whether the router asked kit to keep the navigation state across a reload. */
  persistState?: boolean
}

/** One call the layout's `goto` observer saw. */
export interface GotoCall {
  /** The URL kit was asked to navigate to, with the base (or `#`) first. */
  url: string
  /** The options the router passed. */
  options?: GotoCallOptions
}

/** What the root layout hands the harness. */
export interface KitApp {
  /** The molecule router the root layout's `MoleculeRouterProvider` built. */
  router: Router
  /** The navigation pieces the provider's router was built from (`createSvelteKitNavigation`). */
  navigation: SvelteKitNavigation
  /**
   * `@molecule/app-routing`'s `getRouter()` in the started app's OWN module graph — the
   * router the provider bonded with `setRouter` during its initialisation.
   */
  bonded(): Router
  /**
   * `@molecule/app-routing`'s `setRouter()` in the started app's own module graph, for a
   * case that bonds another router the way a consumer would.
   *
   * @param router - The router to bond.
   */
  bond(router: Router): void
  /**
   * `@molecule/app-routing`'s `navigate()` in the started app's own module graph: core
   * navigation, which must reach the provider's router.
   *
   * @param path - The in-app path to navigate to.
   * @param options - Molecule navigation options.
   */
  navigate(path: string, options?: NavigateOptions): void
  /** Every URL the layout's observed kit `goto` received, in order. */
  gotoCalls(): readonly GotoCall[]
  /**
   * Whether kit is idle: no `goto` the router started is still pending, and kit has no
   * navigation in flight (`$app/state`'s `navigating.type` is `null`).
   */
  idle(): boolean
  /** Kit's `resolve(path)` from `$app/paths`: the href a kit link to `path` carries. */
  resolve(path: string): string
  /** How many callbacks `navigation` registered with kit's `afterNavigate`. */
  afterNavigateRegistrations(): number
  /**
   * What two routers heard after the layout subscribed, unsubscribed and subscribed them
   * again while it initialised (the only time kit takes an `afterNavigate` callback): one
   * over `navigation`, one over the adapter an app would write by hand, which registers a
   * kit callback per listen and whose unsubscribe does nothing.
   */
  resubscribed: {
    /** The router over `createSvelteKitNavigation`. */
    bond: (NavigationAction | undefined)[]
    /** The router over the hand-written adapter. */
    handWritten: (NavigationAction | undefined)[]
  }
}

let resolveApp: ((app: KitApp) => void) | undefined
const started = new Promise<KitApp>((resolve) => {
  resolveApp = resolve
})

/**
 * Called by the root layout with what it built.
 *
 * @param app - The router, its navigation pieces and kit's state readers.
 */
export const kitStarted = (app: KitApp): void => resolveApp?.(app)

/**
 * What the root layout built, once kit rendered it.
 *
 * @returns The app.
 */
export const whenKitStarted = (): Promise<KitApp> => started
