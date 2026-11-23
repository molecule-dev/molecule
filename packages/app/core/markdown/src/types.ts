/**
 * Markdown rendering types for molecule.dev.
 *
 * Defines the provider interface and configuration options for
 * rendering markdown content into HTML with optional features
 * like GFM support and table of contents extraction.
 *
 * @module
 */

import type { MarkdownElement } from './attributes.js'

/**
 * Table of contents entry extracted from markdown headings.
 */
export interface TocEntry {
  /** Unique identifier for the heading (slug). */
  id: string

  /** Text content of the heading. */
  text: string

  /** Heading level (1-6). */
  level: number
}

/**
 * Result of rendering markdown content.
 */
export interface RenderedMarkdown {
  /** The rendered HTML string. */
  html: string

  /**
   * Table of contents extracted from the document's headings, in document
   * order. Always present: `[]` when the document has no headings.
   */
  toc: TocEntry[]
}

/**
 * Options for markdown rendering.
 */
export interface MarkdownOptions {
  /**
   * Whether to sanitize the rendered HTML. Defaults to `true`.
   *
   * It controls two things: raw HTML in the markdown source is escaped to
   * inert text, and a link or image whose URL {@link isSafeMarkdownUrl}
   * refuses renders as its link text or alt text instead of an element.
   * A markdown link, autolink or image with a `javascript:` or `vbscript:`
   * URL is never emitted, even with `sanitize: false`; raw HTML that
   * `sanitize: false` passes through is the app's own trusted markup.
   */
  sanitize?: boolean

  /** Whether to enable GitHub Flavored Markdown extensions. Defaults to `true`. */
  gfm?: boolean

  /** Whether to convert line breaks to `<br>` elements. Defaults to `false`. */
  breaks?: boolean

  /**
   * Custom component overrides keyed by HTML element name.
   *
   * @deprecated The renderer returns an HTML string, so an override keeps only
   * its static markup — no click handler, state, or context. Use
   * {@link MarkdownOptions.elementAttributes} to add attributes instead. This
   * option is removed at the next major.
   */
  components?: Record<string, unknown>

  /**
   * Extra attributes for rendered elements, e.g. `{ a: { class: cm.link() } }`.
   *
   * Values are escaped. An attribute that is `href`, `src`, `id` or starts with
   * `on` is refused with an error, as is a name that is not a valid attribute
   * name; see `checkElementAttributes` in `./attributes.js`.
   */
  elementAttributes?: Partial<Record<MarkdownElement, Record<string, string>>>

  /** Target attribute for rendered links. */
  linkTarget?: '_blank' | '_self'
}

/**
 * Markdown rendering provider interface.
 *
 * All markdown providers must implement this interface to render
 * markdown strings into HTML output with optional features.
 */
export interface MarkdownProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Renders a markdown string into HTML.
   *
   * @param markdown - The markdown source string to render.
   * @param options - Optional rendering configuration.
   * @returns The rendered HTML and the document's table of contents.
   */
  render(markdown: string, options?: MarkdownOptions): RenderedMarkdown
}
