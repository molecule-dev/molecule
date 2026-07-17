/**
 * Markdown provider for `@molecule/app-markdown`, backed by the real
 * `react-markdown` 10 library plus `remark-gfm`.
 *
 * The core contract returns an HTML STRING (`render(): { html: string; toc? }`),
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
 * const { html } = requireProvider().render('| a | b |\n| - | - |\n| 1 | 2 |')
 * // html === '<table>…</table>'  (a real GFM table)
 * ```
 *
 * @remarks
 * - **GFM is real and on by default.** Tables, `~~strikethrough~~`,
 *   `- [x]` task lists, bare-URL autolinks, and footnotes all render. Set
 *   `gfm: false` (per call or in {@link ReactMarkdownConfig}) to fall back to
 *   plain CommonMark — a pipe table then renders as literal text.
 * - **Raw HTML is never executed.** react-markdown does not include
 *   `rehype-raw`, so any raw HTML in the source (`<script>`, `<b>`, an
 *   `onerror` attribute) is escaped to inert text — the bond is XSS-safe for
 *   raw HTML unconditionally. The `sanitize` flag therefore governs only URL
 *   filtering: on (default) strips dangerous `href`/`src` schemes
 *   (`javascript:`, `data:`, …) via `defaultUrlTransform`; off lets all schemes
 *   through for trusted, app-authored content. `sanitize: false` does NOT
 *   enable raw-HTML passthrough. Keep sanitize on for user- or model-generated
 *   markdown.
 * - **Honored options:** `gfm`, `sanitize`, `breaks` (soft breaks → `<br>`),
 *   `linkTarget` (`_blank` also adds `rel="noopener noreferrer"`), and
 *   `components` (custom tag overrides). Headings get slug `id`s so `result.toc`
 *   anchors resolve. For syntax highlighting, fenced code always carries a
 *   `language-*` class (highlighter-ready); to actually colorize, pass a rehype
 *   highlighter (e.g. `rehype-highlight`) via `config.rehypePlugins`.
 * - **{@link ReactMarkdownConfig}** additionally exposes `remarkPlugins`,
 *   `rehypePlugins`, `allowedElements`, and `disallowedElements` for
 *   provider-level customization at {@link createProvider} time.
 * - **Wire it** with `setProvider()` from `@molecule/app-markdown` or
 *   `bond('markdown', provider)` from `@molecule/app-bond` — both route through
 *   the shared registry; `requireProvider()` throws until one has run.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
