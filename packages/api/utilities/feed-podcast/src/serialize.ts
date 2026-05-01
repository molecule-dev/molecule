/**
 * Pure-function podcast RSS 2.0 serializer with iTunes + Podcast Index
 * namespaces. Takes a {@link Podcast} and returns a self-contained XML
 * string that validates against the iTunes Connect podcast feed
 * requirements and (optionally) the Podcast Index 1.0 namespace spec.
 */

import type {
  Podcast,
  PodcastEpisode,
  PodcastTranscript,
  SerializePodcastRssOptions,
} from './types.js'
import { escapeXml, formatItunesDuration, formatRfc822, wrapCdata } from './utilities.js'

const ITUNES_NS = 'http://www.itunes.com/dtds/podcast-1.0.dtd'
const PODCAST_NS = 'https://podcastindex.org/namespace/1.0'
const ATOM_NS = 'http://www.w3.org/2005/Atom'
const CONTENT_NS = 'http://purl.org/rss/1.0/modules/content/'

/**
 * Serialize a {@link Podcast} into a complete RSS 2.0 XML document with
 * the iTunes namespace and (optionally) the Podcast Index 1.0
 * namespace. Output is a single string that begins with the XML
 * declaration and ends with `</rss>`.
 *
 * The function is pure — no I/O, no side effects, no global state. All
 * untrusted text is XML-escaped (titles, authors, etc.) or CDATA-wrapped
 * (`<description>`, `<itunes:summary>`, `<content:encoded>`) so callers
 * can safely pass user-supplied content without introducing XSS into
 * downstream consumers that render the feed as HTML.
 *
 * @param podcast - Show metadata + episodes to serialize.
 * @param options - Optional serializer flags. See
 *                  {@link SerializePodcastRssOptions}.
 * @returns A complete RSS 2.0 XML document as a string.
 *
 * @example
 * ```ts
 * import { serializePodcastRss } from '@molecule/api-feed-podcast'
 *
 * const xml = serializePodcastRss({
 *   title: 'My Show',
 *   link: 'https://example.com',
 *   description: 'Weekly chats about TypeScript.',
 *   author: 'Jane Smith',
 *   imageUrl: 'https://example.com/cover.jpg',
 *   categories: [{ text: 'Technology' }],
 *   owner: { name: 'Jane Smith', email: 'jane@example.com' },
 *   episodes: [
 *     {
 *       guid: 'ep-001',
 *       title: 'Pilot',
 *       description: 'Welcome to the show.',
 *       publishedAt: '2026-05-01T12:00:00Z',
 *       durationSeconds: 1830,
 *       enclosure: {
 *         url: 'https://cdn.example.com/ep-001.mp3',
 *         length: 12345678,
 *         type: 'audio/mpeg',
 *       },
 *     },
 *   ],
 * })
 * ```
 */
export function serializePodcastRss(
  podcast: Podcast,
  options: SerializePodcastRssOptions = {},
): string {
  const includePodcastNs = options.includePodcastNamespace !== false
  const buildDate = options.buildDate
    ? formatRfc822(options.buildDate)
    : podcast.lastBuildDate
      ? formatRfc822(podcast.lastBuildDate)
      : formatRfc822(new Date())

  const namespaces = [
    `xmlns:itunes="${ITUNES_NS}"`,
    `xmlns:atom="${ATOM_NS}"`,
    `xmlns:content="${CONTENT_NS}"`,
  ]
  if (includePodcastNs) {
    namespaces.push(`xmlns:podcast="${PODCAST_NS}"`)
  }

  const channelLines: string[] = []
  channelLines.push(`<title>${escapeXml(podcast.title)}</title>`)
  channelLines.push(`<link>${escapeXml(podcast.link)}</link>`)
  channelLines.push(`<description>${wrapCdata(podcast.description)}</description>`)
  channelLines.push(`<language>${escapeXml(podcast.language ?? 'en')}</language>`)
  channelLines.push(`<lastBuildDate>${escapeXml(buildDate)}</lastBuildDate>`)
  channelLines.push(`<generator>@molecule/api-feed-podcast</generator>`)

  if (podcast.copyright) {
    channelLines.push(`<copyright>${escapeXml(podcast.copyright)}</copyright>`)
  }

  if (podcast.feedUrl) {
    channelLines.push(
      `<atom:link href="${escapeXml(podcast.feedUrl)}" rel="self" type="application/rss+xml"/>`,
    )
  }

  if (podcast.author) {
    channelLines.push(`<itunes:author>${escapeXml(podcast.author)}</itunes:author>`)
  }

  channelLines.push(`<itunes:summary>${wrapCdata(podcast.description)}</itunes:summary>`)

  if (podcast.imageUrl) {
    channelLines.push(`<itunes:image href="${escapeXml(podcast.imageUrl)}"/>`)
    // RSS 2.0 also supports a generic <image> sibling — emit for
    // legacy clients that don't read the iTunes namespace.
    channelLines.push('<image>')
    channelLines.push(`<url>${escapeXml(podcast.imageUrl)}</url>`)
    channelLines.push(`<title>${escapeXml(podcast.title)}</title>`)
    channelLines.push(`<link>${escapeXml(podcast.link)}</link>`)
    channelLines.push('</image>')
  }

  if (podcast.categories) {
    for (const category of podcast.categories) {
      if (category.subText) {
        channelLines.push(`<itunes:category text="${escapeXml(category.text)}">`)
        channelLines.push(`<itunes:category text="${escapeXml(category.subText)}"/>`)
        channelLines.push('</itunes:category>')
      } else {
        channelLines.push(`<itunes:category text="${escapeXml(category.text)}"/>`)
      }
    }
  }

  channelLines.push(`<itunes:explicit>${podcast.explicit ? 'true' : 'false'}</itunes:explicit>`)

  if (podcast.type) {
    channelLines.push(`<itunes:type>${escapeXml(podcast.type)}</itunes:type>`)
  }

  if (podcast.owner) {
    channelLines.push('<itunes:owner>')
    channelLines.push(`<itunes:name>${escapeXml(podcast.owner.name)}</itunes:name>`)
    channelLines.push(`<itunes:email>${escapeXml(podcast.owner.email)}</itunes:email>`)
    channelLines.push('</itunes:owner>')
  }

  for (const episode of podcast.episodes) {
    channelLines.push(...renderEpisode(episode, includePodcastNs))
  }

  const xmlLines: string[] = []
  xmlLines.push('<?xml version="1.0" encoding="UTF-8"?>')
  xmlLines.push(`<rss version="2.0" ${namespaces.join(' ')}>`)
  xmlLines.push('<channel>')
  for (const line of channelLines) {
    xmlLines.push(line)
  }
  xmlLines.push('</channel>')
  xmlLines.push('</rss>')
  return xmlLines.join('\n')
}

