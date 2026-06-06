/**
 * React editor-top toolbar.
 *
 * Exports `<EditorToolbar>` — title + badge + primary/secondary actions.
 *
 * @example
 * ```tsx
 * import { EditorToolbar } from '@molecule/app-editor-toolbar-react'
 *
 * <EditorToolbar
 *   title="My Blog Post"
 *   badge={<span>Draft</span>}
 *   primaryActions={[
 *     { id: 'save', label: 'Save', onClick: () => save(), variant: 'outline' },
 *     { id: 'publish', label: 'Publish', onClick: () => publish(), variant: 'solid', color: 'primary' },
 *   ]}
 * />
 * ```
 * @module
 */

export * from './EditorToolbar.js'
