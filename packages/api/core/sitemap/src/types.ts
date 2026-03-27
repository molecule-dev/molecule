/**
 * Type definitions for the sitemap core interface.
 *
 * @module
 */

/**
 * Change frequency hint for search engines.
 */
export type ChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

/**
 * A URL entry in a sitemap.
 */
export interface SitemapUrl {
  /** The page URL (absolute). */
  loc: string

  /** Last modification date (ISO 8601 string or Date). */
  lastmod?: string | Date

  /** How frequently the page is likely to change. */
  changefreq?: ChangeFrequency

  /** Priority of this URL relative to other URLs on the site. `0.0` to `1.0`. Defaults to `0.5`. */
  priority?: number

  /** Alternate language versions of this page. */
  alternates?: SitemapAlternate[]

  /** Image entries associated with this URL. */
  images?: SitemapImage[]
}

/**
 * An alternate language version of a sitemap URL.
 */
export interface SitemapAlternate {
  /** BCP 47 language-region code (e.g., `'en-US'`, `'fr'`). */
  hreflang: string

  /** The alternate URL. */
  href: string
}

/**
 * An image associated with a sitemap URL.
 */
export interface SitemapImage {
  /** The image URL. */
  loc: string

  /** Image caption. */
  caption?: string

  /** Image title. */
  title?: string
}

/**
 * An RSS feed definition.
 */
export interface RSSFeed {
  /** Feed title. */
  title: string

  /** Feed description. */
  description: string

  /** Feed link (the website URL). */
  link: string

  /** BCP 47 language code (e.g., `'en-us'`). */
  language?: string

  /** Feed items. */
  items: RSSItem[]
}

/**
 * An item in an RSS feed.
 */
export interface RSSItem {
  /** Item title. */
  title: string

  /** Item description or content. */
  description: string

  /** Item permalink URL. */
  link: string

  /** Publication date (ISO 8601 string or Date). */
  pubDate?: string | Date

  /** Globally unique identifier. Defaults to `link`. */
  guid?: string

  /** Item author email or name. */
  author?: string

  /** Item categories. */
  categories?: string[]
}

/**
 * An Atom feed definition.
 */
export interface AtomFeed {
  /** Feed title. */
  title: string

  /** Feed subtitle/description. */
  subtitle?: string

  /** Feed link (the website URL). */
  link: string

  /** Feed unique identifier (usually the feed URL). */
  id: string

  /** Last update date (ISO 8601 string or Date). */
  updated?: string | Date

  /** Feed author. */
  author?: AtomAuthor

  /** Feed entries. */
  entries: AtomEntry[]
}

/**
 * An author in an Atom feed.
 */
export interface AtomAuthor {
  /** Author name. */
  name: string

  /** Author email. */
  email?: string

  /** Author website URL. */
  uri?: string
}

/**
 * An entry in an Atom feed.
 */
export interface AtomEntry {
  /** Entry title. */
  title: string

  /** Entry permalink URL. */
  link: string

  /** Entry unique identifier. Defaults to `link`. */
  id?: string

  /** Last update date (ISO 8601 string or Date). */
  updated?: string | Date

  /** Entry summary. */
  summary?: string

  /** Full entry content (HTML). */
  content?: string

  /** Entry author (overrides feed-level author). */
  author?: AtomAuthor

  /** Entry categories. */
  categories?: string[]
}

/**
 * Sitemap provider interface.
 *
 * All sitemap providers must implement this interface. Bond packages
 * provide concrete implementations for generating XML sitemaps, RSS feeds,
 * and Atom feeds.
 */
export interface SitemapProvider {
  /**
   * Adds a URL entry to the sitemap. URLs are accumulated until `generate()` is called.
   *
   * @param url - The URL entry to add.
   */
  addUrl(url: SitemapUrl): void

  /**
   * Generates an XML sitemap string from all added URLs.
   * Resets the internal URL list after generation.
   *
   * @returns The XML sitemap string.
   */
  generate(): Promise<string>

  /**
   * Generates a sitemap index XML string that references multiple sitemap URLs.
   *
   * @param sitemaps - An array of sitemap URLs to include in the index.
   * @returns The XML sitemap index string.
   */
  generateIndex(sitemaps: string[]): Promise<string>

  /**
   * Generates an RSS 2.0 feed XML string.
   *
   * @param feed - The RSS feed definition.
   * @returns The RSS XML string.
   */
  rss(feed: RSSFeed): Promise<string>

  /**
   * Generates an Atom feed XML string.
   *
   * @param feed - The Atom feed definition.
   * @returns The Atom XML string.
   */
  atom(feed: AtomFeed): Promise<string>
}

/**
 * Configuration options for sitemap providers.
 */
export interface SitemapConfig {
  /** Base URL for the site (used to resolve relative URLs). */
  baseUrl?: string

  /** Whether to pretty-print the XML output. Defaults to `false`. */
  pretty?: boolean
}
