/**
 * AI provider bond accessor.
 *
 * Bond packages (e.g. `@molecule/api-ai-anthropic`) call `setProvider()` during setup.
 * Application code calls `getProvider()` or `requireProvider()` at runtime to access
 * the active AI provider.
 *
 * @module
 */

import { bond, get as bondGet, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { AIProvider } from './types.js'

const BOND_TYPE = 'ai'

/**
 * Registers an AI provider as the active singleton. Called by bond packages
 * during application startup.
 *
 * @param provider - The AI provider implementation to bond.
 */
export function setProvider(provider: AIProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded AI provider, or `null` if none is bonded.
 *
 * @returns The bonded AI provider, or `null`.
 */
export function getProvider(): AIProvider | null {
  return bondGet<AIProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether an AI provider is currently bonded.
 *
 * @returns `true` if an AI provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded AI provider, throwing if none is bonded.
 * Use this when AI functionality is required.
 *
 * @returns The bonded AI provider.
 */
export function requireProvider(): AIProvider {
  try {
    return bondRequire<AIProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('ai.error.noProvider', undefined, {
        defaultValue: 'AI provider not configured. Bond an AI provider first.',
      }),
    )
  }
}
