/**
 * Default workspace provider configuration.
 *
 * @module
 */

import type { WorkspaceLayout } from '@molecule/app-ide'

/**
 * Adapter interface for storage.
 */
export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * Configuration for default workspace.
 */
export interface DefaultWorkspaceConfig {
  /** Default panel layout. */
  defaultLayout?: WorkspaceLayout
  /** Persist layout using the provided storage adapter. */
  persistLayout?: boolean
  /** Key for storage persistence. */
  storageKey?: string
  /** Storage adapter for persistence. Required when persistLayout is true. */
  storage?: StorageAdapter
}
