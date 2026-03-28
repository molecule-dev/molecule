/**
 * Multi-tenancy provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-multi-tenancy-schema`) call
 * `setProvider()` during setup. Application code uses the convenience
 * functions which delegate to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { CreateTenant, Tenant, TenancyProvider, TenancyRequestHandler } from './types.js'

const BOND_TYPE = 'multi-tenancy'
expectBond(BOND_TYPE)

/**
 * Registers a multi-tenancy provider as the active singleton. Called by
 * bond packages during application startup.
 *
 * @param provider - The tenancy provider implementation to bond.
 */
export const setProvider = (provider: TenancyProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded multi-tenancy provider, throwing if none is configured.
 *
 * @returns The bonded tenancy provider.
 * @throws {Error} If no tenancy provider has been bonded.
 */
export const getProvider = (): TenancyProvider => {
  try {
    return bondRequire<TenancyProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('multiTenancy.error.noProvider', undefined, {
        defaultValue: 'Multi-tenancy provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a multi-tenancy provider is currently bonded.
 *
 * @returns `true` if a tenancy provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Sets the current tenant context using the bonded provider.
 *
 * @param tenantId - The tenant identifier to activate.
 * @throws {Error} If no tenancy provider has been bonded.
 */
export const setTenant = (tenantId: string): void => {
  getProvider().setTenant(tenantId)
}

/**
 * Retrieves the current tenant identifier using the bonded provider.
 *
 * @returns The current tenant ID or `null`.
 * @throws {Error} If no tenancy provider has been bonded.
 */
export const getTenant = (): string | null => {
  return getProvider().getTenant()
}

/**
 * Creates a new tenant using the bonded provider.
 *
 * @param tenant - The tenant creation payload.
 * @returns The created tenant.
 * @throws {Error} If no tenancy provider has been bonded.
 */
export const createTenant = async (tenant: CreateTenant): Promise<Tenant> => {
  return getProvider().createTenant(tenant)
}

/**
 * Deletes a tenant using the bonded provider.
 *
 * @param tenantId - The identifier of the tenant to delete.
 * @throws {Error} If no tenancy provider has been bonded.
 */
export const deleteTenant = async (tenantId: string): Promise<void> => {
  return getProvider().deleteTenant(tenantId)
}

/**
 * Lists all tenants using the bonded provider.
 *
 * @returns Array of all tenants.
 * @throws {Error} If no tenancy provider has been bonded.
 */
export const listTenants = async (): Promise<Tenant[]> => {
  return getProvider().listTenants()
}

/**
 * Creates tenant-resolving middleware using the bonded provider.
 *
 * @returns An Express request handler that sets the tenant context.
 * @throws {Error} If no tenancy provider has been bonded.
 */
export const getTenantMiddleware = (): TenancyRequestHandler => {
  return getProvider().getTenantMiddleware()
}
