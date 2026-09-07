/**
 * Markdown provider implemented against `marked`: CommonMark + GFM parsed to
 * an HTML string, synchronously, with no DOM and no framework, so the same
 * provider serves a browser preview and a Node build step (a static site
 * generator rendering posts at build time).
 *
 * Sanitization is by construction rather than by a DOM sanitizer: with
 * `sanitize` on (the default) every raw HTML token in the source is escaped
 * to inert text, and link/image URLs with a dangerous scheme (`javascript:`,
 * `data:`, `vbscript:`, `file:`) are dropped. Everything else marked emits is
 * its own markup from the markdown grammar.
 *
 * @module
 */

import { Marked, type Tokens } from 'marked'

import type {
  MarkdownOptions,
  MarkdownProvider,
  RenderedMarkdown,
  TocEntry,
} from '@molecule/app-markdown'

import type { MarkedConfig } from './types.js'

// ---------------------------------------------------------------------------
// Escaping, slugs, URLs
// ---------------------------------------------------------------------------

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/**
 * Escapes text for safe inclusion in HTML.
 *
 * @param text - Raw text.
 * @returns The escaped text.
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ESCAPES[ch] ?? ch)
}

/**
 * Generates a URL-friendly slug from heading text: lowercase, letters,
 * digits, hyphens; whitespace becomes a single hyphen.
 *
 * @param text - Heading text.
 * @returns The slug (may be empty when the text has no word characters).
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
}

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

/**
 * Decides whether a link or image URL is safe to emit. Relative URLs,
 * fragments and the protocols in {@link SAFE_PROTOCOLS} pass; anything with
 * another scheme (`javascript:`, `data:`, `vbscript:`, `file:`, …) does not.
 * The scheme check strips control characters and whitespace first, so the
 * classic `java\tscript:` bypass does not work.
 *
 * @param href - The URL from the markdown source.
 * @returns `true` when the URL may be emitted as-is.
 */
export function isSafeUrl(href: string): boolean {
  // drop C0 controls, space and DEL by code point (a control-char regex trips no-control-regex)
  const cleaned = Array.from(href)
    .filter((c) => c.charCodeAt(0) > 0x20 && c.charCodeAt(0) !== 0x7f)
    .join('')
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(cleaned)
  if (!match) return true
  return SAFE_PROTOCOLS.has(`${match[1].toLowerCase()}:`)
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ResolvedOptions {
  sanitize: boolean
  gfm: boolean
  breaks: boolean
  linkTarget: '_blank' | '_self' | undefined
  headingIds: boolean
  slug: (text: string) => string
}

/**
 * Merges per-call options over the provider config over the defaults.
 *
 * @param config - Provider configuration.
 * @param options - Per-call options, if any.
 * @returns The fully resolved options.
 */
function resolve(config: MarkedConfig, options: MarkdownOptions | undefined): ResolvedOptions {
  return {
    sanitize: options?.sanitize ?? config.sanitize ?? true,
    gfm: options?.gfm ?? config.gfm ?? true,
    breaks: options?.breaks ?? config.breaks ?? false,
    linkTarget: options?.linkTarget ?? config.linkTarget,
    headingIds: config.headingIds ?? true,
    slug: config.slugify ?? slugify,
  }
}

/**
 * Renders one markdown document with a fresh `Marked` instance, so per-call
 * options and the per-document table of contents never leak between calls.
 *
 * @param markdown - The markdown source.
 * @param opts - Resolved options.
 * @returns The HTML and the table of contents.
 */
function renderDocument(markdown: string, opts: ResolvedOptions): RenderedMarkdown {
  const toc: TocEntry[] = []
  const seen = new Map<string, number>()
  const uniqueSlug = (text: string): string => {
    const base = opts.slug(text) || 'section'
    const n = (seen.get(base) ?? 0) + 1
    seen.set(base, n)
    return n === 1 ? base : `${base}-${n}`
  }
  const linkAttrs =
    opts.linkTarget === '_blank'
      ? ' target="_blank" rel="noopener noreferrer"'
      : opts.linkTarget === '_self'
        ? ' target="_self"'
        : ''

  const marked = new Marked({
    gfm: opts.gfm,
    breaks: opts.breaks,
    async: false,
    renderer: {
      html({ text }: Tokens.HTML | Tokens.Tag): string {
        return opts.sanitize ? escapeHtml(text) : text
      },
      heading(
        this: { parser: { parseInline(tokens: Tokens.Generic[]): string } },
        token: Tokens.Heading,
      ): string {
        const inner = this.parser.parseInline(token.tokens as Tokens.Generic[])
        const text = inner.replace(/<[^>]+>/g, '')
        if (!opts.headingIds) return `<h${token.depth}>${inner}</h${token.depth}>\n`
        const id = uniqueSlug(text)
        toc.push({ id, text, level: token.depth })
        return `<h${token.depth} id="${escapeHtml(id)}">${inner}</h${token.depth}>\n`
      },
      link(
        this: { parser: { parseInline(tokens: Tokens.Generic[]): string } },
        token: Tokens.Link,
      ): string {
        const inner = this.parser.parseInline(token.tokens as Tokens.Generic[])
        if (opts.sanitize && !isSafeUrl(token.href)) return inner
        const title = token.title ? ` title="${escapeHtml(token.title)}"` : ''
        return `<a href="${escapeHtml(token.href)}"${title}${linkAttrs}>${inner}</a>`
      },
      image(token: Tokens.Image): string {
        if (opts.sanitize && !isSafeUrl(token.href)) return escapeHtml(token.text)
        const title = token.title ? ` title="${escapeHtml(token.title)}"` : ''
        return `<img src="${escapeHtml(token.href)}" alt="${escapeHtml(token.text)}"${title}>`
      },
      code(token: Tokens.Code): string {
        const lang = (token.lang ?? '').trim().split(/\s+/)[0]
        const cls = lang ? ` class="language-${escapeHtml(lang)}"` : ''
        const body = token.escaped ? token.text : escapeHtml(token.text)
        return `<pre><code${cls}>${body}\n</code></pre>\n`
      },
    },
  })

  const html = marked.parse(markdown) as string
  return { html, toc }
}

/**
 * Creates a markdown provider backed by `marked`.
 *
 * @param config - Provider defaults; per-call `MarkdownOptions` override the shared ones.
 * @returns A `MarkdownProvider` for `@molecule/app-markdown`.
 */
export function createProvider(config: MarkedConfig = {}): MarkdownProvider {
  return {
    name: 'marked',
    render(markdown: string, options?: MarkdownOptions): RenderedMarkdown {
      return renderDocument(String(markdown ?? ''), resolve(config, options))
    },
  }
}

/** The default provider: sanitize on, GFM on, no `target`, heading ids on. */
export const provider: MarkdownProvider = createProvider()
