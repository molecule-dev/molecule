/**
 * Type definitions for Jotai state provider.
 *
 * @module
 */

import type { Atom, createStore as createJotaiStore, PrimitiveAtom } from 'jotai/vanilla'

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

// Re-export Jotai types
export type { Atom, PrimitiveAtom }

/**
 * Jotai store type.
 */
export type JotaiStore = ReturnType<typeof createJotaiStore>

/**
 * Extended store config for Jotai-specific options.
 */
export interface JotaiStoreConfig<T> extends StoreConfig<T> {
  /**
   * External Jotai store to use.
   */
  jotaiStore?: JotaiStore
}

/**
 * Atom with accessor functions.
 */
export interface AtomWithAccessors<T> {
  atom: PrimitiveAtom<T>
  get: (store: JotaiStore) => T
  set: (store: JotaiStore, value: T | ((prev: T) => T)) => void
}
