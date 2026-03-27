/**
 * Sitemap provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { SitemapProvider } from './types.js'

let _provider: SitemapProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: SitemapProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): SitemapProvider | null {
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
export function requireProvider(): SitemapProvider {
  if (!_provider) {
    throw new Error('Sitemap provider not configured. Bond a sitemap provider first.')
  }
  return _provider
}
