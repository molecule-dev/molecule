/**
 * Quill v2 rich text editor provider for molecule.dev.
 *
 * Implements the RichTextProvider interface using Quill v2.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-rich-text'
 * import { createQuillProvider } from '@molecule/app-rich-text-quill'
 *
 * setProvider(createQuillProvider())
 * ```
 *
 * @module
 */

export * from './editor.js'
export * from './provider.js'
export * from './toolbars.js'
export * from './types.js'

// Re-export Quill for advanced usage
export { default as Quill } from 'quill'
