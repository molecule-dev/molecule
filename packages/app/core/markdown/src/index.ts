/**
 * Markdown rendering core interface for molecule.dev.
 *
 * Provides a standardized API for rendering markdown content into HTML,
 * with support for GFM, syntax highlighting, and table of contents extraction.
 * Bond a provider (e.g. `@molecule/app-markdown-react-markdown`) to supply
 * the concrete implementation.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { requireProvider } from '@molecule/app-markdown'
 *
 * const md = requireProvider()
 * const result = md.render('# Hello World', { gfm: true })
 * console.log(result.html)
 * ```
 */

export * from './provider.js'
export * from './types.js'
