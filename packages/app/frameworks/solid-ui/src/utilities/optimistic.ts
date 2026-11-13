/**
 * A server-backed value that the UI changes at once and saves in order.
 *
 * This is the Solid lifecycle-free half of `@molecule/app-state`'s
 * `createOptimisticValue` (the React binding's `useOptimisticValue` sits on
 * the same controller). It lives here because this package may not depend on
 * `@molecule/app-state` (its peers are the UI contracts only), and the UI
 * components that need it — `OptimisticToggleButton` today — must keep the
 * exact optimistic ordering semantics: one save at a time, in order, with the
 * newest failure rolling back to the last server-confirmed value.
 *
 * @module
 */

/**
 * Saves one change on the server.
 *
 * @param next - The value to save.
 * @param previous - The value the server held before this change.
 * @returns The server's value after the change, or nothing to keep `next`.
 */
export type OptimisticCommit<T> = (next: T, previous: T) => Promise<T | void>

/**
 * Options for {@link createOptimisticValue}.
 *
 * @template T - The value type.
 */
export interface OptimisticValueOptions<T> {
  /** The server's current value. */
  value: T
  /** Saves one change; only one save runs at a time. */
  commit: OptimisticCommit<T>
  /** Whether two values are the same change. Defaults to `Object.is`. */
  equals?: (a: T, b: T) => boolean
  /** Called when the newest change fails, after the value went back. */
  onError?: (error: unknown, value: T) => void
}

/**
 * What to render.
 *
 * @template T - The value type.
 */
export interface OptimisticValueState<T> {
  /** The newest value the person chose, or the server's value when nothing is saving. */
  value: T
  /** Whether a save is running or waiting to run. */
  pending: boolean
  /** The failure of the newest change, after the value went back; `null` otherwise. */
  error: unknown
}

/**
 * The optimistic value's controller.
 *
 * @template T - The value type.
 */
export interface OptimisticValue<T> {
  /**
   * The current state. The same object is returned until something changes.
   *
   * @returns The current state.
   */
  getState(): OptimisticValueState<T>

  /**
   * Shows `next` at once and saves it.
   *
   * @param next - The value the person chose.
   */
  set(next: T): void

  /**
   * Like {@link OptimisticValue.set}, computed from the value shown now.
   *
   * @param change - Computes the next value from the value shown now.
   */
  update(change: (current: T) => T): void

  /**
   * Takes a newer server value; while a save runs the shown value is kept.
   *
   * @param value - The server's value.
   */
  sync(value: T): void

  /**
   * Observes changes (not called for the current state).
   *
   * @param listener - Called with each new state.
   * @returns Stops observing.
   */
  subscribe(listener: (state: OptimisticValueState<T>) => void): () => void
}

/**
 * Creates a server-backed value that changes immediately and is saved one
 * change at a time, in order.
 *
 * @template T - The value type.
 * @param options - The server's current value and how to save a change.
 * @returns The value's controller.
 */
export function createOptimisticValue<T>(options: OptimisticValueOptions<T>): OptimisticValue<T> {
  const equals = options.equals ?? Object.is
  const listeners = new Set<(state: OptimisticValueState<T>) => void>()
  let confirmed = options.value
  let desired = options.value
  let intent = 0
  let running = false
  let state: OptimisticValueState<T> = { value: options.value, pending: false, error: null }

  /**
   * Publishes a new state to every listener.
   *
   * @param next - The new state.
   */
  const publish = (next: OptimisticValueState<T>): void => {
    if (
      Object.is(next.value, state.value) &&
      next.pending === state.pending &&
      Object.is(next.error, state.error)
    )
      return
    state = next
    for (const listener of [...listeners]) listener(state)
  }

  /**
   * Saves the desired value, one change at a time, until it matches the
   * server-confirmed value.
   *
   * @returns A promise resolving when nothing is left to save.
   */
  const run = async (): Promise<void> => {
    running = true
    let failure: { error: unknown } | null = null
    for (;;) {
      const sent = desired
      const sentIntent = intent
      publish({ value: sent, pending: true, error: null })
      try {
        const result = await options.commit(sent, confirmed)
        confirmed = result === undefined ? sent : result
        if (sentIntent === intent || equals(desired, confirmed)) {
          desired = confirmed
          break
        }
      } catch (error) {
        if (sentIntent === intent) {
          desired = confirmed
          failure = { error }
          break
        }
        // A newer change replaced this one; only its own outcome is shown.
        if (equals(desired, confirmed)) {
          desired = confirmed
          break
        }
      }
    }
    running = false
    publish({ value: desired, pending: false, error: failure ? failure.error : null })
    if (failure) options.onError?.(failure.error, confirmed)
  }

  /**
   * Shows a value at once and queues its save.
   *
   * @param next - The value the person chose.
   */
  const set = (next: T): void => {
    intent += 1
    desired = next
    if (!running && equals(next, confirmed)) {
      desired = confirmed
      publish({ value: confirmed, pending: false, error: null })
      return
    }
    if (running) publish({ value: next, pending: true, error: null })
    else void run()
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
  }
}
