/**
 * Markdown provider implementation using simple regex-based parsing.
 *
 * @module
 */

import type {
  MarkdownOptions,
  MarkdownProvider,
  RenderedMarkdown,
  TocEntry,
} from '@molecule/app-markdown'

import type { ReactMarkdownConfig } from './types.js'

/**
 * Escapes HTML special characters to prevent XSS.
 *
 * @param text - Raw text to escape.
 * @returns Escaped HTML string.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * URL schemes permitted in sanitized `href`/`src` attributes. Everything else
 * (notably `javascript:`, `data:`, `vbscript:`) is dropped. Schemeless URLs
 * (relative paths, `#anchors`, `mailto:`-less hosts) have no scheme and pass.
 */
const ALLOWED_URL_SCHEMES = ['http', 'https', 'mailto']

/**
 * Enforces the scheme allow-list on a URL destined for an `href`/`src`.
 *
 * The value is assumed to already be HTML-attribute-escaped by the caller (the
 * whole source is escaped up front in sanitize mode), so this only rejects
 * dangerous schemes — it does not re-escape (which would double-encode).
 *
 * @param url - The (already attribute-escaped) URL to validate.
 * @returns The URL if its scheme is allowed (or it is schemeless/relative),
 *   otherwise an empty string so the link/image renders inert.
 */
function sanitizeUrl(url: string): string {
  const trimmed = url.trim()
  const schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed)

  if (schemeMatch && !ALLOWED_URL_SCHEMES.includes(schemeMatch[1].toLowerCase())) {
    return ''
  }

  return trimmed
}

/**
 * Generates a URL-friendly slug from heading text.
 *
 * @param text - Heading text to slugify.
 * @returns Slug string.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim()
}

/**
 * Extracts table of contents entries from markdown headings.
 *
 * @param markdown - Raw markdown string.
 * @returns Array of TOC entries.
 */
function extractToc(markdown: string): TocEntry[] {
  const entries: TocEntry[] = []
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  let match: RegExpExecArray | null

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    entries.push({
      id: slugify(text),
      text,
      level,
    })
  }

  return entries
}

/**
 * Converts markdown text to HTML using regex-based parsing.
 *
 * When `options.sanitize` is `true` (the default), the renderer is
 * secure-by-default: the entire source is HTML-escaped up front, so any raw
 * HTML the author wrote (`<script>`, attribute breakouts, leading-`<` lines)
 * becomes inert text and every value later interpolated into an `href`/`src`
 * attribute is already attribute-escaped. The markdown transforms below then
 * only ADD trusted tags. A scheme allow-list additionally drops dangerous
 * `href`/`src` schemes (`javascript:`, `data:`, …). Set `sanitize: false` to
 * opt out and pass raw HTML through unchanged.
 *
 * @param markdown - Raw markdown string.
 * @param options - Rendering options.
 * @returns HTML string.
 */
function markdownToHtml(markdown: string, options?: MarkdownOptions): string {
  const sanitize = options?.sanitize ?? true
  const linkTarget = options?.linkTarget ?? '_self'

  // Secure-by-default: escape every HTML metacharacter in the source before any
  // transform runs. This neutralizes raw HTML and attribute-breakout payloads,
  // and makes all subsequently-interpolated text/URLs attribute-safe.
  let html = sanitize ? escapeHtml(markdown) : markdown

  // In sanitize mode the blockquote marker `>` was escaped to `&gt;`.
  const quoteMarker = sanitize ? '&gt;' : '>'

  // Content is already escaped up front in sanitize mode; otherwise (raw
  // passthrough) preserve the original behavior of escaping only heading/code
  // text so those literal regions still render as text.
  const escText = sanitize ? (text: string) => text : escapeHtml

  // Apply the scheme allow-list to a URL only when sanitizing.
  const safeUrl = (url: string) => (sanitize ? sanitizeUrl(url) : url)

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, (_m, text) => {
    const id = slugify(text)
    return `<h6 id="${id}">${escText(text)}</h6>`
  })
  html = html.replace(/^#####\s+(.+)$/gm, (_m, text) => {
    const id = slugify(text)
    return `<h5 id="${id}">${escText(text)}</h5>`
  })
  html = html.replace(/^####\s+(.+)$/gm, (_m, text) => {
    const id = slugify(text)
    return `<h4 id="${id}">${escText(text)}</h4>`
  })
  html = html.replace(/^###\s+(.+)$/gm, (_m, text) => {
    const id = slugify(text)
    return `<h3 id="${id}">${escText(text)}</h3>`
  })
  html = html.replace(/^##\s+(.+)$/gm, (_m, text) => {
    const id = slugify(text)
    return `<h2 id="${id}">${escText(text)}</h2>`
  })
  html = html.replace(/^#\s+(.+)$/gm, (_m, text) => {
    const id = slugify(text)
    return `<h1 id="${id}">${escText(text)}</h1>`
  })

  // Code blocks (fenced)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const langAttr = lang ? ` class="language-${escText(lang)}"` : ''
    return `<pre><code${langAttr}>${escText(code.trimEnd())}</code></pre>`
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, (_m, code) => `<code>${escText(code)}</code>`)

  // Blockquotes
  html = html.replace(new RegExp(`^${quoteMarker}\\s+(.+)$`, 'gm'), '<blockquote>$1</blockquote>')

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Images (must come before links to avoid matching `![...]` as `[...]`)
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_m, alt, url) => `<img src="${safeUrl(url)}" alt="${alt}" />`,
  )

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, text, url) => `<a href="${safeUrl(url)}" target="${linkTarget}">${text}</a>`,
  )

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr />')

  // Unordered lists
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')

  // Line breaks
  if (options?.breaks) {
    html = html.replace(/\n/g, '<br />\n')
  }

  // Paragraphs (lines not already wrapped in tags)
  html = html.replace(/^(?!<[a-z])((?!<).+)$/gm, '<p>$1</p>')

  return html
}

/**
 * Creates a react-markdown-compatible provider instance.
 *
 * @param config - Optional provider configuration.
 * @returns A configured MarkdownProvider.
 */
export function createProvider(config?: ReactMarkdownConfig): MarkdownProvider {
  const defaultSanitize = config?.sanitize ?? true
  const defaultGfm = config?.gfm ?? true

  return {
    name: 'react-markdown',

    render(markdown: string, options?: MarkdownOptions): RenderedMarkdown {
      const mergedOptions: MarkdownOptions = {
        sanitize: defaultSanitize,
        gfm: defaultGfm,
        ...options,
      }

      const html = markdownToHtml(markdown, mergedOptions)
      const toc = extractToc(markdown)

      return {
        html,
        toc: toc.length > 0 ? toc : undefined,
      }
    },
  }
}

/** Default react-markdown provider instance. */
export const provider: MarkdownProvider = createProvider()
