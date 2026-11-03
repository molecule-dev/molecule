/**
 * A server-backed value that the UI changes at once and saves in order.
 *
 * @module
 */

import { getLogger } from '@molecule/app-logger'

import { shallowEqual } from './utilities.js'

/**
 * Saves one change on the server.
 *
 * @param next - The value to save.
 * @param previous - The value the server held before this change, as far as the client knows.
 * @returns The server's value after the change, or nothing to keep `next`. Reject when the save
 * fails.
 */
export type OptimisticCommit<T> = (next: T, previous: T) => Promise<T | void>

/**
 * Options for {@link createOptimisticValue}.
 */
export interface OptimisticValueOptions<T> {
  /**
   * The server's current value, for example `repository.starred` or
   * `{ starred, stars }` from the record the page loaded.
   */
  value: T

  /**
   * Saves one change (for example `next ? post(...) : delete(...)`). Only one save runs at a time;
   * the next one starts after it settles.
   */
  commit: OptimisticCommit<T>

  /**
   * Whether two values are the same change. Decides whether a save is needed and whether a new
   * server value differs. Defaults to {@link shallowEqual}.
   */
  equals?: (a: T, b: T) => boolean

  /**
   * Called when the newest change fails and the value has gone back to the server's value.
   *
   * @param error - The rejection from {@link OptimisticValueOptions.commit}.
   * @param value - The server's value now shown again.
   */
  onError?: (error: unknown, value: T) => void
}

/**
 * What to render.
 */
export interface OptimisticValueState<T> {
  /** The newest value the person chose, or the server's value when nothing is being saved. */
  value: T

  /** Whether a save is running or waiting to run. */
  pending: boolean

  /** The failure of the newest change, after the value went back; `null` otherwise. */
  error: unknown
}

/**
 * A value that the UI changes at once and saves in order.
 */
export interface OptimisticValue<T> {
  /**
   * The current state. The same object is returned until something changes, so it can be a
   * `useSyncExternalStore` snapshot.
   *
   * @returns The current state.
   */
  getState(): OptimisticValueState<T>

  /**
   * Shows `next` at once and saves it. A change made while a save runs is never dropped: it is
   * saved after that save settles, and only the newest change is saved.
   *
   * @param next - The value the person chose.
   */
  set(next: T): void

  /**
   * Like {@link OptimisticValue.set}, computed from the value shown now, so repeated taps build on
   * each other (`update((on) => !on)`).
   *
   * @param change - Computes the next value from the value shown now.
   */
  update(change: (current: T) => T): void

  /**
   * Takes a newer server value, for example new props after the page refetched. While a save runs,
   * the value shown does not change; the new value is kept as the server's value and is shown if
   * the save fails.
   *
   * @param value - The server's value.
   */
  sync(value: T): void

  /**
   * Observes changes. Does not call the listener for the current state.
   *
   * @param listener - Called with each new state.
   * @returns Stops observing.
   */
  subscribe(listener: (state: OptimisticValueState<T>) => void): () => void

  /**
   * Resolves once nothing is being saved.
   *
   * @returns The state at that moment.
   */
  settled(): Promise<OptimisticValueState<T>>
}

/**
 * Creates a server-backed value that the UI changes at once and saves in order: a favorite,
 * follow, like or bookmark button, a rating, a quantity, a setting switch.
 *
 * A tap while a save runs is never ignored. Saves run one at a time, so the server receives the
 * changes in the order they were made, and when the person changes their mind several times
 * during one save, only the newest value is saved after it. When the newest change fails, the
 * value goes back to the server's value and `error` is set; a failure that a newer change has
 * already replaced is not shown.
 *
 * @param options - The server's current value and how to save a change.
 * @returns The value's controller.
 *
 * @example
 * ```ts
 * import { createOptimisticValue } from '@molecule/app-state'
 *
 * const star = createOptimisticValue({
 *   value: { starred: repository.starred, stars: repository.stars },
 *   equals: (a, b) => a.starred === b.starred,
 *   commit: async (next) => {
 *     const response = next.starred
 *       ? await http.put(`/repositories/${id}/star`)
 *       : await http.delete(`/repositories/${id}/star`)
 *     return { starred: response.data.starred, stars: response.data.stars }
 *   },
 * })
 *
 * star.update((current) => ({
 *   starred: !current.starred,
 *   stars: current.stars + (current.starred ? -1 : 1),
 * }))
 * ```
 */
export const createOptimisticValue = <T>(
  options: OptimisticValueOptions<T>,
): OptimisticValue<T> => {
  const equals = options.equals ?? shallowEqual
  const listeners = new Set<(state: OptimisticValueState<T>) => void>()
  let waiters: Array<(state: OptimisticValueState<T>) => void> = []
  let confirmed = options.value
  let desired = options.value
  let intent = 0
  let running = false
  let state: OptimisticValueState<T> = { value: options.value, pending: false, error: null }

  const publish = (next: OptimisticValueState<T>): void => {
    if (
      Object.is(next.value, state.value) &&
      next.pending === state.pending &&
      Object.is(next.error, state.error)
    )
      return
    state = next
    for (const listener of [...listeners]) listener(state)
    if (!state.pending) {
      const settledWaiters = waiters
      waiters = []
      for (const resolve of settledWaiters) resolve(state)
    }
  }

  const run = async (): Promise<void> => {
    running = true
    let failure: { error: unknown } | null = null
    for (;;) {
      const sent = desired
      const sentIntent = intent
      try {
        const result = await options.commit(sent, confirmed)
        confirmed = result === undefined ? sent : result
        if (sentIntent === intent || equals(desired, confirmed)) {
          desired = confirmed
          break
        }
      } catch (error) {
        if (sentIntent === intent || equals(desired, confirmed)) {
          desired = confirmed
          failure = { error }
          break
        }
        // A newer change replaced this one; it is saved next and reports its own outcome.
        getLogger('state').debug('optimistic value: a replaced change failed to save', { error })
      }
    }
    running = false
    publish({ value: desired, pending: false, error: failure ? failure.error : null })
    if (failure) options.onError?.(failure.error, confirmed)
  }

  const set = (next: T): void => {
    intent += 1
    desired = next
    if (!running && equals(next, confirmed)) {
      desired = confirmed
      publish({ value: confirmed, pending: false, error: null })
      return
    }
    publish({ value: next, pending: true, error: null })
    if (!running) void run()
  }

  return {
    getState: () => state,
    set,
    update: (change) => set(change(desired)),
    sync(value) {
      confirmed = value
      if (running) return
      desired = value
      publish({ value, pending: false, error: state.error })
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    settled: () =>
      state.pending
        ? new Promise<OptimisticValueState<T>>((resolve) => waiters.push(resolve))
        : Promise.resolve(state),
  }
}
