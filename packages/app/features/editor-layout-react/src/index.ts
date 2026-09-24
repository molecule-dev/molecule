/**
 * React editor layout scaffold.
 *
 * Exports `<EditorLayout>` — sticky top bar + main canvas + optional side
 * panel. Used for blog post editors, product editors, bot flow editors, etc.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { EditorLayout } from '@molecule/app-editor-layout-react'
 * import { EditorToolbar } from '@molecule/app-editor-toolbar-react'
 * import { getClassMap } from '@molecule/app-ui'
 *
 * export function PostEditorPage() {
 *   const cm = getClassMap()
 *   const [body, setBody] = useState('')
 *   const [panelOpen, setPanelOpen] = useState(true)
 *   return (
 *     <EditorLayout
 *       dataMolId="post-editor"
 *       topBar={
 *         <EditorToolbar
 *           title="Untitled post"
 *           className={cm.surface}
 *           primaryActions={[
 *             { id: 'settings', label: panelOpen ? 'Hide settings' : 'Show settings', onClick: () => setPanelOpen(!panelOpen) },
 *           ]}
 *         />
 *       }
 *       canvas={<textarea aria-label="Post body" value={body} onChange={(e) => setBody(e.target.value)} />}
 *       sidePanel={
 *         <section style={{ width: 320 }}>
 *           <h2>Post settings</h2>
 *         </section>
 *       }
 *       sidePanelOpen={panelOpen}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - The scaffold claims the FULL viewport height (`cm.h('screen')` flex column).
 *   Render it as the page root; nesting it below another fixed-height app
 *   shell produces double scrollbars.
 * - The side panel container sets flex-shrink 0 but NO width — your
 *   `sidePanel` content must define its own width.
 * - `topBar` is wrapped in a sticky container by the layout itself (unlike
 *   `<DetailPageLayout>`); the slot does not need its own stickiness, but
 *   should bring a surface background.
 * - `topBar` and `canvas` are REQUIRED. The panel shows only when `sidePanel`
 *   is given AND `sidePanelOpen` (default `true`) — the layout has no toggle
 *   button of its own; keep `sidePanelOpen` in your state. `sidePanelPosition`
 *   defaults to `'right'`.
 * - Styling resolves through `getClassMap()`, which throws unless the app
 *   called `setClassMap(classMap)` (from `@molecule/app-ui`, e.g. with
 *   `@molecule/app-ui-tailwind`) at startup. No text of its own.
 *
 * @module
 */

export * from './EditorLayout.js'
