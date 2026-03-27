/**
 * XML implementation of SitemapProvider.
 *
 * Generates XML sitemaps (urlset), sitemap indexes, RSS 2.0 feeds,
 * and Atom feeds using zero external dependencies.
 *
 * @module
 */

import type {
  AtomEntry,
  AtomFeed,
  RSSFeed,
  RSSItem,
  SitemapProvider,
  SitemapUrl,
} from '@molecule/api-sitemap'

import type { XmlSitemapConfig } from './types.js'
import { escapeXml, joinLines, toISODate, toRFC822, xmlElement, xmlSelfClosing } from './xml.js'

/** XML declaration. */
const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>'

/**
 * Creates an XML sitemap provider.
 *
 * @param config - Provider configuration.
 * @returns A `SitemapProvider` backed by XML generation.
 */
export const createProvider = (config: XmlSitemapConfig = {}): SitemapProvider => {
  const indent = config.pretty ? '  ' : ''
  const nl = config.pretty ? '\n' : ''
  let urls: SitemapUrl[] = []

  /**
   * Builds the XML for a single sitemap URL entry.
   *
   * @param url - The sitemap URL entry.
   * @returns XML string for the URL entry.
   */
  const buildUrlEntry = (url: SitemapUrl): string => {
    const lines: string[] = [
      xmlElement('loc', url.loc),
      url.lastmod ? xmlElement('lastmod', toISODate(url.lastmod)) : '',
      url.changefreq ? xmlElement('changefreq', url.changefreq) : '',
      url.priority !== undefined ? xmlElement('priority', String(url.priority)) : '',
    ]

    if (url.alternates?.length) {
      for (const alt of url.alternates) {
        lines.push(
          xmlSelfClosing('xhtml:link', {
            rel: 'alternate',
            hreflang: alt.hreflang,
            href: alt.href,
          }),
        )
      }
    }

    if (url.images?.length) {
      for (const img of url.images) {
        const imgLines = [
          xmlElement('image:loc', img.loc),
          img.caption ? xmlElement('image:caption', img.caption) : '',
          img.title ? xmlElement('image:title', img.title) : '',
        ]
        lines.push(
          `<image:image>${nl}${joinLines(imgLines, indent, config.pretty ? 4 : 0)}${nl}${indent.repeat(config.pretty ? 3 : 0)}</image:image>`,
        )
      }
    }

    return `${indent.repeat(config.pretty ? 1 : 0)}<url>${nl}${joinLines(lines, indent, config.pretty ? 2 : 0)}${nl}${indent.repeat(config.pretty ? 1 : 0)}</url>`
  }

  return {
    addUrl(url: SitemapUrl): void {
      urls.push(url)
    },

    async generate(): Promise<string> {
      const xsl = config.xslUrl
        ? `${nl}<?xml-stylesheet type="text/xsl" href="${escapeXml(config.xslUrl)}"?>`
        : ''

      const namespaces = [
        'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        urls.some((u) => u.alternates?.length)
          ? 'xmlns:xhtml="http://www.w3.org/1999/xhtml"'
          : '',
        urls.some((u) => u.images?.length)
          ? 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
          : '',
      ]
        .filter(Boolean)
        .join(' ')

      const entries = urls.map(buildUrlEntry).join(nl)
      urls = []

      return `${XML_DECLARATION}${xsl}${nl}<urlset ${namespaces}>${nl}${entries}${nl}</urlset>`
    },

    async generateIndex(sitemaps: string[]): Promise<string> {
      const entries = sitemaps
        .map((loc) => {
          const lines = joinLines([xmlElement('loc', loc)], indent, config.pretty ? 2 : 0)
          return `${indent.repeat(config.pretty ? 1 : 0)}<sitemap>${nl}${lines}${nl}${indent.repeat(config.pretty ? 1 : 0)}</sitemap>`
        })
        .join(nl)

      return `${XML_DECLARATION}${nl}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${nl}${entries}${nl}</sitemapindex>`
    },

    async rss(feed: RSSFeed): Promise<string> {
      /**
       * Builds the XML for a single RSS item.
       *
       * @param item - The RSS item.
       * @returns XML string for the item.
       */
      const buildItem = (item: RSSItem): string => {
        const lines: string[] = [
          xmlElement('title', item.title),
          xmlElement('description', item.description),
          xmlElement('link', item.link),
          item.pubDate ? xmlElement('pubDate', toRFC822(item.pubDate)) : '',
          xmlElement('guid', item.guid ?? item.link),
          item.author ? xmlElement('author', item.author) : '',
        ]

        if (item.categories?.length) {
          for (const cat of item.categories) {
            lines.push(xmlElement('category', cat))
          }
        }

        return `${indent.repeat(config.pretty ? 2 : 0)}<item>${nl}${joinLines(lines, indent, config.pretty ? 3 : 0)}${nl}${indent.repeat(config.pretty ? 2 : 0)}</item>`
      }

      const channelLines: string[] = [
        xmlElement('title', feed.title),
        xmlElement('description', feed.description),
        xmlElement('link', feed.link),
        feed.language ? xmlElement('language', feed.language) : '',
      ]

      const channelContent = joinLines(channelLines, indent, config.pretty ? 2 : 0)
      const items = feed.items.map(buildItem).join(nl)
      const channelItems = items ? `${nl}${items}` : ''

      return `${XML_DECLARATION}${nl}<rss version="2.0">${nl}${indent.repeat(config.pretty ? 1 : 0)}<channel>${nl}${channelContent}${channelItems}${nl}${indent.repeat(config.pretty ? 1 : 0)}</channel>${nl}</rss>`
    },

    async atom(feed: AtomFeed): Promise<string> {
      /**
       * Builds the XML for a single Atom entry.
       *
       * @param entry - The Atom entry.
       * @returns XML string for the entry.
       */
      const buildEntry = (entry: AtomEntry): string => {
        const lines: string[] = [
          xmlElement('title', entry.title),
          `<link href="${escapeXml(entry.link)}"/>`,
          xmlElement('id', entry.id ?? entry.link),
          entry.updated ? xmlElement('updated', toISODate(entry.updated)) : '',
          entry.summary ? xmlElement('summary', entry.summary) : '',
          entry.content ? `<content type="html">${escapeXml(entry.content)}</content>` : '',
        ]

        if (entry.author) {
          const authorLines = [
            xmlElement('name', entry.author.name),
            entry.author.email ? xmlElement('email', entry.author.email) : '',
            entry.author.uri ? xmlElement('uri', entry.author.uri) : '',
          ]
          lines.push(
            `<author>${nl}${joinLines(authorLines, indent, config.pretty ? 4 : 0)}${nl}${indent.repeat(config.pretty ? 3 : 0)}</author>`,
          )
        }

        if (entry.categories?.length) {
          for (const cat of entry.categories) {
            lines.push(xmlSelfClosing('category', { term: cat }))
          }
        }

        return `${indent.repeat(config.pretty ? 1 : 0)}<entry>${nl}${joinLines(lines, indent, config.pretty ? 2 : 0)}${nl}${indent.repeat(config.pretty ? 1 : 0)}</entry>`
      }

      const feedLines: string[] = [
        xmlElement('title', feed.title),
        feed.subtitle ? xmlElement('subtitle', feed.subtitle) : '',
        `<link href="${escapeXml(feed.link)}"/>`,
        xmlElement('id', feed.id),
        feed.updated ? xmlElement('updated', toISODate(feed.updated)) : '',
      ]

      if (feed.author) {
        const authorLines = [
          xmlElement('name', feed.author.name),
          feed.author.email ? xmlElement('email', feed.author.email) : '',
          feed.author.uri ? xmlElement('uri', feed.author.uri) : '',
        ]
        feedLines.push(
          `<author>${nl}${joinLines(authorLines, indent, config.pretty ? 2 : 0)}${nl}${indent.repeat(config.pretty ? 1 : 0)}</author>`,
        )
      }

      const feedContent = joinLines(feedLines, indent, config.pretty ? 1 : 0)
      const entries = feed.entries.map(buildEntry).join(nl)
      const feedEntries = entries ? `${nl}${entries}` : ''

      return `${XML_DECLARATION}${nl}<feed xmlns="http://www.w3.org/2005/Atom">${nl}${feedContent}${feedEntries}${nl}</feed>`
    },
  }
}

/**
 * The provider implementation with default configuration.
 */
export const provider: SitemapProvider = createProvider()
