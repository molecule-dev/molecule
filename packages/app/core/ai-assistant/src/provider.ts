/**
 * AIAssistant provider wiring, backed by the shared `@molecule/app-bond` registry.
 *
 * Bond packages call `setProvider()` during setup; it delegates to
 * `bond('ai-assistant', provider)`, so wiring via this package's `setProvider()`
 * and via `bond('ai-assistant', …)` write the SAME registry slot — use either.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import { bond, get, isBonded, requireSingleton } from '@molecule/app-bond'

import type { AIAssistantProvider } from './types.js'

const BOND_TYPE = 'ai-assistant'

/**
 * Register the active AI assistant provider.
 *
 * @param provider - The provider instance to register
 */
export function setProvider(provider: AIAssistantProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the active AI assistant provider, or null if none is registered.
 *
 * @returns The current provider or null
 */
export function getProvider(): AIAssistantProvider | null {
  return get<AIAssistantProvider>(BOND_TYPE) ?? null
}

/**
 * Check whether an AI assistant provider has been registered.
 *
 * @returns True if a provider is available
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Get the active AI assistant provider, throwing if none is registered.
 *
 * @returns The current provider
 * @throws {Error} if no provider has been registered
 */
export function requireProvider(): AIAssistantProvider {
  if (!isBonded(BOND_TYPE)) {
    throw new Error('AIAssistant provider not configured. Bond a ai-assistant provider first.')
  }
  return requireSingleton<AIAssistantProvider>(BOND_TYPE)
}
