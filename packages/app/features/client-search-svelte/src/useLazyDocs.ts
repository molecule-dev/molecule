/**
 * The documents a search runs over: what the page already has, then more
 * once a fuller set has loaded in the background.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { type Readable, writable } from 'svelte/store'

import type { DocumentsInput } from './inputs.js'
import { readValue, toStore } from './store.js'

/**
 * Starts with `initial` (records the page already bundles, so the first
 * keystroke always has something to search) and switches to the result of
 * `load` once it resolves, during idle time. A failed load keeps `initial`
 * and logs at debug level; the page reports nothing.
 *
 * @param initial - The records available at once (or a store of them). Keep the array identity stable.
 * @param load - Loads the fuller set. Called once per `initial`.
 * @returns A store of the current documents.
 */
export function useLazyDocs<T>(
  initial: DocumentsInput<T[]>,
  load: () => Promise<T[]>,
): Readable<T[]> {
  const docs = writable<T[]>(readValue(initial))
  let alive = true
  let idle: number | undefined
  let timer: ReturnType<typeof setTimeout> | undefined

  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    cancelIdleCallback?: (id: number) => void
  }

  /**
   * Shows one document set and starts loading the fuller one.
   *
   * @param next - The records the page already has.
   */
  const start = (next: T[]): void => {
    docs.set(next)
    if (idle !== undefined) w.cancelIdleCallback?.(idle)
    if (timer !== undefined) clearTimeout(timer)
    idle = undefined
    timer = undefined
    const run = (): void => {
      load()
        .then((rich) => {
          if (alive) docs.set(rich)
        })
        .catch((error: unknown) => {
          console.debug('search: the fuller document set did not load', error)
        })
    }
    if (w.requestIdleCallback) idle = w.requestIdleCallback(run, { timeout: 2000 })
    else timer = setTimeout(run, 300)
  }

  // `load` is read once per document set; a new function alone must not refetch.
  const stop = toStore(initial).subscribe(start)
  onDestroy(() => {
    alive = false
    stop()
    if (idle !== undefined) w.cancelIdleCallback?.(idle)
    if (timer !== undefined) clearTimeout(timer)
  })
  return { subscribe: docs.subscribe }
}
