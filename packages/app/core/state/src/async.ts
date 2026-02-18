/**
 * Async state management utilities.
 *
 * @module
 */

/**
 * Async state tuple.
 */
export interface AsyncState<T> {
  /**
   * Current data value.
   */
  data: T

  /**
   * Whether the state is loading.
   */
  loading: boolean

  /**
   * Error if any occurred.
   */
  error: Error | null
}

/**
 * Async state actions.
 */
export interface AsyncStateActions<T> {
  /**
   * Sets the data value.
   */
  setData(data: T): void

  /**
   * Sets the loading state.
   */
  setLoading(loading: boolean): void

  /**
   * Sets an error.
   */
  setError(error: Error | null): void

  /**
   * Resets to initial state.
   */
  reset(): void

  /**
   * Executes an async operation, handling loading/error states.
   */
  execute<R>(fn: () => Promise<R>): Promise<R>
}

/**
 * Creates an async state container with loading/error tracking.
 *
 * @param initialData - The initial data value.
 * @returns A tuple of `[state, actions]` for reading and updating the async state.
 */
export const createAsyncState = <T>(initialData: T): [AsyncState<T>, AsyncStateActions<T>] => {
  const state: AsyncState<T> = {
    data: initialData,
    loading: false,
    error: null,
  }

  const actions: AsyncStateActions<T> = {
    setData(data: T) {
      state.data = data
    },
    setLoading(loading: boolean) {
      state.loading = loading
    },
    setError(error: Error | null) {
      state.error = error
    },
    reset() {
      state.data = initialData
      state.loading = false
      state.error = null
    },
    async execute<R>(fn: () => Promise<R>): Promise<R> {
      state.loading = true
      state.error = null
      try {
        const result = await fn()
        state.loading = false
        return result
      } catch (err) {
        state.error = err instanceof Error ? err : new Error(String(err))
        state.loading = false
        throw err
      }
    },
  }

  return [state, actions]
}
