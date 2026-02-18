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
}
