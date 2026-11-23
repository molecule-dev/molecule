/**
 * Configuration for the react-markdown provider.
 *
 * @module
 */

import type { Components, Options } from 'react-markdown'

/**
 * A list of remark or rehype plugins — react-markdown's `PluggableList`
 * (a plugin function, a `[plugin, options]` tuple, or a preset). Re-derived
 * from react-markdown's own `Options` so no extra dependency on `unified` is
 * needed.
 */
export type MarkdownPluginList = NonNullable<Options['remarkPlugins']>

/**
 * Provider-specific configuration for {@link createProvider}. These are the
 * defaults baked into a provider instance; per-call {@link MarkdownOptions}
 * (from `@molecule/app-markdown`) override the ones they share (`sanitize`,
 * `gfm`, `components`).
 */
export interface ReactMarkdownConfig {
  /**
   * Whether to sanitize link/image URLs by default (the XSS URL gate) and keep
   * raw HTML inert. When `true` (default) a markdown link or image whose URL
   * `isRefusedMarkdownUrl` refuses renders as its text, and raw HTML in the
   * source is escaped to inert text. When `false` every URL is kept except a
   * `javascript:` or `vbscript:` one on a markdown link or image, and raw HTML
   * in the source is rendered as elements (`rehype-raw`) — reserve it for
   * trusted, app-authored content. Defaults to `true`.
   */
  sanitize?: boolean

  /**
   * Whether to enable GitHub Flavored Markdown (the `remark-gfm` plugin —
   * tables, strikethrough, task lists, autolinks, footnotes) by default.
   * Defaults to `true`.
   */
  gfm?: boolean

  /**
   * Extra remark plugins to run, appended after `remark-gfm` and the (optional)
   * hard-break transform. Use for additional markdown-AST extensions.
   */
  remarkPlugins?: MarkdownPluginList

  /**
   * Rehype plugins to run on the HTML AST (after `remark-rehype`), appended
   * after the built-in steps (heading ids and the table of contents, unsafe
   * URL replacement, task-list and footnote markup, `elementAttributes`, and
   * `rehype-raw` when `sanitize` is off). This is where a real syntax
   * highlighter (e.g. `rehype-highlight`) is wired in.
   */
  rehypePlugins?: MarkdownPluginList

  /**
   * Restrict the output to only these HTML tag names. Mutually exclusive with
   * {@link ReactMarkdownConfig.disallowedElements} — if both are set,
   * `allowedElements` wins.
   */
  allowedElements?: readonly string[]

  /** Drop these HTML tag names from the output (e.g. `['img']`). */
  disallowedElements?: readonly string[]

  /**
   * Custom component overrides keyed by tag name (react-markdown's
   * `Components`). Merged with any per-call `options.components`, which win.
   *
   * The result is a static HTML string, so an override keeps only its rendered
   * markup — no click handler, state, or context. Use the provider-neutral
   * `elementAttributes` option to add attributes instead.
   */
  components?: Components
}
