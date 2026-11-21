/**
 * The documents a search runs over: what the page already has, then more
 * once a fuller set has loaded in the background.
 *
 * @module
 */

import { type Accessor, createEffect, createSignal, on, onCleanup } from 'solid-js'

import { readValue } from './accessor.js'
import type { DocumentsInput } from './inputs.js'

/**
 * Starts with `initial` (records the page already bundles, so the first
 * keystroke always has something to search) and switches to the result of
 * `load` once it resolves, during idle time. A failed load keeps `initial`
 * and logs at debug level; the page reports nothing.
 *
 * @param initial - The records available at once (or an accessor of them). Keep the array identity stable.
 * @param load - Loads the fuller set. Called once per `initial`.
 * @returns An accessor of the current documents.
 */
export function useLazyDocs<T>(
  initial: DocumentsInput<T>,
  load: () => Promise<T[]>,
): Accessor<T[]> {
  const [docs, setDocs] = createSignal<T[]>(readValue(initial))
  createEffect(
    on(
      () => readValue(initial),
      (next) => {
        setDocs(() => next)
        let alive = true
        let idle: number | undefined
        let timer: ReturnType<typeof setTimeout> | undefined
        const run = (): void => {
          load()
            .then((rich) => {
              if (alive) setDocs(() => rich)
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
        onCleanup(() => {
          alive = false
          if (idle !== undefined) w.cancelIdleCallback?.(idle)
          if (timer !== undefined) clearTimeout(timer)
        })
      },
      // `load` is read once per document set; a new function alone must not refetch.
      { defer: false },
    ),
  )
  return docs
}
