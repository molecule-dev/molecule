/**
 * AICopilot provider wiring, backed by the shared `@molecule/app-bond` registry.
 *
 * Bond packages call `setProvider()` during setup; it delegates to
 * `bond('ai-copilot', provider)`, so wiring via this package's `setProvider()`
 * and via `bond('ai-copilot', …)` write the SAME registry slot — use either.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import { bond, get, isBonded, requireSingleton } from '@molecule/app-bond'

import type { AICopilotProvider } from './types.js'

const BOND_TYPE = 'ai-copilot'

/**
 * Registers the active copilot provider.
 *
 * @param provider - The provider instance to register.
 */
export function setProvider(provider: AICopilotProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Returns the current copilot provider, or `null` if none is registered.
 *
 * @returns The registered provider or null.
 */
export function getProvider(): AICopilotProvider | null {
  return get<AICopilotProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether a copilot provider has been registered.
 *
 * @returns `true` if a provider is available.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Returns the current copilot provider or throws if none is registered.
 *
 * @returns The registered provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AICopilotProvider {
  if (!isBonded(BOND_TYPE)) {
    throw new Error('AICopilot provider not configured. Bond an ai-copilot provider first.')
  }
  return requireSingleton<AICopilotProvider>(BOND_TYPE)
}
