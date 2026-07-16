/**
 * Rich text editor interface for molecule.dev.
 *
 * Provides a unified API for rich text editing that can be backed by
 * different editor implementations. Wire a provider with `setProvider()`;
 * `@molecule/app-rich-text-quill` is the shipped production bond.
 *
 * @example
 * ```ts
 * import { createEditor, htmlToValue, setProvider } from '@molecule/app-rich-text'
 * import type { TextChangeData } from '@molecule/app-rich-text'
 * import { provider as quillProvider } from '@molecule/app-rich-text-quill'
 *
 * // Wire the provider once at app startup
 * setProvider(quillProvider)
 *
 * // Create an editor instance attached to a DOM container
 * const container = document.getElementById('editor')!
 * const editor = createEditor({ container, placeholder: 'Start typing…', toolbar: 'standard' })
 *
 * editor.on<TextChangeData>('text-change', ({ value }) => console.log(value.text))
 *
 * // Convert existing HTML into the editor
 * editor.setValue(htmlToValue('<p>Hello <strong>world</strong></p>'))
 * ```
 *
 * @remarks
 * - Toolbar presets are `'minimal' | 'standard' | 'full'` (see
 *   `defaultToolbars`). There is no `'basic'` preset — the quill bond
 *   silently substitutes `standard` for unknown names.
 * - If you never call `setProvider()`, the first editor call silently
 *   self-bonds a minimal contentEditable fallback: NO toolbar UI, no delta
 *   support, basic formatting only. Fine for plain notes; wire the quill
 *   bond for real editing. `hasProvider()` reports whether a provider was
 *   explicitly bonded before this fallback kicks in.
 * - The fallback sanitizes all HTML through DOMPurify (bundled). Other
 *   providers own their own sanitization — always treat stored HTML as
 *   untrusted when rendering outside the editor.
 * - Browser-only: `createEditor` touches `document`/`window` — do not call
 *   during SSR.
 *
 * @module
 */

export * from './editor.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
