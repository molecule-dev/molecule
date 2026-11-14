/**
 * Warm the cache ahead of a navigation. `prefetchQuery` itself is framework-neutral and lives in
 * `@molecule/app-query`; this module re-exports it and adds the React hook and link handlers.
 *
 * @module
 */

import { useCallback } from 'react'

import type { QueryOptions } from '@molecule/app-query'
import { prefetchQuery } from '@molecule/app-query'

export { prefetchQuery } from '@molecule/app-query'

/**
 * A stable `prefetch(options)` function for event handlers.
 *
 * @returns The prefetch function.
 */
export function usePrefetch(): <T>(options: QueryOptions<T>) => void {
  return useCallback(<T>(options: QueryOptions<T>) => prefetchQuery(options), [])
}

/** The handlers {@link intentPrefetchProps} returns. */
export interface IntentPrefetchProps {
  onPointerEnter: () => void
  onFocus: () => void
  onTouchStart: () => void
}

/**
 * Event handlers that warm a document at the first sign of intent: the
 * pointer arriving, keyboard focus, or a touch starting. Spread them onto a
 * link: `<Link {...intentPrefetchProps(packageQuery(name))} />`.
 *
 * @param options - Key, fetch, freshness.
 * @returns The handlers.
 */
export function intentPrefetchProps<T>(options: QueryOptions<T>): IntentPrefetchProps {
  const go = (): void => prefetchQuery(options)
  return { onPointerEnter: go, onFocus: go, onTouchStart: go }
}
