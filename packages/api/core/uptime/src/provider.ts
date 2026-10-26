/**
 * Uptime provider bond accessor and convenience function.
 *
 * Bond packages (e.g. `@molecule/api-uptime-fetch`) call `setProvider()`
 * during setup. Application code uses the `probe` convenience function,
 * which delegates to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { UptimeProbeResult, UptimeProbeSpec, UptimeProvider } from './types.js'

const BOND_TYPE = 'uptime'
expectBond(BOND_TYPE)

/**
 * Registers an uptime provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The uptime provider implementation to bond.
 */
export const setProvider = (provider: UptimeProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded uptime provider, throwing if none is configured.
 *
 * @returns The bonded uptime provider.
 * @throws {Error} If no uptime provider has been bonded.
 */
export const getProvider = (): UptimeProvider => {
  try {
    return bondRequire<UptimeProvider>(BOND_TYPE)
  } catch (_error) {
    throw new Error(
      t('uptime.error.noProvider', undefined, {
        defaultValue: 'Uptime provider not configured. Call setProvider() first.',
      }),
      { cause: _error },
    )
  }
}

/**
 * Checks whether an uptime provider is currently bonded.
 *
 * @returns `true` if an uptime provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Probes a URL through the bonded provider.
 *
 * @param spec - What to probe and how to judge it (`url` required).
 * @returns The probe's outcome — a `down` site included.
 * @throws {Error} If no uptime provider has been bonded, or the spec is invalid.
 */
export const probe = async (spec: UptimeProbeSpec): Promise<UptimeProbeResult> => {
  return getProvider().probe(spec)
}