/**
 * Internal: render a single episode into its `<item>` block.
 *
 * @param episode - Source episode.
 * @param includePodcastNs - Whether to emit `<podcast:*>` elements.
 * @returns Array of XML lines (no leading/trailing newlines).
 */
function renderEpisode(episode: PodcastEpisode, includePodcastNs: boolean): string[] {
  const lines: string[] = []
  lines.push('<item>')
  lines.push(`<title>${escapeXml(episode.title)}</title>`)
  lines.push(`<guid isPermaLink="false">${escapeXml(episode.guid)}</guid>`)

  if (episode.link) {
    lines.push(`<link>${escapeXml(episode.link)}</link>`)
  }

  if (episode.publishedAt) {
    lines.push(`<pubDate>${escapeXml(formatRfc822(episode.publishedAt))}</pubDate>`)
  }

  if (episode.author) {
    lines.push(`<itunes:author>${escapeXml(episode.author)}</itunes:author>`)
  }

  if (episode.description !== undefined) {
    lines.push(`<description>${wrapCdata(episode.description)}</description>`)
    lines.push(`<itunes:summary>${wrapCdata(episode.description)}</itunes:summary>`)
  }

  if (episode.contentEncoded !== undefined) {
    lines.push(`<content:encoded>${wrapCdata(episode.contentEncoded)}</content:encoded>`)
  }

  if (episode.imageUrl) {
    lines.push(`<itunes:image href="${escapeXml(episode.imageUrl)}"/>`)
  }

  if (episode.durationSeconds !== undefined) {
    lines.push(
      `<itunes:duration>${escapeXml(formatItunesDuration(episode.durationSeconds))}</itunes:duration>`,
    )
  }

  if (episode.episodeNumber !== undefined) {
    lines.push(`<itunes:episode>${episode.episodeNumber}</itunes:episode>`)
  }

  if (episode.seasonNumber !== undefined) {
    lines.push(`<itunes:season>${episode.seasonNumber}</itunes:season>`)
  }

  const episodeType = episode.episodeType ?? 'full'
  lines.push(`<itunes:episodeType>${escapeXml(episodeType)}</itunes:episodeType>`)

  if (episode.explicit !== undefined) {
    lines.push(`<itunes:explicit>${episode.explicit ? 'true' : 'false'}</itunes:explicit>`)
  }

  // <enclosure> is required by iTunes for every episode.
  lines.push(
    `<enclosure url="${escapeXml(episode.enclosure.url)}" length="${Math.max(0, Math.floor(episode.enclosure.length))}" type="${escapeXml(episode.enclosure.type)}"/>`,
  )

  if (includePodcastNs && episode.transcripts) {
    for (const transcript of episode.transcripts) {
      lines.push(renderTranscript(transcript))
    }
  }

  lines.push('</item>')
  return lines
}

/**
 * Internal: render a `<podcast:transcript>` element. Only emitted when
 * the Podcast Index namespace is enabled.
 *
 * @param transcript - Source transcript record.
 * @returns Single self-closing XML element.
 */
function renderTranscript(transcript: PodcastTranscript): string {
  const attrs: string[] = []
  attrs.push(`url="${escapeXml(transcript.url)}"`)
  attrs.push(`type="${escapeXml(transcript.type)}"`)
  if (transcript.language) {
    attrs.push(`language="${escapeXml(transcript.language)}"`)
  }
  if (transcript.rel) {
    attrs.push(`rel="${escapeXml(transcript.rel)}"`)
  }
  return `<podcast:transcript ${attrs.join(' ')}/>`
}
