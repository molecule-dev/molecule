/**
 * Rich text editor interface for molecule.dev.
 *
 * Provides a unified API for rich text editing that can be backed by
 * different editor implementations (Quill, TipTap, Slate, etc.).
 *
 * @example
 * ```ts
 * import { setProvider, createEditor, htmlToValue } from '@molecule/app-rich-text'
 * import { quillProvider } from '@molecule/app-rich-text-quill'
 *
 * // Wire the provider once at app startup
 * setProvider(quillProvider)
 *
 * // Create an editor instance attached to a DOM container
 * const container = document.getElementById('editor')!
 * const editor = createEditor({ container, placeholder: 'Start typing…', toolbar: 'basic' })
 *
 * editor.on('text-change', ({ value }) => console.log(value.text))
 *
 * // Convert existing HTML into the editor
 * editor.setValue(htmlToValue('<p>Hello <strong>world</strong></p>'))
 * ```
 *
 * @module
 */

export * from './editor.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
