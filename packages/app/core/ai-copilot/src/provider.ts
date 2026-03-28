/**
 * AICopilot provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { AICopilotProvider } from './types.js'

let _provider: AICopilotProvider | null = null

/**
 * Registers the active copilot provider.
 *
 * @param provider - The provider instance to register.
 */
export function setProvider(provider: AICopilotProvider): void {
  _provider = provider
}

/**
 * Returns the current copilot provider, or `null` if none is registered.
 *
 * @returns The registered provider or null.
 */
export function getProvider(): AICopilotProvider | null {
  return _provider
}

/**
 * Checks whether a copilot provider has been registered.
 *
 * @returns `true` if a provider is available.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Returns the current copilot provider or throws if none is registered.
 *
 * @returns The registered provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AICopilotProvider {
  if (!_provider) {
    throw new Error('AICopilot provider not configured. Bond an ai-copilot provider first.')
  }
  return _provider
}
