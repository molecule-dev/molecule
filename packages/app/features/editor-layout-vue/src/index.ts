/**
 * Vue editor layout scaffold.
 *
 * Exports `<EditorLayout>` — sticky top bar + main canvas + optional side
 * panel. It is the Vue counterpart of `@molecule/app-editor-layout-react`:
 * the same props (React names) and the same DOM for the same input. Used for
 * blog post editors, product editors, bot flow editors, etc.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { EditorLayout } from '@molecule/app-editor-layout-vue'
 * import { EditorToolbar } from '@molecule/app-editor-toolbar-vue'
 *
 * const Editor = defineComponent({
 *   setup() {
 *     return () =>
 *       h(EditorLayout, {
 *         topBar: h(EditorToolbar, { title: 'Untitled post' }),
 *         canvas: h(ArticleEditor),
 *         sidePanel: h(MetadataPanel),
 *         sidePanelOpen: true,
 *       })
 *   },
 * })
 *
 * createApp(Editor).mount('#app')
 * ```
 *
 * @remarks
 * - The scaffold claims the FULL viewport height (`h-screen flex column`).
 *   Render it as the page root; nesting it below another fixed-height app
 *   shell produces double scrollbars.
 * - The side panel container sets `flex-shrink 0` but NO width — your
 *   `sidePanel` content must define its own width.
 * - `topBar` is wrapped in a sticky container by the layout itself; the slot
 *   does not need its own stickiness, but should bring a surface background.
 * - Node-valued props (`topBar`, `canvas`, `sidePanel`) arrive as a prop AND a
 *   same-named slot; components accept either.
 * - `ArticleEditor` and `MetadataPanel` above are your own components.
 * - Styling resolves through `getClassMap()` — requires a wired ClassMap bond
 *   (standard molecule app setup). No text of its own.
 *
 * @module
 */

export * from './EditorLayout.js'
export * from './types.js'
