/**
 * Type definitions for client storage.
 *
 * @module
 */

/**
 * Storage provider interface.
 *
 * All storage providers must implement this interface.
 */
export interface StorageProvider {
  /**
   * Gets a value from storage.
   */
  get<T = unknown>(key: string): Promise<T | null>

  /**
   * Sets a value in storage.
   */
  set<T = unknown>(key: string, value: T): Promise<void>

  /**
   * Removes a value from storage.
   */
  remove(key: string): Promise<void>

  /**
   * Clears all values from storage.
   */
  clear(): Promise<void>

  /**
   * Gets all keys in storage.
   */
  keys(): Promise<string[]>

  /**
   * Gets multiple values from storage.
   */
  getMany?<T = unknown>(keys: string[]): Promise<Map<string, T | null>>

  /**
   * Sets multiple values in storage.
   */
  setMany?<T = unknown>(entries: Array<[string, T]>): Promise<void>

  /**
   * Removes multiple values from storage.
   */
  removeMany?(keys: string[]): Promise<void>

  /**
   * Reads a value synchronously.
   *
   * Optional: only a provider backed by a SYNCHRONOUS store (browser
   * `localStorage`, an in-memory map) can answer without I/O. A render-time
   * caller reads through `getPreferenceStore()`, which uses this method to see
   * the persisted value on the first paint; a provider without it is read
   * through {@link StorageProvider.get} and subscribers update when the value
   * lands.
   * @param key - The storage key.
   * @returns The stored value, or `null` when it is absent, unreadable or corrupt.
   */
  getSync?<T = unknown>(key: string): T | null

  /**
   * Subscribes to changes made to a key OUTSIDE this provider instance — for
   * example another browser tab's `localStorage` write.
   *
   * Writes made through the same provider instance do not re-emit here; a
   * synchronous caller observes them through `getPreferenceStore()`'s own
   * subscribers.
   * @param key - The storage key.
   * @param listener - Called with the new value, or `null` when it was removed.
   * @returns A function that stops the subscription.
   */
  subscribe?(key: string, listener: (value: unknown) => void): () => void
}

/**
 * Called when the value a preference key holds changes.
 *
 * Receives the new value, or `null` when the key was removed or became
 * unreadable.
 */
export type PreferenceListener = (value: unknown) => void

/**
 * Synchronous snapshot + subscription over an asynchronous storage provider.
 *
 * A render-time read cannot await, and a preference (a theme, a layout width, a
 * feature toggle) is read DURING the first render — so the value must already
 * be in memory when the component paints. This store keeps that memory: it
 * fills from the provider's synchronous read when the provider has one,
 * hydrates asynchronously otherwise, and notifies subscribers on every change
 * (a write in this tab, or a `storage` event from another tab relayed by the
 * provider's `subscribe`).
 *
 * Writes are optimistic and best-effort: the cache and subscribers update
 * immediately, and persistence failures (quota, a locked/absent store) are
 * ignored exactly like the browser-global helpers this replaces.
 */
export interface PreferenceStore {
  /**
   * Reads the last known value for a key, synchronously.
   * @param key - The storage key.
   * @returns The cached value, `null` when absent or unreadable, or the last
   *   known value while an asynchronous provider's first read is in flight.
   */
  get<T = unknown>(key: string): T | null

  /**
   * Updates the cached value, notifies subscribers, then persists best-effort.
   * @param key - The storage key.
   * @param value - The value to store.
   */
  set<T = unknown>(key: string, value: T): void

  /**
   * Removes a value from the cache and from the provider, notifying subscribers.
   * @param key - The storage key.
   */
  remove(key: string): void

  /**
   * Subscribes to changes of one key in this tab or another.
   * @param key - The storage key.
   * @param listener - Called with the new value after every change.
   * @returns A function that stops the subscription.
   */
  subscribe(key: string, listener: PreferenceListener): () => void

  /**
   * Loads values into the cache from the provider.
   *
   * Call once at boot for every key a synchronous reader may ask about. A
   * provider with a synchronous read fills the cache immediately; an
   * asynchronous one resolves later and notifies subscribers.
   * @param keys - The keys to load.
   * @returns A promise that resolves once every key has been loaded.
   */
  hydrate(keys: readonly string[]): Promise<void>
}
