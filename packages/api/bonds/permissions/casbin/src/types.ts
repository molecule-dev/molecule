/**
 * Type definitions for the Casbin permissions provider.
 *
 * @module
 */

export type { CreateRole, Permission, PermissionsProvider, Role } from '@molecule/api-permissions'

/**
 * Configuration options for the Casbin permissions provider.
 */
export interface CasbinPermissionsOptions {
  /**
   * Path to the Casbin model configuration file.
   * If not provided, a default RBAC model is used.
   */
  modelPath?: string

  /**
   * Inline Casbin model definition string.
   * Takes precedence over `modelPath` if both are provided.
   */
  modelText?: string

  /**
   * Path to the Casbin policy file.
   * If not provided, policies are stored in-memory only.
   */
  policyPath?: string

  /**
   * Casbin adapter instance for persistent policy storage.
   * If not provided, uses an in-memory adapter.
   */
  adapter?: unknown
}
