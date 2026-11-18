/**
 * The documents a search runs over: what the page already has, then more
 * once a fuller set has loaded in the background.
 *
 * @module
 */

import { useEffect, useState } from 'react'

import { useEffectEvent } from '@molecule/app-react/render'

/**
 * Starts with `initial` (records the page already bundles, so the first
 * keystroke always has something to search) and switches to the result of
 * `load` once it resolves, during idle time. A failed load keeps `initial`
 * and logs at debug level; the page reports nothing.
 *
 * @param initial - The records available at once. Keep the array identity stable.
 * @param load - Loads the fuller set. Called once per `initial`.
 * @returns The current documents.
 */
export function useLazyDocs<T>(initial: T[], load: () => Promise<T[]>): T[] {
  // The fuller set, with the `initial` it was loaded for: a new `initial` shows
  // at once, and an older load never replaces it.
  const [loaded, setLoaded] = useState<{ initial: T[]; docs: T[] } | null>(null)
  // `load` is read once per document set; a new function alone must not refetch.
  const loadDocs = useEffectEvent(load)
  useEffect(() => {
    let alive = true
    let idle: number | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const run = (): void => {
      loadDocs()
        .then((rich) => {
          if (alive) setLoaded({ initial, docs: rich })
        })
        .catch((error: unknown) => {
          console.debug('search: the fuller document set did not load', error)
        })
    }
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (w.requestIdleCallback) idle = w.requestIdleCallback(run, { timeout: 2000 })
    else timer = setTimeout(run, 300)
    return () => {
      alive = false
      if (idle !== undefined) w.cancelIdleCallback?.(idle)
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [initial])
  return loaded?.initial === initial ? loaded.docs : initial
}
