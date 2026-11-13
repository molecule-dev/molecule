/**
 * Optimistic-value controller — a faithful local port of
 * `@molecule/app-state`'s `createOptimisticValue`, used by
 * `OptimisticToggleButton` (React reaches it through `useOptimisticValue`).
 * Local so this package adds no `@molecule/app-state` dependency; the two
 * must stay behaviorally identical.
 *
 * @module
 */

/** What a commit reports back. */
export type OptimisticCommit<T> = (
  next: T,
  previous: T,
  confirm: (change: (current: T) => T) => void,
) => Promise<T | void>

/** Options for {@link createOptimisticValue}. */
export interface OptimisticValueOptions<T> {
  /** The loaded server value. */
  value: T
  /** Saves the desired value; resolve with the confirmed value. */
  commit: OptimisticCommit<T>
  /** Equality override (defaults to {@link shallowEqual}). */
  equals?: (a: T, b: T) => boolean
  /** Called with a failed save after rollback. */
  onError?: (error: unknown, value: T) => void
}

/** The externally visible state. */
export interface OptimisticValueState<T> {
  /** The value to render. */
  value: T
  /** Whether a save is in flight. */
  pending: boolean
  /** The newest failure, when the newest save failed. */
  error: unknown
}

/** The controller. */
export interface OptimisticValue<T> {
  /**
   * Gets the current state.
   * @returns The state snapshot.
   */
  getState(): OptimisticValueState<T>
  /**
   * Sets the desired value (starts or queues a save).
   * @param next - The desired value.
   */
  set(next: T): void
  /**
   * Updates the desired value from the current desired one.
   * @param change - Maps current to next.
   */
  update(change: (current: T) => T): void
  /**
   * Syncs a newer server value.
   * @param value - The confirmed server value.
   */
  sync(value: T): void
  /**
   * Subscribes to state changes.
   * @param listener - Called on every publish.
   * @returns Unsubscribe.
   */
  subscribe(listener: (state: OptimisticValueState<T>) => void): () => void
  /**
   * Resolves when the current save settles.
   * @returns The settled state.
   */
  settled(): Promise<OptimisticValueState<T>>
}

/**
 * Shallow equality (React's `@molecule/app-state` semantics).
 *
 * @param a - One value.
 * @param b - The other value.
 * @returns Whether the values are shallowly equal.
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false
  const ka = Object.keys(a as Record<string, unknown>)
  const kb = Object.keys(b as Record<string, unknown>)
  if (ka.length !== kb.length) return false
  for (const key of ka) {
    if (!Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
      return false
  }
  return true
}

/**
 * Creates the optimistic-value controller.
 *
 * @param options - Initial value, commit and callbacks.
 * @returns The controller.
 */
export function createOptimisticValue<T>(options: OptimisticValueOptions<T>): OptimisticValue<T> {
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
    for (const listener of [...listeners]) {
      try {
        listener(state)
      } catch (error) {
        // This package cannot depend on @molecule/app-logger; the state
        // listener contract still requires the failure to be visible.
        console.error('optimistic value: a state listener threw', { error })
      }
    }
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
      publish({ value: sent, pending: true, error: null })
      let acceptingProgress = true
      let hasProgress = false
      const confirm = (change: (current: T) => T): void => {
        if (!acceptingProgress) return
        confirmed = change(confirmed)
        hasProgress = true
      }
      try {
        const result = await options.commit(sent, confirmed, confirm)
        acceptingProgress = false
        confirmed = result === undefined ? (hasProgress ? confirmed : sent) : result
        if (sentIntent === intent || equals(desired, confirmed)) {
          desired = confirmed
          break
        }
      } catch (error) {
        acceptingProgress = false
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
    if (failure) {
      try {
        options.onError?.(failure.error, confirmed)
      } catch (error) {
        console.error('optimistic value: onError threw', { error })
      }
    }
  }

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
    settled: () =>
      state.pending
        ? new Promise<OptimisticValueState<T>>((resolve) => waiters.push(resolve))
        : Promise.resolve(state),
  }
}
