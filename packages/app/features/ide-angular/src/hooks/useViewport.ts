/**
 * Viewport + pointer media-query hooks for touch/phone-aware rendering — the
 * Angular counterparts of `@molecule/app-ide-react`'s viewport hooks.
 *
 * The IDE components style themselves with inline values (per the ClassMap
 * rule there are no stylesheets in this package), so responsive behavior is
 * expressed by branching on these hooks rather than `@media` rules. Consumers
 * (e.g. molecule.dev's Workspace) keep their own breakpoint in sync with
 * `NARROW_VIEWPORT_QUERY`'s 768px threshold (from `@molecule/app-ide-panel-logic`).
 *
 * @module
 */

import { DestroyRef, effect, inject, isSignal, type Signal, signal, untracked } from '@angular/core'

import { COARSE_POINTER_QUERY, NARROW_VIEWPORT_QUERY } from '@molecule/app-ide-panel-logic'

/**
 * Whether media queries can be evaluated here: a browser with `matchMedia`.
 * Read per call (React's hook checks per render too), so a test page that
 * installs `matchMedia` after this module loads is still followed.
 *
 * @returns True when `window.matchMedia` is callable.
 */
const mediaSupported = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'

/**
 * Subscribes to a CSS media query. SSR-safe: reports `false` until mounted in
 * a browser. Call it in an injection context (a component field initializer or
 * constructor), the way an app calls Angular's injection-based APIs. Pass the
 * query as a signal when it can change: the new query is read at once and
 * followed instead of the old one on the same host — the Angular counterpart
 * of React re-rendering the hook with a new query.
 *
 * @param query - A media query string, e.g. `'(max-width: 767px)'`, or a
 *   signal of one.
 * @returns A signal of whether the query currently matches.
 */
export function useMediaQueryMatch(query: string | Signal<string>): Signal<boolean> {
  const supported = mediaSupported()
  const matches = signal(
    supported ? window.matchMedia(isSignal(query) ? query() : query).matches : false,
  )

  let remove: (() => void) | null = null
  let applied: string | null = null

  /** Tears the current query subscription down (idempotent). */
  const teardown = (): void => {
    remove?.()
    remove = null
  }

  /**
   * Subscribes to one resolved query, reading its match state at once. A query
   * equal to the applied one is skipped, the way React skips an effect whose
   * dependencies did not change.
   * @param value - The query to follow.
   */
  const apply = (value: string): void => {
    if (value === applied) return
    applied = value
    teardown()
    if (!supported) return
    const mql = window.matchMedia(value)

    /**
     * Applies the query's new match state.
     * @param e - The media query's change event.
     */
    const onChange = (e: MediaQueryListEvent): void => {
      matches.set(e.matches)
    }
    matches.set(mql.matches)
    mql.addEventListener('change', onChange)
    remove = () => mql.removeEventListener('change', onChange)
  }

  // The first subscription happens in the injection context, like React's
  // first effect run once the mount settles; a signal change re-applies on
  // the same host.
  apply(isSignal(query) ? query() : query)
  if (isSignal(query)) {
    effect(() => {
      const value = query()
      untracked(() => apply(value))
    })
  }
  inject(DestroyRef).onDestroy(teardown)
  return matches
}

/**
 * Whether the viewport is phone-width (below 768px). Use for layout-density
 * decisions: bigger type, taller rows, `dvh`-capped popovers.
 * @returns A signal that is true on phone-width viewports.
 */
export function useNarrowViewport(): Signal<boolean> {
  return useMediaQueryMatch(NARROW_VIEWPORT_QUERY)
}

/**
 * Whether the primary pointer is coarse (touch). Use for interaction
 * decisions: ≥44px touch targets, always-visible controls that desktop
 * reveals on hover (hover does not exist on touch).
 * @returns A signal that is true on touch-first devices.
 */
export function useCoarsePointer(): Signal<boolean> {
  return useMediaQueryMatch(COARSE_POINTER_QUERY)
}
