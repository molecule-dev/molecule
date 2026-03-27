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
 *
 * @param provider
 */
export function setProvider(provider: AIAgentsProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): AIAgentsProvider | null {
  return _provider
}

/**
 *
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 *
 */
export function requireProvider(): AIAgentsProvider {
  if (!_provider) {
    throw new Error('AIAgents provider not configured. Bond a ai-agents provider first.')
  }
  return _provider
}
