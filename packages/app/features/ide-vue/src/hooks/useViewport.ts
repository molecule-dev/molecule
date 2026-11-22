/**
 * Viewport + pointer media-query hooks for touch/phone-aware rendering — the
 * Vue counterparts of `@molecule/app-ide-react`'s viewport hooks.
 *
 * The IDE components style themselves with inline values (per the ClassMap
 * rule there are no stylesheets in this package), so responsive behavior is
 * expressed by branching on these hooks rather than `@media` rules. Consumers
 * (e.g. molecule.dev's Workspace) keep their own breakpoint in sync with
 * `NARROW_VIEWPORT_QUERY`'s 768px threshold (from `@molecule/app-ide-panel-logic`).
 *
 * @module
 */

import {
  getCurrentScope,
  type MaybeRefOrGetter,
  onScopeDispose,
  type Ref,
  ref,
  toValue,
  watch,
} from 'vue'

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
 * a browser. Pass the query as a ref or getter to follow a change on the same
 * mount — the new query is read at once and followed instead of the old one —
 * the Vue counterpart of React re-rendering the hook with a new query.
 *
 * @param query - A media query string, e.g. `'(max-width: 767px)'`, or a
 *   ref/getter of one.
 * @returns A ref of whether the query currently matches.
 */
export function useMediaQueryMatch(query: string | MaybeRefOrGetter<string>): Ref<boolean> {
  const supported = mediaSupported()
  const matches = ref(supported ? window.matchMedia(toValue(query)).matches : false)

  let remove: (() => void) | null = null

  /** Tears the current query subscription down (idempotent). */
  const teardown = (): void => {
    remove?.()
    remove = null
  }

  watch(
    () => toValue(query),
    (value) => {
      teardown()
      if (!supported) return
      const mql = window.matchMedia(value)

      /**
       * Applies the query's new match state.
       * @param e - The media query's change event.
       */
      const onChange = (e: MediaQueryListEvent): void => {
        matches.value = e.matches
      }
      matches.value = mql.matches
      mql.addEventListener('change', onChange)
      remove = () => mql.removeEventListener('change', onChange)
    },
    { immediate: true },
  )
  if (getCurrentScope()) onScopeDispose(teardown)
  return matches
}

/**
 * Whether the viewport is phone-width (below 768px). Use for layout-density
 * decisions: bigger type, taller rows, `dvh`-capped popovers.
 * @returns A ref that is true on phone-width viewports.
 */
export function useNarrowViewport(): Ref<boolean> {
  return useMediaQueryMatch(NARROW_VIEWPORT_QUERY)
}

/**
 * Whether the primary pointer is coarse (touch). Use for interaction
 * decisions: ≥44px touch targets, always-visible controls that desktop
 * reveals on hover (hover does not exist on touch).
 * @returns A ref that is true on touch-first devices.
 */
export function useCoarsePointer(): Ref<boolean> {
  return useMediaQueryMatch(COARSE_POINTER_QUERY)
}
