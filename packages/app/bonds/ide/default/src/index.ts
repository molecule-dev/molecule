/**
 * Default IDE workspace provider for molecule.dev.
 *
 * @module
 */

export * from './browser-storage.js'
export * from './provider.js'
export * from './types.js'

import { getBrowserStorage } from './browser-storage.js'
import { createProvider } from './provider.js'

const browserStorage = getBrowserStorage()

/**
 * Pre-instantiated provider singleton. Persists the layout to the browser's
 * `localStorage` when available, so a panel resize survives a page reload;
 * falls back to a non-persistent in-memory provider where storage is missing
 * or blocked (SSR, tests). Consumers wanting different behavior (a custom
 * storage adapter, key, or opting out) should call {@link createProvider}.
 */
export const provider = browserStorage
  ? createProvider({ persistLayout: true, storage: browserStorage })
  : createProvider()
