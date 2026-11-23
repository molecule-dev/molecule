/**
 * Markdown provider implemented against `marked`: CommonMark + GFM parsed to
 * an HTML string, synchronously, with no DOM and no framework, so the same
 * provider serves a browser preview and a Node build step (a static site
 * generator rendering posts at build time).
 *
 * Sanitization is by construction rather than by a DOM sanitizer: with
 * `sanitize` on (the default) every raw HTML token in the source is escaped
 * to inert text, and link/image URLs {@link isSafeMarkdownUrl} refuses render
 * as their link or alt text instead of an element. A `javascript:` or
 * `vbscript:` URL is refused even with `sanitize: false`, which otherwise
 * passes raw HTML and any other scheme through.
 *
 * `elementAttributes` adds extra attributes to rendered elements; the option
 * is validated before anything renders, so a refused attribute throws.
 *
 * @module
 */

import {
  Marked,
  type MarkedExtension,
  Renderer,
  type RendererThis,
  type Token,
  type Tokens,
} from 'marked'
import markedFootnote from 'marked-footnote'

import { I18nError, t } from '@molecule/app-i18n'
import {
  checkElementAttributes,
  createHeadingSlugger,
  escapeAttributeValue,
  isRefusedMarkdownUrl,
  isSafeMarkdownUrl,
  type MarkdownElement,
  type MarkdownOptions,
  type MarkdownProvider,
  type RenderedMarkdown,
  type TocEntry,
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
 * @returns The slug, or `section` when the text has no letters or digits.
 * @deprecated Use `createHeadingSlugger()` from `@molecule/app-markdown`; this
 * wrapper keeps the name for existing callers.
 */
export function slugify(text: string): string {
  return createHeadingSlugger()(text)
}

/**
 * Decides whether a link or image URL is safe to emit. Relative URLs,
 * fragments and the allowed schemes pass; anything with another scheme
 * (`javascript:`, `data:`, `vbscript:`, `file:`, …) does not.
 *
 * @param href - The URL from the markdown source.
 * @returns `true` when the URL may be emitted as-is.
 * @deprecated Use `isSafeMarkdownUrl` from `@molecule/app-markdown`; this
 * wrapper keeps the name for existing callers.
 */
export function isSafeUrl(href: string): boolean {
  return isSafeMarkdownUrl(href)
}

/**
 * Percent-encodes the spaces in a link or image URL, so a destination written
 * with an angle bracket (`[a](<https://x.com/a b>)`) emits a valid URL.
 *
 * @param href - The URL from the markdown source.
 * @returns The URL with each space encoded as `%20`.
 */
function encodeUrl(href: string): string {
  return href.replace(/ /g, '%20')
}

// ---------------------------------------------------------------------------
// Heading text
// ---------------------------------------------------------------------------

/** Named HTML entities a rendered heading's text can carry, decoded for `toc`. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
}

/**
 * Decodes the HTML entities in a rendered heading's text, so the table of
 * contents carries what a reader sees (`A & B`, not `A &amp; B`).
 *
 * @param text - Tag-stripped heading text.
 * @returns The decoded text.
 */
function decodeEntities(text: string): string {
  return text.replace(
    /&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z][a-zA-Z0-9]*));/g,
    (match, decimal: string | undefined, hex: string | undefined, name: string | undefined) => {
      if (!decimal && !hex) return NAMED_ENTITIES[(name ?? '').toLowerCase()] ?? match
      const code = decimal ? Number(decimal) : parseInt(hex ?? '0', 16)
      return code <= 0x10ffff ? String.fromCodePoint(code) : match
    },
  )
}

/** Matches an image tag so its alt text survives when markup is stripped. */
const IMAGE_TAG = /<img\b[^>]*\balt="([^"]*)"[^>]*>/g

/** Matches any HTML tag. */
const TAG = /<[^>]+>/g

