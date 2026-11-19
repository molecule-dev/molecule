/**
 * The hand-off the URL-backed list cases make to the pages of the test app: the case puts
 * the declarations it is about to use on `window` BEFORE kit starts (`startKit` resets the
 * module registry, so module state would not survive), the root layout puts its router
 * there, and the probe pages read both at render time.
 *
 * @module
 */

import type { QueryParams, RouteParams, Router } from '@molecule/app-routing'

/** One declared list view, in React's `ListRouteNavItem` spelling with a text label. */
export interface ProbeSelection {
  /** Absolute route pattern, such as `/probe/shelves/:shelf`. */
  path: string
  /** Query values identifying this view; an undefined value requires the key to be absent. */
  query?: QueryParams
  /** The label text. */
  label: string
  /** Path parameters for this destination. */
  params?: RouteParams
  /** Keeps the choice visible but not navigable. */
  disabled?: boolean
}

/** What a choice's link class is computed from (React's `ListRouteNavItemState`). */
export interface ProbeLinkState {
  /** The app-owned selection key. */
  selection: string
  /** Whether the current URL selects this view. */
  active: boolean
  /** Whether navigation is disabled for this choice. */
  disabled: boolean
}

/** Everything a probe page renders, as the case declares it. */
export interface ProbeScenario {
  /** The navigation landmark's accessible name. */
  ariaLabel?: string
  /** A native `id` for the navigation landmark. */
  navId?: string
  /** Every declared view; labels and destinations share one declaration. */
  selections: Record<string, ProbeSelection>
  /** Tie-breaker or fallback selection. */
  defaultSelection?: string
  /** The pagination query key, defaulting to `page`. */
  pageParam?: string
  /** List markup classes. */
  list?: { className?: string; itemClassName?: string }
  /** App-owned link styling. */
  linkClassName?: string | ((state: ProbeLinkState) => string | undefined)
  /** Rows a selection renders, by selection key (the `children` branch). */
  rows?: Record<string, string>
  /**
   * A collection request to render from, as React's `useQuery` does: called with whether
   * the saved view is selected, its answer rendered as a list.
   */
  read?: (saved: boolean) => Promise<string[]>
  /** The local panel's initial text (default `preview`). */
  initialPanel?: string
  /** The local panel's text once the button is clicked (default `details`). */
  nextPanel?: string
  /** Whether the button shows the panel's text, as React's query page does. */
  buttonShowsPanel?: boolean
}

declare global {
  interface Window {
    /** The scenario the current probe page renders. */
    __moleculeProbe?: ProbeScenario
    /** The router the test app's root layout built over kit's client router. */
    __moleculeProbeRouter?: Router
  }
}

/**
 * Hands the case's scenario to the probe pages.
 *
 * @param scenario - The declarations the next started app renders.
 */
export const setProbeScenario = (scenario: ProbeScenario): void => {
  window.__moleculeProbe = scenario
}

/**
 * The scenario the current page renders.
 *
 * @returns The scenario.
 * @throws {Error} When a probe page rendered without a case having set one.
 */
export const probeScenario = (): ProbeScenario => {
  const scenario = window.__moleculeProbe
  if (!scenario) throw new Error('the probe page rendered before a case set its scenario')
  return scenario
}

/**
 * Hands the layout's router to the probe pages.
 *
 * @param router - The router the root layout built.
 */
export const setAppRouter = (router: Router): void => {
  window.__moleculeProbeRouter = router
}

/**
 * The layout's router, for the probe pages.
 *
 * @returns The router.
 * @throws {Error} When a probe page rendered before the layout built the router.
 */
export const appRouter = (): Router => {
  const router = window.__moleculeProbeRouter
  if (!router) throw new Error('the probe page rendered before the layout built the router')
  return router
}
