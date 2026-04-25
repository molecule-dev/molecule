/**
 * Entitlements provider bond accessor.
 *
 * Apps construct a `TierRegistry` (typically via `defineTiers(...)`) and call
 * `setProvider(registry)` at startup. Handler code, middleware, and any other
 * consumer then resolves the bonded registry via `getProvider<TLimits>()`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { TierRegistry } from './types.js'

const BOND_TYPE = 'entitlements'
expectBond(BOND_TYPE)

/**
 * Registers a tier registry as the active entitlements provider.
 * Called by the application during startup.
 *
 * @param provider - The tier registry to bond.
 */
export const setProvider = <TLimits = unknown>(provider: TierRegistry<TLimits>): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded tier registry, throwing if none is configured.
 *
 * The generic parameter is the caller's responsibility — entitlements is
 * inherently app-specific in its `TLimits` shape, and bonds are erased at
 * runtime. Callers should pass their app's `TLimits` type at the call site.
 *
 * @returns The bonded tier registry.
 * @throws {Error} If no entitlements provider has been bonded.
 */
export const getProvider = <TLimits = unknown>(): TierRegistry<TLimits> => {
  try {
    return bondRequire<TierRegistry<TLimits>>(BOND_TYPE)
  } catch {
    throw new Error(
      t('entitlements.error.noProvider', undefined, {
        defaultValue:
          'Entitlements provider not configured. Call setProvider(tierRegistry) at startup.',
      }),
    )
  }
}

/**
 * Checks whether an entitlements provider is currently bonded.
 *
 * @returns `true` if a tier registry is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}
