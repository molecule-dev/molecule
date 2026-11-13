/**
 * `createConsumedSearchParam`: take a one-time credential (a reset `token`, an OAuth
 * `code`) out of the URL and keep it in memory, through any routing bond. Every
 * framework's `useConsumedSearchParam` wraps it in that framework's own reactivity.
 *
 * @module
 */

import { formatLocation } from './history-router.js'
import type { RouteLocation, Router } from './types.js'

/** A consumed query parameter: see {@link createConsumedSearchParam}. */
export interface ConsumedSearchParam {
  /** The consumed value; `''` before the parameter was ever present. */
  get(): string
  /** Replaces the retained value (a form clears it after a successful submit). */
  set(value: string): void
  /** Calls `listener` with the value whenever it changes. */
  subscribe(listener: (value: string) => void): () => void
  /**
   * Starts following the router: consumes the parameter if the URL holds it now, and
   * again whenever a navigation brings a new value. Call it once the component is
   * mounted.
   *
   * @returns A function that stops following the router.
   */
  connect(): () => void
}

/**
 * Consumes the query parameter `name`: its value is kept in memory and the parameter is
 * removed from the address with a replace navigation that keeps the path, the hash, the
 * other query values and the location state. The value survives later query-only
 * navigation, and Back/Forward to an entry restores the value consumed there. A new
 * value arriving on the same mounted route is consumed too.
 *
 * @param router - The app's router.
 * @param name - The query key to consume, for example `token` or `code`.
 * @returns The consumed parameter.
 *
 * @example
 * ```ts
 * const token = createConsumedSearchParam(getRouter(), 'token')
 * const disconnect = token.connect() // on mount
 * submitReset(token.get(), password)
 * ```
 */
export function createConsumedSearchParam(router: Router, name: string): ConsumedSearchParam {
  const listeners = new Set<(value: string) => void>()
  const consumedByEntry = new Map<string, string>()
  let pending: string | undefined
  let value = new URLSearchParams(router.getLocation().search).get(name) ?? ''

  const entryOf = (location: RouteLocation): string => location.key ?? formatLocation(location)

  const update = (next: string): void => {
    if (next === value) return
    value = next
    for (const listener of [...listeners]) listener(value)
  }

  const sync = (location: RouteLocation): void => {
    const params = new URLSearchParams(location.search)
    const entry = entryOf(location)
    if (!params.has(name)) {
      if (pending !== undefined) {
        consumedByEntry.set(entry, pending)
        pending = undefined
      } else if (consumedByEntry.has(entry)) {
        update(consumedByEntry.get(entry) ?? '')
      } else if (value) {
        // Query-only navigation creates a new entry but not a new credential link.
        consumedByEntry.set(entry, value)
      }
      return
    }
    const next = params.get(name) ?? ''
    pending = next
    update(next)
    params.delete(name)
    const search = params.toString()
    void router.navigate(location.pathname + (search ? `?${search}` : '') + location.hash, {
      replace: true,
      state: location.state,
    })
  }

  return {
    get: () => value,
    set(next) {
      consumedByEntry.set(entryOf(router.getLocation()), next)
      update(next)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    connect() {
      const stop = router.subscribe((location) => sync(location))
      sync(router.getLocation())
      return stop
    },
  }
}
