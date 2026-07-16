/**
 * Markdown rendering core interface for molecule.dev.
 *
 * Provides a standardized API for rendering markdown content into HTML,
 * with support for GFM, syntax highlighting, and table of contents extraction.
 * Bond a provider (e.g. `@molecule/app-markdown-react-markdown`) to supply
 * the concrete implementation.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-markdown'
 * import { provider } from '@molecule/app-markdown-react-markdown'
 *
 * setProvider(provider) // once, at startup (bonds.ts)
 *
 * const result = requireProvider().render('# Hello World', { gfm: true })
 * console.log(result.html) // sanitized HTML string
 * ```
 *
 * @remarks
 * - **Wire a bond at startup** — {@link requireProvider} throws until
 *   `setProvider(provider)` has been called.
 * - **`sanitize` defaults to `true` and is the XSS gate.** The result is an
 *   HTML STRING you inject via your framework's raw-HTML mechanism — that is
 *   only safe because it was sanitized. NEVER pass `sanitize: false` for
 *   user-supplied or model-generated markdown (chat replies, comments, notes);
 *   reserve it for fully trusted, app-authored content.
 * - Options are per-call (`gfm`, `breaks`, `syntaxHighlight`, `linkTarget`);
 *   `result.toc` carries extracted headings when the provider supports it.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
