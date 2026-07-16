/**
 * React editor layout scaffold.
 *
 * Exports `<EditorLayout>` — sticky top bar + main canvas + optional side
 * panel. Used for blog post editors, product editors, bot flow editors, etc.
 *
 * @example
 * ```tsx
 * import { EditorLayout } from '@molecule/app-editor-layout-react'
 * import { EditorToolbar } from '@molecule/app-editor-toolbar-react'
 *
 * <EditorLayout
 *   topBar={<EditorToolbar title="Untitled post" />}
 *   canvas={<ArticleEditor />}
 *   sidePanel={<MetadataPanel />}
 *   sidePanelOpen={true}
 * />
 * ```
 *
 * @remarks
 * - The scaffold claims the FULL viewport height (h-screen flex column).
 *   Render it as the page root; nesting it below another fixed-height app
 *   shell produces double scrollbars.
 * - The side panel container sets flex-shrink 0 but NO width — your
 *   `sidePanel` content must define its own width.
 * - `topBar` is wrapped in a sticky container by the layout itself (unlike
 *   `<DetailPageLayout>`); the slot does not need its own stickiness, but
 *   should bring a surface background.
 * - `ArticleEditor` and `MetadataPanel` above are your own components.
 * - Styling resolves through `getClassMap()` — requires a wired ClassMap
 *   bond (standard molecule app setup). No text of its own.
 *
 * @module
 */

export * from './EditorLayout.js'
