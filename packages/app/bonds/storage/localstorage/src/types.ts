/**
 * Type definitions for localStorage provider.
 *
 * @module
 */

import type { StorageCodec } from '@molecule/app-storage'

// Re-export core types
export type { StorageProvider } from '@molecule/app-storage'

/**
 * localStorage-specific configuration.
 */
export interface LocalStorageConfig {
  /**
   * Key prefix for all stored values.
   * Useful for namespacing storage in shared environments.
   */
  prefix?: string

  /**
   * Custom serializer function.
   * @default JSON.stringify
   */
  serialize?: <T>(value: T) => string

  /**
   * Custom deserializer function.
   * @default JSON.parse
   */
  deserialize?: <T>(value: string) => T

  /**
   * Per-key codecs, consulted BEFORE `serialize`/`deserialize`.
   *
   * The first codec whose `matches(key)` returns true owns that key for `get`,
   * `getSync`, `set` and the change subscription; every other key keeps the
   * `serialize`/`deserialize` pair. Use it to keep values an older helper wrote
   * verbatim readable — e.g. `createRawStringCodec((key) => key.startsWith('prompt_'))`
   * from `@molecule/app-storage` — without changing the encoding of typed keys.
   */
  codecs?: readonly StorageCodec[]

  /**
   * Storage instance to use (localStorage or sessionStorage).
   * @default localStorage
   */
  storage?: Storage
}