/**
 * Reduces a heading's rendered inline HTML to the text a reader sees: image
 * alt text in place of the image, every tag removed, entities decoded. This is
 * the heading text the `toc` carries and the heading id is built from.
 *
 * @param html - The heading's rendered inline HTML.
 * @returns The heading's visible text.
 */
function headingText(html: string): string {
  return decodeEntities(html.replace(IMAGE_TAG, '$1').replace(TAG, ''))
}

// ---------------------------------------------------------------------------
// elementAttributes
// ---------------------------------------------------------------------------

/** The `elementAttributes` option, keyed by the element it applies to. */
type ElementAttributes = NonNullable<MarkdownOptions['elementAttributes']>

/** The heading elements by level, for `elementAttributes`. */
const HEADING_ELEMENTS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
] as const satisfies readonly MarkdownElement[]

/**
 * Resolves a heading level to the element `elementAttributes` names for it.
 *
 * @param depth - Heading level.
 * @returns The heading element, or `h6` for an out-of-range level.
 */
function headingElement(depth: number): (typeof HEADING_ELEMENTS)[number] {
  return HEADING_ELEMENTS[depth - 1] ?? 'h6'
}

/**
 * Renders the `elementAttributes` entries for one element as HTML attribute
 * text, each value escaped exactly once.
 *
 * @param element - The element being rendered.
 * @param attributes - The `elementAttributes` option, if any.
 * @param omit - An attribute name handled separately (a class merged with the renderer's own), if any.
 * @returns A leading-space attribute string, or `''` when the element has none.
 */
function attributesFor(
  element: MarkdownElement,
  attributes: ElementAttributes | undefined,
  omit?: string,
): string {
  const values = attributes?.[element]
  if (!values) return ''
  let rendered = ''
  for (const [name, value] of Object.entries(values)) {
    if (name === omit) continue
    rendered += ` ${name}="${escapeAttributeValue(value)}"`
  }
  return rendered
}

/**
 * Adds attribute text to the opening tag an element's own rendering starts
 * with. Only that tag is touched: the element's content (a nested list, or raw
 * HTML that `sanitize: false` passes through) can hold the same tag name.
 *
 * @param html - The element's rendered HTML, starting with its opening `tag`.
 * @param tag - The element's tag name.
 * @param attributes - A leading-space attribute string, or `''`.
 * @returns The HTML with the attributes added when there are any.
 * @throws {Error} When `html` does not start with the opening `tag`.
 */
function withOpeningAttributes(html: string, tag: string, attributes: string): string {
  if (!attributes) return html
  const opening = new RegExp(`^<${tag}(?=[\\s>])`)
  if (!opening.test(html)) {
    throw new Error(`marked rendered a <${tag}> that does not start with its opening tag`)
  }
  return html.replace(opening, `<${tag}${attributes}`)
}

/** The default renderer, used for the structures this provider only adds attributes to. */
const defaultRenderer = new Renderer()

// ---------------------------------------------------------------------------
// Footnotes
// ---------------------------------------------------------------------------

/** A `footnoteRef` token: one `[^label]` reference, numbered by first reference. */
interface FootnoteRefToken {
  type: 'footnoteRef'
  raw: string
  /** The 0-based repeat index within the label's references. */
  index: number
  /** The label's order of first reference, as a string; the visible number. */
  id: string
  /** The raw label inside `[^…]`. */
  label: string
}

/** A `footnote` token: one definition and the references to it. */
interface FootnoteToken {
  type: 'footnote'
  raw: string
  label: string
  refs: FootnoteRefToken[]
  content: Token[]
}

/** The trailing `footnotes` block token holding every referenced definition, in first-reference order. */
interface FootnotesToken {
  type: 'footnotes'
  raw: string
  items: FootnoteToken[]
}

/**
 * Narrows an unknown value to a `footnoteRef` token.
 *
 * @param value - A token or arbitrary value.
 * @returns `true` when the value is a `footnoteRef` token.
 */
