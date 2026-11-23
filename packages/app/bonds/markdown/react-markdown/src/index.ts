/**
 * Markdown provider for `@molecule/app-markdown`, backed by the real
 * `react-markdown` 10 library plus `remark-gfm`.
 *
 * The core contract returns an HTML STRING (`render(): { html: string; toc }`),
 * but react-markdown renders React elements — so this bond renders that element
 * tree to a static string with `renderToStaticMarkup` (`react-dom/server`).
 * You still get real CommonMark parsing and full GitHub Flavored Markdown
 * (tables, strikethrough, task lists, autolinks, footnotes) via `remark-gfm`.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-markdown-react-markdown'
 * import { requireProvider, setProvider } from '@molecule/app-markdown'
 *
 * setProvider(provider) // once, at app startup (bonds.ts)
 *
 * const { html, toc } = requireProvider().render('| a | b |\n| - | - |\n| 1 | 2 |')
 * // html === '<table>…</table>'  (a real GFM table)
 * ```
 *
 * @remarks
 * - **The DOM matches every other `@molecule/app-markdown` provider.** The
 *   conformance cases in the shared kit define it: headings get a unique id
 *   from `createHeadingSlugger()`, and `toc` lists exactly the rendered
 *   headings in order (parsed from the tree, so a `#` line in a code fence is
 *   not a heading and a setext heading is), `[]` when there are none. A link
 *   or image whose URL `isSafeMarkdownUrl` refuses renders as its link text or
 *   alt text — no element. Task lists render as
 *   `<li><input type="checkbox" disabled [checked]> text</li>` with no class
 *   names, and GFM footnotes render the labelled `data-footnotes` section the
 *   cases define (section and back-link labels go through `t()`).
 * - **URL policy.** `sanitize` (default on) applies the shared
 *   `isSafeMarkdownUrl` allow-list (`http`, `https`, `mailto`, `tel`, `irc`,
 *   `ircs`, `xmpp`, relative URLs and fragments) to every markdown link and
 *   image. With `sanitize: false` every URL is kept except a `javascript:` or
 *   `vbscript:` one on a markdown link or image, which no provider ever emits.
 * - **Raw HTML.** With `sanitize` on (the default) raw HTML in the source
 *   (`<script>`, `<b>`, an `onerror` attribute) is escaped to inert text. With
 *   `sanitize: false` it renders as elements via `rehype-raw` — trusted,
 *   app-authored markup that gets none of this bond's shaping: a raw heading
 *   gets no id and no `toc` entry, a raw element gets no `elementAttributes`,
 *   and a raw URL is kept as written.
 * - **Options:** `gfm`, `sanitize`, `breaks` (soft breaks → `<br>`),
 *   `linkTarget` (`_blank` also adds `rel="noopener noreferrer"`),
 *   `elementAttributes` (extra attributes on every element of a kind, refused
 *   when they name `href`, `src`, `id` or an event handler), and the deprecated
 *   `components` (custom tag overrides). A fenced code block carries a
 *   `language-*` class (highlighter-ready); pass a rehype highlighter (e.g.
 *   `rehype-highlight`) via `config.rehypePlugins` to colorize.
 * - **A `components` override keeps only its static markup** — no click
 *   handler, state, or context — because the result is an HTML string. Use
 *   `elementAttributes` instead.
 * - **{@link ReactMarkdownConfig}** additionally exposes `remarkPlugins`,
 *   `rehypePlugins`, `allowedElements`, and `disallowedElements` for
 *   provider-level customization at {@link createProvider} time. A config's
 *   own `rehypePlugins` run after this bond's.
 * - **Wire it** with `setProvider()` from `@molecule/app-markdown` or
 *   `bond('markdown', provider)` from `@molecule/app-bond` — both route through
 *   the shared registry; `requireProvider()` throws until one has run.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
