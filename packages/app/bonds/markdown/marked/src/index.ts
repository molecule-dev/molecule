/**
 * Markdown provider for `@molecule/app-markdown`, backed by `marked`:
 * CommonMark + GitHub Flavored Markdown rendered to an HTML string,
 * synchronously, with no DOM and no UI framework. The same provider serves
 * a browser preview and a Node build step, so a static site generator can
 * render posts at build time with the bond the app already uses.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-markdown'
 * import { provider } from '@molecule/app-markdown-marked'
 *
 * setProvider(provider) // once, at startup (bonds.ts) — or in a build script
 *
 * const { html, toc } = requireProvider().render('## Hello\n\n| a | b |\n| - | - |\n| 1 | 2 |')
 * // html === '<h2 id="hello">Hello</h2>\n<table>…</table>'
 * // toc  === [{ id: 'hello', text: 'Hello', level: 2 }]
 * ```
 *
 * @remarks
 * - **Works in Node.** Nothing here touches `document` or `window`; render
 *   at build time (`node scripts/build.mjs`) exactly as in the browser. This
 *   is the provider to bond for prerendered and static sites.
 * - **Sanitization is by construction, and on by default.** With `sanitize`
 *   on, every raw HTML token in the source (`<script>`, `<b>`, an `onerror`
 *   attribute) is escaped to inert text, and a link or image whose URL has a
 *   dangerous scheme (`javascript:`, `data:`, `vbscript:`, `file:`) loses its
 *   URL (the link text stays). Only `http:`, `https:`, `mailto:`, `tel:`,
 *   relative URLs and fragments are emitted. `sanitize: false` passes raw
 *   HTML and every scheme through: reserve it for fully trusted,
 *   app-authored content, never for user- or model-generated markdown.
 * - **GFM is on by default** (tables, `~~strikethrough~~`, `- [x]` task
 *   lists, bare-URL autolinks). `gfm: false` per call or in the config gives
 *   plain CommonMark.
 * - **Honored options:** `gfm`, `sanitize`, `breaks` (a single newline in a
 *   paragraph becomes `<br>`), `linkTarget` (`_blank` also adds
 *   `rel="noopener noreferrer"`). `components` is a React-only concept and
 *   is ignored here. Headings get slug `id`s (duplicates get `-2`, `-3`, …)
 *   and `result.toc` lists them, so anchors resolve; `headingIds: false` in
 *   the config turns both off. Fenced code carries a `language-*` class,
 *   highlighter-ready; colorizing is the app's concern.
 * - **Malformed markdown never throws.** An unclosed `**`, a broken `[link](`
 *   or a half-open code fence renders as readable text.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
