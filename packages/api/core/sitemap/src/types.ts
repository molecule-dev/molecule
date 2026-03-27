/**
 * Sitemap provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete sitemap implementation.
 *
 * @module
 */

/**
 *
 */
export interface SitemapProvider {
  readonly name: string
  // TODO: Define provider methods
}

/**
 *
 */
export interface SitemapConfig {
  // TODO: Define configuration options
  [key: string]: unknown
}
