/**
 * AI chat provider bond accessor.
 *
 * Bond packages (e.g. a React-based chat UI) call `setProvider()` during
 * setup. Application code uses `requireProvider()` to access streaming
 * chat, history, and abort operations.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type { ChatProvider } from './types.js'

const BOND_TYPE = 'ai-chat'

/**
 * Registers an AI chat provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The chat provider implementation to bond.
 */
export function setProvider(provider: ChatProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded AI chat provider, or `null` if none is bonded.
 *
 * @returns The bonded chat provider, or `null`.
 */
export function getProvider(): ChatProvider | null {
  return bondGet<ChatProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether an AI chat provider is currently bonded.
 *
 * @returns `true` if an AI chat provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded AI chat provider, throwing if none is configured.
 *
 * @returns The bonded chat provider.
 * @throws {Error} If no AI chat provider has been bonded.
 */
export function requireProvider(): ChatProvider {
  const provider = bondGet<ChatProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('aiChat.error.noProvider', undefined, {
        defaultValue: 'AI chat provider not configured. Bond an AI chat provider first.',
      }),
    )
  }
  return provider
}
