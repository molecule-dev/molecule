/**
 * State management middleware functions.
 *
 * @module
 */

import { getLogger } from '@molecule/app-logger'

import type { StoreMiddleware } from './types.js'

/**
 * Logging middleware — logs previous and next state on every update.
 *
 * @param name - Optional store name for log prefix (defaults to `'store'`).
 * @returns A store middleware that logs state transitions.
 */
export const loggerMiddleware = <T>(name?: string): StoreMiddleware<T> => {
  const logger = getLogger('state')
  return (set, get) => (partial) => {
    const prevState = get()
    set(partial)
    const nextState = get()
    logger.debug(`[${name || 'store'}]`, 'prev:', prevState, 'next:', nextState)
  }
}

/**
 * Simple storage adapter interface for persist middleware.
 * Compatible with `localStorage`, `sessionStorage`, and
 * `@molecule/app-storage` providers.
 */
export interface PersistStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const memoryStorage = (): PersistStorage => {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
  }
}

/**
 * Persist middleware — saves state to storage on every update and
 * restores it on initialization.
 *
 * Accepts any object implementing `PersistStorage` (`getItem` + `setItem`).
 * Defaults to in-memory storage.
 *
 * @param key - The storage key to persist state under.
 * @param storage - A `PersistStorage`-compatible object (defaults to in-memory).
 * @returns A store middleware that persists state to the given storage.
 */
export const persistMiddleware = <T>(
  key: string,
  storage: PersistStorage = memoryStorage(),
): StoreMiddleware<T> => {
  return (set, get) => {
    // Load initial state from storage
    try {
      const stored = storage.getItem(key)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<T>
        set(parsed)
      }
    } catch {
      // Ignore storage errors
    }

    return (partial) => {
      set(partial)
      try {
        storage.setItem(key, JSON.stringify(get()))
      } catch {
        // Ignore storage errors
      }
    }
  }
}
