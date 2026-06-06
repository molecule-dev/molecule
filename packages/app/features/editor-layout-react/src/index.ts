/**
 * React editor layout scaffold.
 *
 * Exports `<EditorLayout>` — sticky top bar + main canvas + optional side panel.
 * Used for blog post editors, product editors, bot flow editors, etc.
 *
 * @example
 * ```tsx
 * import { EditorLayout } from '@molecule/app-editor-layout-react'
 *
 * <EditorLayout
 *   topBar={<EditorToolbar title="Untitled post" />}
 *   canvas={<ArticleEditor />}
 *   sidePanel={<MetadataPanel />}
 *   sidePanelOpen={true}
 * />
 * ```
 * @module
 */

export * from './EditorLayout.js'
