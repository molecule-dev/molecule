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
 * @remarks
 * - **Import Quill's theme stylesheet yourself** — this package does not:
 *   `import 'quill/dist/quill.snow.css'` (or `quill.bubble.css` for `theme: 'bubble'`).
 *   Without it the editor renders unstyled and the toolbar is a broken list.
 * - **Call `setProvider(...)` explicitly.** If you forget, `@molecule/app-rich-text`
 *   silently falls back to its built-in contentEditable provider — the app appears to
 *   work but without Quill's toolbar presets, delta support, or theming. No error is
 *   thrown.
 * - **Browser-only.** `createEditor({ container })` requires a mounted DOM element and
 *   `htmlToValue()` touches `document` — in SSR frameworks construct editors in a
 *   client-only effect.
 * - `htmlToValue()` returns `delta: undefined` (delta conversion needs a live editor);
 *   initialize editors from `value.html` or convert via an editor instance.
 * - Untrusted HTML is sanitized on the way IN (DOMPurify in `htmlToValue`, Quill's
 *   clipboard allowlist for stored HTML) — but `editor.getHTML()` is raw editor DOM:
 *   still sanitize server-side before persisting/re-serving user content.
 * - Toolbar: pass a preset name (`'minimal' | 'standard' | 'full'`), a custom
 *   `ToolbarConfig`, or `toolbar: false`; presets live in `quillToolbars`.
 *
 * @module
 */

export * from './editor.js'
export * from './provider.js'
export * from './toolbars.js'
export * from './types.js'

// Re-export Quill for advanced usage
export { default as Quill } from 'quill'
