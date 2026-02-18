/**
 * Type definitions for Zustand state provider.
 *
 * @module
 */

import type {
  GetState,
  SetState,
  StateListener,
  StateProvider,
  Store,
  StoreConfig,
  StoreMiddleware,
} from '@molecule/app-state'

// Re-export core types
export type {
  GetState,
  SetState,
  StateListener,
  StateProvider,
  Store,
  StoreConfig,
  StoreMiddleware,
}

/**
 * Extended store config for Zustand-specific options.
 */
export interface ZustandStoreConfig<T> extends StoreConfig<T> {
  /**
   * Enable devtools integration.
   */
  devtools?: boolean

  /**
   * Persist options.
   */
  persist?: {
    /**
     * Storage key.
     */
    name: string

    /**
     * Storage to use (defaults to localStorage).
     */
    storage?: Storage

    /**
     * Partialize the state to persist.
     */
    partialize?: (state: T) => Partial<T>
  }
}

/**
 * Store with actions configuration.
 */
export interface StoreWithActionsConfig<T extends object, A extends object> {
  initialState: T
  actions: (set: SetState<T>, get: GetState<T>) => A
  name?: string
  middleware?: StoreMiddleware<T>[]
  devtools?: boolean
  persist?: ZustandStoreConfig<T>['persist']
}

/**
 * Configuration for a Zustand store slice (name, initial state, and action creators).
 */
export interface SliceConfig<T extends object, A extends object> {
  name: string
  initialState: T
  actions: (set: SetState<T>, get: GetState<T>) => A
}

/**
 * A Zustand store slice: a named partition of state with its initial values and action creators.
 */
export interface Slice<T extends object, A extends object> {
  name: string
  initialState: T
  actions: (set: SetState<T>, get: GetState<T>) => A
}