function isFootnoteRefToken(value: unknown): value is FootnoteRefToken {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'footnoteRef' &&
    'index' in value &&
    typeof value.index === 'number' &&
    'id' in value &&
    typeof value.id === 'string' &&
    'label' in value &&
    typeof value.label === 'string'
  )
}

/**
 * Narrows an unknown value to a `footnote` token.
 *
 * @param value - A token or arbitrary value.
 * @returns `true` when the value is a `footnote` token.
 */
function isFootnoteToken(value: unknown): value is FootnoteToken {
  if (typeof value !== 'object' || value === null) return false
  if (!('label' in value) || typeof value.label !== 'string') return false
  if (!('refs' in value) || !Array.isArray(value.refs)) return false
  if (!value.refs.every(isFootnoteRefToken)) return false
  return 'content' in value && Array.isArray(value.content)
}

/**
 * Narrows an unknown value to the `footnotes` block token.
 *
 * @param value - A token or arbitrary value.
 * @returns `true` when the value is a `footnotes` token.
 */
function isFootnotesToken(value: unknown): value is FootnotesToken {
  if (typeof value !== 'object' || value === null) return false
  if (!('items' in value) || !Array.isArray(value.items)) return false
  return value.items.every(isFootnoteToken)
}

/**
 * The lowercased, attribute-escaped id for a footnote label, shared by the
 * reference and the list item so an anchor and its `fnref-` target match.
 *
 * @param label - The raw label inside `[^…]`.
 * @returns The label lowercased and escaped once for an attribute.
 */
function footnoteId(label: string): string {
  return escapeAttributeValue(label.toLowerCase())
}

/**
 * The `-n` suffix a repeat reference carries (`''` for the first reference).
 *
 * @param index - The 0-based repeat index.
 * @returns `-2`, `-3`, … for a repeat, or `''` for the first reference.
 */
