/**
 * HTML → readable content, the extraction half of the Readability provider.
 *
 * Mozilla Readability isolates the article (Apache-2.0), Turndown + the GFM
 * plugin turn its HTML into markdown (MIT), jsdom provides the DOM (MIT).
 * Scripts NEVER run here: the jsdom instance is created without
 * `runScripts`, so a page's JavaScript cannot execute inside this process —
 * extraction sees the served markup only. That is also why this provider has
 * no working `mode: 'browser'`: there is no engine here to render with.
 *
 * @module
 */

import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

import type { WebContentFormat, WebContentLink } from '@molecule/api-web-content'

/** Extraction bounds — the same numbers every bond and the hosted handler document. */
export const WEB_CONTENT_LIMITS = {
  /** Characters `content` may hold before it is cut (`truncated: true`). */
  maxContentChars: 500_000,
  /** Links collected at most, deduped by URL. */
  maxLinks: 200,
  /** Characters one link's text may hold. */
  maxLinkTextChars: 200,
  /** Characters of HTML one extract call accepts. */
  maxHtmlChars: 2_000_000,
} as const

/** What `extractReadable` produces (everything but the fetch metadata). */
export interface ExtractedContent {
  title?: string
  description?: string
  content: string
  format: WebContentFormat
  links?: WebContentLink[]
  truncated: boolean
}

let turndown: TurndownService | null = null

/** The shared Turndown instance: ATX headings, fenced code, GFM tables. */
function turndownService(): TurndownService {
  if (!turndown) {
    turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
    turndown.use(gfm)
  }
  return turndown
}

/** Collapses the whitespace runs textContent is full of into single spaces. */
function squeeze(text: string): string {
  return text.replace(/[ \t\r\n\f]+/g, ' ').trim()
}

/**
 * Collects the document's links BEFORE Readability parses (parse MUTATES the
 * document it is handed, stripping exactly the navigation a caller may be
 * after). Only absolute http(s) hrefs survive — jsdom resolves relative ones
 * against the document URL, and `about:blank` documents leave them
 * unresolvable (`about:`), which drops them.
 *
 * @param doc - The parsed document.
 * @returns Deduped links, at most {@link WEB_CONTENT_LIMITS.maxLinks}.
 */
function collectLinks(doc: Document): WebContentLink[] {
  const base = doc.baseURI || 'about:blank'
  const seen = new Set<string>()
  const links: WebContentLink[] = []
  for (const anchor of doc.querySelectorAll('a[href]')) {
    if (links.length >= WEB_CONTENT_LIMITS.maxLinks) break
    const raw = anchor.getAttribute('href')
    if (!raw) continue
    // Resolved here (not via the anchor's `href` property) against the
    // document URL — the same base Readability resolves against — because the
    // ambient DOM typing jsdom compiles against does not carry the element
    // property.
    let parsed: URL
    try {
      parsed = new URL(raw, base)
    } catch (_error) {
      // Intentional: an unresolvable href (`about:blank` documents leave
      // relative links unresolvable) is dropped, not an error.
      continue
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue
    const url = parsed.href
    if (seen.has(url)) continue
    seen.add(url)
    const text = squeeze(anchor.textContent ?? '').slice(0, WEB_CONTENT_LIMITS.maxLinkTextChars)
    links.push({ url, text })
  }
  return links
}

/**
 * Extracts readable content from one HTML document.
 *
 * The article (Readability) is preferred; when the page is not an article —
 * an app shell, a fragments-only home page, a plain text dump — the whole
 * document's squeezed text is the content instead, so the caller always gets
 * the page's words rather than an empty result. `about:blank` (no `baseUrl`)
 * is legal: relative links are simply dropped.
 *
 * Readability is handed a CLONE of the document (parse mutates what it is
 * given), so the fallback text and the links both still read the original.
 *
 * @param html - The HTML to read (a full document or a fragment).
 * @param options - Format, links, base URL, and the content cap (tests override it).
 * @returns Title, description and the readable content.
 */
export function extractReadable(
  html: string,
  options: {
    baseUrl?: string
    format?: WebContentFormat
    includeLinks?: boolean
    maxContentChars?: number
  } = {},
): ExtractedContent {
  const format = options.format === 'text' ? 'text' : 'markdown'
  const maxContentChars = options.maxContentChars ?? WEB_CONTENT_LIMITS.maxContentChars
  const baseUrl = options.baseUrl && options.baseUrl.length > 0 ? options.baseUrl : undefined

  // Scripts never run (no `runScripts`), and no subresource is fetched (no
  // `resources`): the DOM is the served markup, nothing more.
  const dom = new JSDOM(html, { url: baseUrl ?? 'about:blank' })
  const doc = dom.window.document

  const description =
    doc
      .querySelector('meta[name="description"][content], meta[property="og:description"][content]')
      ?.getAttribute('content')
      ?.trim() || undefined
  const links = options.includeLinks ? collectLinks(doc) : undefined

  const parsed = new Readability(doc.cloneNode(true) as Document).parse()
  const title =
    parsed?.title?.trim() || doc.querySelector('title')?.textContent?.trim() || undefined
  const articleHtml = (parsed?.content ?? '').trim()
  const content =
    articleHtml.length > 0
      ? format === 'markdown'
        ? turndownService().turndown(articleHtml)
        : squeeze(parsed?.textContent ?? '')
      : // Not an article (or Readability refused it): the page's words, whole.
        squeeze(doc.body?.textContent ?? '')
  dom.window.close()

  let truncated = false
  const capped = content.length > maxContentChars
  if (capped) truncated = true

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    content: capped ? content.slice(0, maxContentChars) : content,
    format,
    ...(links ? { links } : {}),
    truncated,
  }
}
