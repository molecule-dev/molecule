/**
 * Webhook provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { WebhookProvider } from './types.js'

let _provider: WebhookProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: WebhookProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): WebhookProvider | null {
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
export function requireProvider(): WebhookProvider {
  if (!_provider) {
    throw new Error('Webhook provider not configured. Bond a webhook provider first.')
  }
  return _provider
}
