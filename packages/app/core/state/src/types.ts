/**
 * Type definitions for client state management.
 *
 * @module
 */

/**
 * Configuration for creating a store (initial state, optional name, and middleware chain).
 */
export interface StoreConfig<T> {
  /**
   * Initial state value.
   */
  initialState: T

  /**
   * Optional name for debugging.
   */
  name?: string

  /**
   * Optional middleware functions.
   */
  middleware?: StoreMiddleware<T>[]
}

/**
 * Store middleware function. Wraps the `set` function to intercept
 * state updates (e.g. for logging, persistence, or devtools).
 *
 * @param set - The original setState function to wrap.
 * @param get - A function returning the current state.
 */
export type StoreMiddleware<T> = (set: SetState<T>, get: GetState<T>) => SetState<T>

/**
 * Function to update store state with a partial object or updater function.
 */
export type SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => void

/**
 * Get state function type.
 */
export type GetState<T> = () => T

/**
 * Callback invoked whenever store state changes.
 *
 * @param state - The new state after the update.
 * @param prevState - The state before the update.
 */
export type StateListener<T> = (state: T, prevState: T) => void

/**
 * Reactive state container with getState, setState, subscribe, and destroy.
 *
 * All state management providers must implement this interface.
 */
export interface Store<T> {
  /**
   * Gets the current state.
   */
  getState(): T

  /**
   * Sets the state (partial or via updater function).
   */
  setState(partial: Partial<T> | ((state: T) => Partial<T>)): void

  /**
   * Subscribes to state changes.
   * Returns an unsubscribe function.
   */
  subscribe(listener: StateListener<T>): () => void

  /**
   * Destroys the store and cleans up subscriptions.
   */
  destroy(): void
}

/**
 * State provider interface that all state management bond packages
 * must implement. Provides the store creation factory.
 */
export interface StateProvider {
  /**
   * Creates a new store.
   */
  createStore<T>(config: StoreConfig<T>): Store<T>
}

/**
 * Selector function that derives a value from store state.
 *
 * @param state - The full store state to select from.
 */
export type Selector<T, S> = (state: T) => S

/**
 * Equality comparator for selectors. When provided, prevents
 * re-renders if the selected value is equal to the previous one.
 */
export type EqualityFn<T> = (a: T, b: T) => boolean
