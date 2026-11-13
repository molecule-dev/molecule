/**
 * Framework-level hooks exported by the Svelte UI package, matching the React
 * package's hook exports one for one.
 *
 * @module
 */

import { type Readable, readable } from 'svelte/store'

/** The fleet-wide responsive breakpoint, as a `matchMedia` query. */
const DESKTOP_QUERY = '(min-width: 768px)'

/**
 * A store of whether the viewport is at least 768px wide (the fleet's `md`
 * breakpoint). Reads `window.matchMedia` synchronously on creation so the first
 * render is already correct, then follows `change` events. Non-browser
 * environments (SSR/node) resolve to `false` (the mobile shell).
 *
 * Call during component initialization, like any context/store hook.
 *
 * @param query - Override the media query. Defaults to `(min-width: 768px)`.
 * @returns A readable store of whether the desktop layout should mount.
 */
export function useIsDesktop(query: string = DESKTOP_QUERY): Readable<boolean> {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return readable(false)
  }
  const mq = window.matchMedia(query)
  return readable(mq.matches, (set) => {
    const onChange = (event: MediaQueryListEvent): void => set(event.matches)
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  })
}
