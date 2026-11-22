/**
 * Viewport + pointer media-query hooks for touch/phone-aware rendering — the
 * Svelte counterparts of `@molecule/app-ide-react`'s viewport hooks.
 *
 * The IDE components style themselves with inline values (per the ClassMap
 * rule there are no stylesheets in this package), so responsive behavior is
 * expressed by branching on these hooks rather than `@media` rules. Consumers
 * (e.g. molecule.dev's Workspace) keep their own breakpoint in sync with
 * `NARROW_VIEWPORT_QUERY`'s 768px threshold (from `@molecule/app-ide-panel-logic`).
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { get, type Readable, readable, readonly, writable } from 'svelte/store'

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
 * Whether a hook argument is a Svelte readable store.
 *
 * @param value - A hook argument: a plain value or a store.
 * @returns True for a readable store.
 */
function isStore(value: string | Readable<string>): value is Readable<string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { subscribe?: unknown }).subscribe === 'function'
  )
}

/**
 * The readable-store view of a hook argument: the store itself when it is one,
 * a constant store of the plain value otherwise.
 *
 * @param value - A plain value or a store of one.
 * @returns A readable store of the value.
 */
function toStore(value: string | Readable<string>): Readable<string> {
  return isStore(value) ? value : readable(value)
}

/**
 * Subscribes to a CSS media query. SSR-safe: reports `false` until mounted in
 * a browser. Call it during component init (a component's `<script>` or a
 * `.svelte.ts` module's init), where Svelte's lifecycle works. Pass the query
 * as a readable store when it can change: the new query is read at once and
 * followed instead of the old one on the same mount — the Svelte counterpart
 * of React re-rendering the hook with a new query.
 *
 * @param query - A media query string, e.g. `'(max-width: 767px)'`, or a store
 *   of one.
 * @returns A readable store of whether the query currently matches.
 */
export function useMediaQueryMatch(query: string | Readable<string>): Readable<boolean> {
  const supported = mediaSupported()
  const source = toStore(query)
  const matches = writable(supported ? window.matchMedia(get(source)).matches : false)

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
      matches.set(e.matches)
    }
    matches.set(mql.matches)
    mql.addEventListener('change', onChange)
    remove = () => mql.removeEventListener('change', onChange)
  }

  // A store's subscribe calls back at once, so this is also the mount read; a
  // store change re-applies on the same mount.
  const stop = source.subscribe(apply)
  onDestroy(() => {
    stop()
    teardown()
  })
  return readonly(matches)
}

/**
 * Whether the viewport is phone-width (below 768px). Use for layout-density
 * decisions: bigger type, taller rows, `dvh`-capped popovers.
 * @returns A readable store that is true on phone-width viewports.
 */
export function useNarrowViewport(): Readable<boolean> {
  return useMediaQueryMatch(NARROW_VIEWPORT_QUERY)
}

/**
 * Whether the primary pointer is coarse (touch). Use for interaction
 * decisions: ≥44px touch targets, always-visible controls that desktop
 * reveals on hover (hover does not exist on touch).
 * @returns A readable store that is true on touch-first devices.
 */
export function useCoarsePointer(): Readable<boolean> {
  return useMediaQueryMatch(COARSE_POINTER_QUERY)
}
