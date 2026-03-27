/**
 * Sitemap provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-sitemap-xml`) call `setProvider()` during setup.
 * Application code uses the convenience functions which delegate to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { AtomFeed, RSSFeed, SitemapProvider, SitemapUrl } from './types.js'

const BOND_TYPE = 'sitemap'
expectBond(BOND_TYPE)

/**
 * Registers a sitemap provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The sitemap provider implementation to bond.
 */
export const setProvider = (provider: SitemapProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded sitemap provider, throwing if none is configured.
 *
 * @returns The bonded sitemap provider.
 * @throws {Error} If no sitemap provider has been bonded.
 */
export const getProvider = (): SitemapProvider => {
  try {
    return bondRequire<SitemapProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('sitemap.error.noProvider', undefined, {
        defaultValue: 'Sitemap provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a sitemap provider is currently bonded.
 *
 * @returns `true` if a sitemap provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Adds a URL entry to the sitemap.
 *
 * @param url - The URL entry to add.
 * @throws {Error} If no sitemap provider has been bonded.
 */
export const addUrl = (url: SitemapUrl): void => {
  getProvider().addUrl(url)
}

/**
 * Generates an XML sitemap string from all added URLs.
 *
 * @returns The XML sitemap string.
 * @throws {Error} If no sitemap provider has been bonded.
 */
export const generate = async (): Promise<string> => {
  return getProvider().generate()
}

/**
 * Generates a sitemap index XML string that references multiple sitemap URLs.
 *
 * @param sitemaps - An array of sitemap URLs to include in the index.
 * @returns The XML sitemap index string.
 * @throws {Error} If no sitemap provider has been bonded.
 */
export const generateIndex = async (sitemaps: string[]): Promise<string> => {
  return getProvider().generateIndex(sitemaps)
}

/**
 * Generates an RSS 2.0 feed XML string.
 *
 * @param feed - The RSS feed definition.
 * @returns The RSS XML string.
 * @throws {Error} If no sitemap provider has been bonded.
 */
export const rss = async (feed: RSSFeed): Promise<string> => {
  return getProvider().rss(feed)
}

/**
 * Generates an Atom feed XML string.
 *
 * @param feed - The Atom feed definition.
 * @returns The Atom XML string.
 * @throws {Error} If no sitemap provider has been bonded.
 */
export const atom = async (feed: AtomFeed): Promise<string> => {
  return getProvider().atom(feed)
}
