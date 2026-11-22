/**
 * Viewport + pointer media-query hooks for touch/phone-aware rendering — the
 * Solid counterparts of `@molecule/app-ide-react`'s viewport hooks.
 *
 * The IDE components style themselves with inline values (per the ClassMap
 * rule there are no stylesheets in this package), so responsive behavior is
 * expressed by branching on these hooks rather than `@media` rules. Consumers
 * (e.g. molecule.dev's Workspace) keep their own breakpoint in sync with
 * `NARROW_VIEWPORT_QUERY`'s 768px threshold (from `@molecule/app-ide-panel-logic`).
 *
 * @module
 */

import { type Accessor, createEffect, createSignal, onCleanup, untrack } from 'solid-js'

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
 * Reads the query argument as its current value: a plain value as it is, an
 * accessor by calling it.
 *
 * @param value - The query, or an accessor of it.
 * @returns The current query.
 */
const read = (value: string | Accessor<string>): string =>
  typeof value === 'function' ? value() : value

/**
 * Subscribes to a CSS media query. SSR-safe: reports `false` until mounted in
 * a browser. A component body runs once in Solid, so pass the query as an
 * accessor when it can change (`() => props.query`): the new query is read at
 * once and followed instead of the old one on the same mount — the Solid
 * counterpart of React re-rendering the hook with a new query.
 *
 * @param query - A media query string, e.g. `'(max-width: 767px)'`, or an
 *   accessor of one.
 * @returns An accessor of whether the query currently matches.
 */
export function useMediaQueryMatch(query: string | Accessor<string>): Accessor<boolean> {
  const supported = mediaSupported()
  const [matches, setMatches] = createSignal(
    supported ? window.matchMedia(untrack(() => read(query))).matches : false,
  )

  let remove: (() => void) | null = null

  /** Tears the current query subscription down (idempotent). */
  const teardown = (): void => {
    remove?.()
    remove = null
  }

  /**
   * Subscribes to one resolved query, reading its match state at once.
   * @param value - The query to follow.
   */
  const apply = (value: string): void => {
    teardown()
    if (!supported) return
    const mql = window.matchMedia(value)

    /**
     * Applies the query's new match state.
     * @param e - The media query's change event.
     */
    const onChange = (e: MediaQueryListEvent): void => {
      setMatches(e.matches)
    }
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    remove = () => mql.removeEventListener('change', onChange)
  }

  // The first subscription happens in the component body, like React's first
  // effect run once the mount settles; a later accessor change re-applies on
  // the same mount.
  apply(untrack(() => read(query)))
  createEffect(
    () => {
      apply(read(query))
    },
    { defer: true },
  )
  onCleanup(teardown)
  return matches
}

/**
 * Whether the viewport is phone-width (below 768px). Use for layout-density
 * decisions: bigger type, taller rows, `dvh`-capped popovers.
 * @returns An accessor that is true on phone-width viewports.
 */
export function useNarrowViewport(): Accessor<boolean> {
  return useMediaQueryMatch(NARROW_VIEWPORT_QUERY)
}

/**
 * Whether the primary pointer is coarse (touch). Use for interaction
 * decisions: ≥44px touch targets, always-visible controls that desktop
 * reveals on hover (hover does not exist on touch).
 * @returns An accessor that is true on touch-first devices.
 */
export function useCoarsePointer(): Accessor<boolean> {
  return useMediaQueryMatch(COARSE_POINTER_QUERY)
}
