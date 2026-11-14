/**
 * Warm the cache ahead of a navigation. `prefetchQuery` itself is
 * framework-neutral and lives in `@molecule/app-query`; this module re-exports
 * it and adds the Vue composable and link handlers.
 *
 * @module
 */

import type { QueryOptions } from '@molecule/app-query'
import { prefetchQuery } from '@molecule/app-query'

export { prefetchQuery } from '@molecule/app-query'

/**
 * A stable `prefetch(options)` function for event handlers.
 *
 * @returns The prefetch function, one per mounted composable.
 */
export function usePrefetch(): <T>(options: QueryOptions<T>) => void {
  return <T>(options: QueryOptions<T>): void => {
    prefetchQuery(options)
  }
}

/**
 * The handlers {@link intentPrefetchProps} returns. The names are Vue's
 * listener spellings of pointer enter, focus and touch start, so they spread
 * onto an element rendered with `h()` (or a component that forwards attrs) and
 * attach as real DOM listeners.
 */
export interface IntentPrefetchProps {
  onPointerenter: () => void
  onFocus: () => void
  onTouchstart: () => void
}

/**
 * Event handlers that warm a document at the first sign of intent: the
 * pointer arriving, keyboard focus, or a touch starting. Spread them onto a
 * link: `h('a', { href, ...intentPrefetchProps(packageQuery(name)) }, name)`.
 *
 * @param options - Key, fetch, freshness.
 * @returns The handlers.
 */
export function intentPrefetchProps<T>(options: QueryOptions<T>): IntentPrefetchProps {
  const go = (): void => prefetchQuery(options)
  return { onPointerenter: go, onFocus: go, onTouchstart: go }
}
