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
 *
 * @param provider
 */
export function setProvider(provider: AICopilotProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): AICopilotProvider | null {
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
export function requireProvider(): AICopilotProvider {
  if (!_provider) {
    throw new Error('AICopilot provider not configured. Bond a ai-copilot provider first.')
  }
  return _provider
}