function repeatSuffix(index: number): string {
  return index > 0 ? `-${index + 1}` : ''
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
  slugOverride: ((text: string) => string) | undefined
  elementAttributes: ElementAttributes | undefined
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
    slugOverride: config.slugify,
    elementAttributes: options?.elementAttributes,
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
  // One slugger per document: core's rule, or the configured `slugify` as the base, with the
  // same unique suffixes either way.
  const uniqueSlug = createHeadingSlugger(opts.slugOverride)
  const elementAttributes = opts.elementAttributes
  const linkAttrs = opts.linkTarget === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : ''

  const marked = new Marked({
    gfm: opts.gfm,
    breaks: opts.breaks,
    async: false,
    renderer: {
      html({ text }: Tokens.HTML | Tokens.Tag): string {
        return opts.sanitize ? escapeHtml(text) : text
      },
      heading(this: Renderer, token: Tokens.Heading): string {
        const inner = this.parser.parseInline(token.tokens ?? [])
        const text = headingText(inner)
        const attributes = attributesFor(headingElement(token.depth), elementAttributes)
        if (!opts.headingIds) {
          return `<h${token.depth}${attributes}>${inner}</h${token.depth}>\n`
        }
        const id = uniqueSlug(text)
        toc.push({ id, text, level: token.depth })
        return `<h${token.depth} id="${escapeAttributeValue(id)}"${attributes}>${inner}</h${token.depth}>\n`
      },
      paragraph(this: Renderer, token: Tokens.Paragraph): string {
        const inner = this.parser.parseInline(token.tokens ?? [])
        return `<p${attributesFor('p', elementAttributes)}>${inner}</p>\n`
      },
      blockquote(this: Renderer, token: Tokens.Blockquote): string {
        const body = this.parser.parse(token.tokens ?? [])
        return `<blockquote${attributesFor('blockquote', elementAttributes)}>\n${body}</blockquote>\n`
      },
      hr(): string {
        return `<hr${attributesFor('hr', elementAttributes)}>\n`
      },
      strong(this: Renderer, token: Tokens.Strong): string {
        const inner = this.parser.parseInline(token.tokens ?? [])
        return `<strong${attributesFor('strong', elementAttributes)}>${inner}</strong>`
      },
      em(this: Renderer, token: Tokens.Em): string {
        const inner = this.parser.parseInline(token.tokens ?? [])
        return `<em${attributesFor('em', elementAttributes)}>${inner}</em>`
      },
      del(this: Renderer, token: Tokens.Del): string {
        const inner = this.parser.parseInline(token.tokens ?? [])
        return `<del${attributesFor('del', elementAttributes)}>${inner}</del>`
      },
      codespan(token: Tokens.Codespan): string {
        return `<code${attributesFor('code', elementAttributes)}>${token.text}</code>`
      },
      link(this: Renderer, token: Tokens.Link): string {
        const inner = this.parser.parseInline(token.tokens ?? [])
        const href = encodeUrl(token.href)
        if (isRefusedMarkdownUrl(href, opts.sanitize)) return inner
        // `token.title` is already HTML-escaped by the marked lexer; escaping it
        // again would show `&amp;quot;` to the reader.
        const title = token.title ? ` title="${token.title}"` : ''
        const attributes = attributesFor('a', elementAttributes)
        return `<a href="${escapeAttributeValue(href)}"${title}${linkAttrs}${attributes}>${inner}</a>`
      },
      image(token: Tokens.Image): string {
        const href = encodeUrl(token.href)
        // `token.text` is the already-escaped alt text.
        if (isRefusedMarkdownUrl(href, opts.sanitize)) return token.text
        const title = token.title ? ` title="${token.title}"` : ''
        const attributes = attributesFor('img', elementAttributes)
        return `<img src="${escapeAttributeValue(href)}" alt="${token.text}"${title}${attributes}>`
      },
      code(token: Tokens.Code): string {
        const lang = (token.lang ?? '').trim().split(/\s+/)[0]
        // A fenced block already carries its language class; a configured `class`
        // is merged into it so neither replaces the other.
        const userClass = elementAttributes?.code?.class
        const classes = [lang ? `language-${lang}` : '', userClass ?? ''].filter(Boolean).join(' ')
        const cls = classes ? ` class="${escapeAttributeValue(classes)}"` : ''
        const body = token.escaped ? token.text : escapeHtml(token.text)
        const preAttributes = attributesFor('pre', elementAttributes)
        const codeAttributes = attributesFor('code', elementAttributes, 'class')
        return `<pre${preAttributes}><code${cls}${codeAttributes}>${body}\n</code></pre>\n`
      },
      list(this: Renderer, token: Tokens.List): string {
        const tag = token.ordered ? 'ol' : 'ul'
        return withOpeningAttributes(
          defaultRenderer.list.call(this, token),
          tag,
          attributesFor(tag, elementAttributes),
        )
      },
      listitem(this: Renderer, item: Tokens.ListItem): string {
        return withOpeningAttributes(
          defaultRenderer.listitem.call(this, item),
          'li',
          attributesFor('li', elementAttributes),
        )
      },
      checkbox(token: Tokens.Checkbox): string {
        const checked = token.checked ? 'checked="" ' : ''
        return `<input ${checked}disabled="" type="checkbox"${attributesFor('input', elementAttributes)}>`
      },
      table(this: Renderer, token: Tokens.Table): string {
        // marked's own table markup, written here so each of its parts gets its attributes where
        // it is made (a cell's raw HTML can hold a `<tbody>` too).
        const header = this.tablerow({
          text: token.header.map((cell) => this.tablecell(cell)).join(''),
        })
        const rows = token.rows
          .map((row) => this.tablerow({ text: row.map((cell) => this.tablecell(cell)).join('') }))
          .join('')
        const body = rows
          ? `<tbody${attributesFor('tbody', elementAttributes)}>${rows}</tbody>`
          : ''
        return (
          `<table${attributesFor('table', elementAttributes)}>\n` +
          `<thead${attributesFor('thead', elementAttributes)}>\n${header}</thead>\n${body}</table>\n`
        )
      },
      tablerow(this: Renderer, token: Tokens.TableRow): string {
        return withOpeningAttributes(
          defaultRenderer.tablerow.call(this, token),
          'tr',
          attributesFor('tr', elementAttributes),
        )
      },
      tablecell(this: Renderer, token: Tokens.TableCell): string {
        const tag = token.header ? 'th' : 'td'
        return withOpeningAttributes(
          defaultRenderer.tablecell.call(this, token),
          tag,
          attributesFor(tag, elementAttributes),
        )
      },
    },
  })

  // Footnotes: `marked-footnote` tokenizes `[^label]` references and `[^label]:`
  // definitions; this provider renders both token kinds itself so the DOM
  // matches the shared contract (`fn-`/`fnref-` ids, no `<h2>`, no classes) and
  // its two user-visible labels come from `t()`. A fresh extension instance per
  // render restarts numbering, so two renders of one document are identical.
  const renderFootnoteRef = (token: Tokens.Generic): string => {
    if (!isFootnoteRefToken(token)) return ''
    const id = footnoteId(token.label)
    const repeat = repeatSuffix(token.index)
    return (
      `<sup><a href="#fn-${id}" id="fnref-${id}${repeat}" data-footnote-ref` +
      `${attributesFor('a', elementAttributes)}>${token.id}</a></sup>`
    )
  }

  const renderFootnotes = function (this: RendererThis, token: Tokens.Generic): string {
    if (!isFootnotesToken(token) || token.items.length === 0) return ''
    let items = ''
    for (const item of token.items) {
      const id = footnoteId(item.label)
      const content = this.parser.parse(item.content).trimEnd()
      const wrappedInParagraph = content.endsWith('</p>')
      items += `<li id="fn-${id}"${attributesFor('li', elementAttributes)}>\n`
      items += wrappedInParagraph ? content.replace(/<\/p>$/, '') : content
      item.refs.forEach((ref, index) => {
        const reference = `${ref.id}${repeatSuffix(index)}`
        const label = t(
          'markdown.footnotes.backToReference',
          { reference },
          { defaultValue: 'Back to reference {{reference}}' },
        )
        const marker = index > 0 ? `↩<sup>${index + 1}</sup>` : '↩'
        items +=
          ` <a href="#fnref-${id}${repeatSuffix(index)}" data-footnote-backref` +
          `${attributesFor('a', elementAttributes)} aria-label="${escapeAttributeValue(label)}">${marker}</a>`
      })
      items += wrappedInParagraph ? '</p>\n' : '\n'
      items += '</li>\n'
    }
    const sectionLabel = t('markdown.footnotes.label', undefined, { defaultValue: 'Footnotes' })
    return (
      `<section data-footnotes aria-label="${escapeAttributeValue(sectionLabel)}"` +
      `${attributesFor('footnotes', elementAttributes)}>\n` +
      `<ol${attributesFor('ol', elementAttributes)}>\n${items}</ol>\n</section>\n`
    )
  }

  const footnoteRenderers: MarkedExtension = {
    extensions: [
      { name: 'footnoteRef', renderer: renderFootnoteRef },
      { name: 'footnotes', renderer: renderFootnotes },
    ],
  }
  marked.use(markedFootnote())
  marked.use(footnoteRenderers)

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
      checkElementAttributes(options?.elementAttributes)
      if (options?.components !== undefined) {
        throw new I18nError(
          'markdown.components.unsupported',
          {},
          'The marked provider cannot use components, because it returns an HTML string. Use elementAttributes to add attributes.',
        )
      }
      return renderDocument(String(markdown ?? ''), resolve(config, options))
    },
  }
}

/** The default provider: sanitize on, GFM on, no `target`, heading ids on. */
export const provider: MarkdownProvider = createProvider()
