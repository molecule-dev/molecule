/**
 * Viewport + pointer media-query hooks for touch/phone-aware rendering.
 *
 * The IDE components style themselves with inline values (per the ClassMap
 * rule there are no stylesheets in this package), so responsive behavior is
 * expressed by branching on these hooks rather than `@media` rules. Consumers
 * (e.g. molecule.dev's Workspace) keep their own breakpoint in sync with
 * `NARROW_VIEWPORT_QUERY`'s 768px threshold (from `@molecule/app-ide-panel-logic`).
 *
 * @module
 */

import { useCallback, useSyncExternalStore } from 'react'

import { COARSE_POINTER_QUERY, NARROW_VIEWPORT_QUERY } from '@molecule/app-ide-panel-logic'

/**
 * Whether a media query currently matches, read straight from the browser.
 * @param query - The media query to evaluate.
 * @returns True when the query matches; false without a browser (SSR).
 */
function queryMatches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false
}

/**
 * Subscribes to a CSS media query. SSR-safe: a server render (and the hydration
 * pass that follows it) reports `false`; a client-only render reads the query
 * on its first render.
 * @param query - A media query string, e.g. `'(max-width: 767px)'`.
 * @returns Whether the query currently matches.
 */
export function useMediaQueryMatch(query: string): boolean {
  // The media query is an external store whose snapshot is its `matches` flag:
  // `useSyncExternalStore` reads it during render (so the first paint is right
  // and a `query` change re-reads it in that same render) and re-renders from
  // the `change` listener, with no setState of its own.
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => {}
      }
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => queryMatches(query),
    () => false,
  )
}

/**
 * Whether the viewport is phone-width (below 768px). Use for layout-density
 * decisions: bigger type, taller rows, `dvh`-capped popovers.
 * @returns True on phone-width viewports.
 */
export function useNarrowViewport(): boolean {
  return useMediaQueryMatch(NARROW_VIEWPORT_QUERY)
}

/**
 * Whether the primary pointer is coarse (touch). Use for interaction
 * decisions: ≥44px touch targets, always-visible controls that desktop
 * reveals on hover (hover does not exist on touch).
 * @returns True on touch-first devices.
 */
export function useCoarsePointer(): boolean {
  return useMediaQueryMatch(COARSE_POINTER_QUERY)
}
