/**
 * The hand-off between the test app's root layout and the harness that started kit: the
 * layout calls {@link kitStarted} with what it built; the harness awaits
 * {@link whenKitStarted}. Module state is fresh for every started app, because the harness
 * resets the module registry before each start.
 *
 * @module
 */

import type { NavigationAction, Router } from '@molecule/app-routing'

import type { SvelteKitNavigation } from '../../../../types.js'

/** What the root layout hands the harness. */
export interface KitApp {
  /** The molecule router over kit's client router. */
  router: Router
  /** The navigation pieces the router was built from (`createSvelteKitNavigation`). */
  navigation: SvelteKitNavigation
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
