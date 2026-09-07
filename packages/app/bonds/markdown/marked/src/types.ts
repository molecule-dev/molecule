/**
 * Configuration for the marked markdown provider.
 *
 * @module
 */

/**
 * Provider-specific configuration for {@link createProvider}. These are the
 * defaults baked into a provider instance; per-call `MarkdownOptions` (from
 * `@molecule/app-markdown`) override the ones they share (`sanitize`, `gfm`,
 * `breaks`, `linkTarget`).
 */
export interface MarkedConfig {
  /**
   * Whether to sanitize by default (the XSS gate). When `true` (default) raw
   * HTML in the source is escaped to inert text and dangerous link/image URL
   * schemes (`javascript:`, `data:`, `vbscript:`, `file:`) are dropped. When
   * `false`, raw HTML passes through untouched and every URL scheme is kept —
   * only for fully trusted, app-authored content. Defaults to `true`.
   */
  sanitize?: boolean
  /**
   * Whether to enable GitHub Flavored Markdown (tables, strikethrough, task
   * lists, autolinks) by default. Defaults to `true`.
   */
  gfm?: boolean
  /**
   * Whether a single newline inside a paragraph becomes a `<br>` by default.
   * Defaults to `false`.
   */
  breaks?: boolean
  /**
   * Default `target` for rendered links. `_blank` also adds
   * `rel="noopener noreferrer"`. Defaults to no `target` attribute.
   */
  linkTarget?: '_blank' | '_self'
  /**
   * Whether headings get a slug `id` (so `result.toc` anchors resolve).
   * Defaults to `true`.
   */
  headingIds?: boolean
  /**
   * Custom slug function for heading ids. Defaults to a lowercase, hyphenated
   * slug of the heading's text; duplicate slugs in one document get a `-2`,
   * `-3`, … suffix regardless of the function used.
   */
  slugify?: (text: string) => string
}
