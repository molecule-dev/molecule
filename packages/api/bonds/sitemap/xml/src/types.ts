/**
 * XML sitemap provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the XML sitemap provider.
 */
export interface XmlSitemapConfig {
  /** Whether to pretty-print the XML output with indentation. Defaults to `false`. */
  pretty?: boolean

  /** XML stylesheet URL to include in sitemap output (for browser rendering). */
  xslUrl?: string
}
