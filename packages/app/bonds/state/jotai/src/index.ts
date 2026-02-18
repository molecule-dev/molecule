/**
 * Jotai state provider for molecule.dev.
 *
 * Provides a Jotai-based implementation of the molecule state interface.
 *
 * @see https://jotai.org/
 *
 * @module
 */

export * from './atoms.js'
export * from './provider.js'
export * from './store.js'
export * from './types.js'

// Re-export Jotai core for advanced use cases
/**
 * Creates a Jotai atom — the base reactive primitive for state management.
 * Use for derived state, async data, or writable state with custom logic.
 *
 * @param read - Initial value, or a read function that derives the atom's value from other atoms.
 * @param write - Optional write function for custom setter logic.
 * @returns A Jotai atom that can be used with useAtom or store.get/set.
 */
export { atom } from 'jotai/vanilla'

/**
 * Creates a standalone Jotai store for use outside React components
 * (e.g. in middleware, server-side, or tests).
 *
 * @returns A Jotai store instance with get, set, and sub methods.
 */
export { createStore as createJotaiStore } from 'jotai/vanilla'
