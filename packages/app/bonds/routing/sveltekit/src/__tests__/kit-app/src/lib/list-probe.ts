/**
 * The hand-off the URL-backed list cases make to the test app's list page: the case puts
 * one scenario on `window` BEFORE kit starts (`startKit` resets the module registry, so
 * module state would not survive), and the page reads it at render time and publishes the
 * handle the case reads its state and calls its actions through. Keeping both on `window`
 * is what lets the case's module instance and the started app's fresh one agree on the
 * same objects — including the case's own fetch spy and mutable auth object.
 *
 * @module
 */

import type { ListRouteOptions, ListRouteResult, RouteParams } from '@molecule/app-routing'

/** One collection request, shaped as React's `useQuery` key is (`list-route.integration`). */
export interface ListProbeRequest {
  /** The view the list is on, or `undefined` when no view is declared. */
  selection: string | undefined
  /** The URL filter values, path-backed ones included. */
  filters: Record<string, string | undefined>
  /** The decoded route parameters. */
  params: RouteParams
  /** The page size the request asks for. */
  limit: number
  /** The zero-indexed item offset. */
  offset: number
}

/** A link the case asks the page to render for a view that needs its own parameters. */
export interface ListProbeLink {
  /** The element id, and the case's name for the link. */
  id: string
  /** The declared view the link selects. */
  selection: string
  /** Path parameter values the declaration needs. */
  params?: RouteParams
}

/** Everything a list page renders, as the case declares it. */
export interface ListProbeScenario {
  /** The list options the page resolves on every commit (React's `useListRoute` argument). */
  options: ListRouteOptions<string, string>
  /** Views the page links to with explicit parameters, as a hand-written page does. */
  extraLinks?: ListProbeLink[]
  /** A query key to consume out of the address on mount (React's `useConsumedSearchParam`). */
  token?: string
  /**
   * The collection request, as React's page fetches one: called once per committed request
   * while the list can load, and `undefined` when the case declares no query.
   *
   * @param request - The request the current list resolves to.
   * @returns The data the page renders.
   */
  read?: (request: ListProbeRequest) => Promise<unknown>
}

/** What a case reads and drives on the mounted list page. */
export interface ListProbeHandle {
  /** The list state of the page's current render. */
  list(): ListRouteResult<string, string>
  /** The address the molecule router reads: pathname, query string and hash. */
  url(): string
  /** The location state the molecule router reads. */
  state(): unknown
  /** The value the page's collection request last answered with. */
  data(): unknown
  /** The consumed one-time credential, `''` until it was ever present. */
  token(): string
  /** Re-resolves the list with the scenario's current options, as React's re-render does. */
  rerender(): void
}

declare global {
  interface Window {
    /** The scenario the next started app's list page renders. */
    __moleculeListProbe?: ListProbeScenario
    /** The handle the started app's list page published. */
    __moleculeListProbeHandle?: ListProbeHandle
  }
}

/**
 * Hands the case's scenario to the list page of the next started app.
 *
 * @param scenario - The options, links and request the page renders.
 */
export const setListProbeScenario = (scenario: ListProbeScenario): void => {
  window.__moleculeListProbe = scenario
}

/**
 * The scenario the current list page renders.
 *
 * @returns The scenario.
 * @throws {Error} When a list page rendered without a case having set one.
 */
export const listProbeScenario = (): ListProbeScenario => {
  const scenario = window.__moleculeListProbe
  if (!scenario) throw new Error('the list page rendered before a case set its scenario')
  return scenario
}

/**
 * Publishes the page's handle for the running case.
 *
 * @param handle - The page's readers and its re-render trigger.
 */
export const publishListProbeHandle = (handle: ListProbeHandle): void => {
  window.__moleculeListProbeHandle = handle
}

/**
 * The handle the started app's list page published.
 *
 * @returns The handle.
 * @throws {Error} When no list page has mounted.
 */
export const listProbeHandle = (): ListProbeHandle => {
  const handle = window.__moleculeListProbeHandle
  if (!handle) throw new Error('no list page is mounted')
  return handle
}
