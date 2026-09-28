/**
 * Warm the cache ahead of a navigation.
 *
 * @module
 */

import { useCallback } from 'react'

import type { QueryOptions } from '@molecule/app-query'
import { getQueryClient, shouldPrefetch } from '@molecule/app-query'

/**
 * Warms the cache for a document, when the connection can afford it (see
 * `shouldPrefetch()` in the core). Safe to call repeatedly: a fresh or
 * in-flight document is skipped, and failures are swallowed.
 *
 * @param options - Key, fetch, freshness.
 */
export function prefetchQuery<T>(options: QueryOptions<T>): void {
  if (!shouldPrefetch()) return
  getQueryClient().prefetch(options)
}

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
