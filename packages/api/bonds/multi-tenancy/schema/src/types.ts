/**
 * Schema-based multi-tenancy provider configuration.
 *
 * @module
 */

/**
 * Configuration options for the schema-based multi-tenancy provider.
 */
export interface SchemaConfig {
  /**
   * The HTTP header name used to extract the tenant identifier from
   * incoming requests. Case-insensitive (headers are lowercased).
   *
   * @default 'x-tenant-id'
   */
  tenantHeader?: string

  /**
   * Schema name prefix applied to tenant schemas.
   * The full schema name is `{schemaPrefix}{tenantId}`.
   *
   * @default 'tenant_'
   */
  schemaPrefix?: string

  /**
   * Default tenant ID to use when no tenant is resolved from the request.
   * If not set and no tenant is found, the middleware returns a 400 error.
   */
  defaultTenantId?: string
}
