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
 *
 * @param provider
 */
export function setProvider(provider: AIAssistantProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): AIAssistantProvider | null {
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
export function requireProvider(): AIAssistantProvider {
  if (!_provider) {
    throw new Error('AIAssistant provider not configured. Bond a ai-assistant provider first.')
  }
  return _provider
}
