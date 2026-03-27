/**
 * Configuration and internal types for the custom permissions provider.
 *
 * @module
 */

export type { CreateRole, Permission, PermissionsProvider, Role } from '@molecule/api-permissions'

/**
 * Configuration options for the custom permissions provider.
 */
export interface CustomPermissionsOptions {
  /**
   * Whether wildcard (`*`) matching is enabled for actions and resources.
   * When enabled, a permission with action `*` or resource `*` matches any
   * action or resource respectively.
   *
   * @defaultValue true
   */
  wildcards?: boolean
}
