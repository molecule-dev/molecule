/**
 * Responsive hooks (React parity with `@molecule/app-ui-react`).
 *
 * @module
 */

import { DestroyRef, inject, type Signal, signal } from '@angular/core'

/** The fleet-wide responsive breakpoint, as a `matchMedia` query. */
const DESKTOP_QUERY = '(min-width: 768px)'

/**
 * Whether the viewport is at least 768px wide (the fleet's `md` breakpoint).
 *
 * Reads `window.matchMedia` synchronously when the value is created, so the
 * first render is already correct (no mobile-then-desktop swap frame), then
 * follows `change` events. Guarded for non-browser environments (SSR/node):
 * `false` (the mobile shell) when no `window.matchMedia` exists.
 *
 * Must be called in an injection context (a component field initializer or
 * constructor).
 *
 * @param query - Override the media query. Defaults to `(min-width: 768px)`.
 * @returns A signal of whether the desktop shell should mount.
 */
export function useIsDesktop(query: string = DESKTOP_QUERY): Signal<boolean> {
  const value = signal(
    typeof window === 'undefined' || typeof window.matchMedia !== 'function'
      ? false
      : window.matchMedia(query).matches,
  )
  const destroyRef = inject(DestroyRef)
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mediaQuery = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent): void => value.set(event.matches)
    mediaQuery.addEventListener('change', onChange)
    destroyRef.onDestroy(() => mediaQuery.removeEventListener('change', onChange))
  }
  return value.asReadonly()
}
