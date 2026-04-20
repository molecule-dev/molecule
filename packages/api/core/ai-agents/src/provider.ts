/**
 * AIAgents provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { AIAgentsProvider } from './types.js'

let _provider: AIAgentsProvider | null = null

/**
 * Registers the AI agents provider singleton.
 *
 * @param provider - The AI agents provider implementation to register.
 */
export function setProvider(provider: AIAgentsProvider): void {
  _provider = provider
}

/**
 * Returns the bonded AI agents provider, or `null` if none is registered.
 *
 * @returns The active provider, or `null`.
 */
export function getProvider(): AIAgentsProvider | null {
  return _provider
}

/**
 * Returns whether an AI agents provider has been registered.
 *
 * @returns `true` if a provider is bonded.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Returns the bonded AI agents provider, throwing if none is configured.
 *
 * @returns The active provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AIAgentsProvider {
  if (!_provider) {
    throw new Error('AIAgents provider not configured. Bond a ai-agents provider first.')
  }
  return _provider
}
