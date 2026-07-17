/**
 * AIVoice provider wiring, backed by the shared `@molecule/app-bond` registry.
 *
 * Bond packages call `setProvider()` during setup; it delegates to
 * `bond('ai-voice', provider)`, so wiring via this package's `setProvider()`
 * and via `bond('ai-voice', …)` write the SAME registry slot — use either.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import { bond, get, isBonded, requireSingleton } from '@molecule/app-bond'

import type { AIVoiceProvider } from './types.js'

const BOND_TYPE = 'ai-voice'

/**
 * Registers the AI voice provider singleton.
 *
 * @param provider - The AI voice provider implementation to register.
 */
export function setProvider(provider: AIVoiceProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Returns the bonded AI voice provider, or `null` if none is registered.
 *
 * @returns The active provider, or `null`.
 */
export function getProvider(): AIVoiceProvider | null {
  return get<AIVoiceProvider>(BOND_TYPE) ?? null
}

/**
 * Returns whether an AI voice provider has been registered.
 *
 * @returns `true` if a provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Returns the bonded AI voice provider, throwing if none is configured.
 *
 * @returns The active provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AIVoiceProvider {
  if (!isBonded(BOND_TYPE)) {
    throw new Error('AIVoice provider not configured. Bond a ai-voice provider first.')
  }
  return requireSingleton<AIVoiceProvider>(BOND_TYPE)
}
