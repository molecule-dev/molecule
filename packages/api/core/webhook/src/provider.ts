/**
 * Webhook provider bond accessor.
 *
 * Bond packages (e.g. `@molecule/api-webhook-http`) call `setProvider()`
 * during setup. Application code uses the convenience functions from `webhook.ts`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { WebhookProvider } from './types.js'

const BOND_TYPE = 'webhook'
expectBond(BOND_TYPE)

/**
 * Registers a webhook provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The webhook provider implementation to bond.
 */
export const setProvider = (provider: WebhookProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded webhook provider, throwing if none is configured.
 *
 * @returns The bonded webhook provider.
 * @throws {Error} If no webhook provider has been bonded.
 */
export const getProvider = (): WebhookProvider => {
  try {
    return bondRequire<WebhookProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('webhook.error.noProvider', undefined, {
        defaultValue: 'Webhook provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a webhook provider is currently bonded.
 *
 * @returns `true` if a webhook provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}
