/**
 * Markdown rendering types for molecule.dev.
 *
 * Defines the provider interface and configuration options for
 * rendering markdown content into HTML with optional features
 * like syntax highlighting, GFM support, and table of contents extraction.
 *
 * @module
 */

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

  /** Optional table of contents extracted from headings. */
  toc?: TocEntry[]
}

/**
 * Options for markdown rendering.
 */
export interface MarkdownOptions {
  /** Whether to sanitize the rendered HTML to prevent XSS. Defaults to `true`. */
  sanitize?: boolean

  /** Whether to enable GitHub Flavored Markdown extensions. Defaults to `true`. */
  gfm?: boolean

  /** Whether to convert line breaks to `<br>` elements. Defaults to `false`. */
  breaks?: boolean

  /** Whether to enable syntax highlighting for code blocks. Defaults to `false`. */
  syntaxHighlight?: boolean

  /** Custom component overrides keyed by HTML element name. */
  components?: Record<string, unknown>

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
   * @returns The rendered HTML and optional table of contents.
   */
  render(markdown: string, options?: MarkdownOptions): RenderedMarkdown
}
