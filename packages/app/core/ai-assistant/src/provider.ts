/**
 * AIAssistant provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { AIAssistantProvider } from './types.js'

let _provider: AIAssistantProvider | null = null

/**
 * Register the active AI assistant provider.
 *
 * @param provider - The provider instance to register
 */
export function setProvider(provider: AIAssistantProvider): void {
  _provider = provider
}

/**
 * Get the active AI assistant provider, or null if none is registered.
 *
 * @returns The current provider or null
 */
export function getProvider(): AIAssistantProvider | null {
  return _provider
}

/**
 * Check whether an AI assistant provider has been registered.
 *
 * @returns True if a provider is available
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Get the active AI assistant provider, throwing if none is registered.
 *
 * @returns The current provider
 * @throws {Error} if no provider has been registered
 */
export function requireProvider(): AIAssistantProvider {
  if (!_provider) {
    throw new Error('AIAssistant provider not configured. Bond a ai-assistant provider first.')
  }
  return _provider
}
