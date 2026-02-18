/**
 * Type definitions for localStorage provider.
 *
 * @module
 */

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
   * Storage instance to use (localStorage or sessionStorage).
   * @default localStorage
   */
  storage?: Storage
}
