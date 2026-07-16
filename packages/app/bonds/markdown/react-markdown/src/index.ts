/**
 * Markdown provider for `@molecule/app-markdown` — a small built-in
 * regex-based renderer producing a sanitized HTML string. Despite the name,
 * this bond does NOT use the react-markdown library (no dependency) and is
 * framework-agnostic.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-markdown-react-markdown'
 * import { setProvider } from '@molecule/app-markdown'
 *
 * setProvider(provider)   // once, at app startup (bonds.ts)
 * ```
 *
 * @remarks
 * - **`gfm` and `syntaxHighlight` are currently INERT** — no tables,
 *   strikethrough, or task lists render, and fenced code only gets a
 *   `language-*` class (bring your own highlighter CSS). Supported: headings
 *   (with slug ids), fenced + inline code, blockquotes, bold/italic, images,
 *   links, horizontal rules, flat `<li>` items, `breaks`, `linkTarget`. If the
 *   app needs real GFM, that's a provider gap — not a usage bug.
 * - `sanitize` defaults to `true` and is the XSS gate (full-source escaping +
 *   an http/https/mailto scheme allow-list). Keep it on for user- or
 *   model-generated content; see `@molecule/app-markdown`'s remarks.
 * - **Wire with `setProvider()` from `@molecule/app-markdown`** — the core
 *   keeps a module-local singleton; a generic `bond('markdown', …)` silently
 *   no-ops and `requireProvider()` throws.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
