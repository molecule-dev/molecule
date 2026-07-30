/**
 * Viewport + pointer media-query hooks for touch/phone-aware rendering.
 *
 * The IDE components style themselves with inline values (per the ClassMap
 * rule there are no stylesheets in this package), so responsive behavior is
 * expressed by branching on these hooks rather than `@media` rules. Consumers
 * (e.g. molecule.dev's Workspace) keep their own breakpoint in sync with
 * {@link NARROW_VIEWPORT_QUERY}'s 768px threshold.
 *
 * @module
 */

import { useEffect, useState } from 'react'

/**
 * The phone-width media query — matches viewports below 768px, mirroring the
 * host workspace's single-pane mobile breakpoint.
 */
export const NARROW_VIEWPORT_QUERY = '(max-width: 767px)'

/**
 * The touch-first media query — matches when the PRIMARY pointer is coarse
 * (finger), i.e. phones/tablets, regardless of viewport width.
 */
export const COARSE_POINTER_QUERY = '(pointer: coarse)'

/**
 * Subscribes to a CSS media query. SSR-safe: reports `false` until mounted in
 * a browser.
 * @param query - A media query string, e.g. `'(max-width: 767px)'`.
 * @returns Whether the query currently matches.
 */
export function useMediaQueryMatch(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  )
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent): void => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
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
