/**
 * React editor-top toolbar.
 *
 * Exports `<EditorToolbar>` — title + badge + primary/secondary action
 * groups — and the `ToolbarAction` shape. Pair with `<EditorLayout>` from
 * `@molecule/app-editor-layout-react` as its `topBar` slot.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { EditorToolbar } from '@molecule/app-editor-toolbar-react'
 * import { post, put } from '@molecule/app-http'
 * import { getClassMap } from '@molecule/app-ui'
 *
 * export function PostEditorToolbar() {
 *   const cm = getClassMap()
 *   const draft = { id: 'post-1', title: 'My Blog Post', body: 'Hello world' }
 *   const [status, setStatus] = useState<'draft' | 'published'>('draft')
 *   const [busy, setBusy] = useState(false)
 *   async function run(action: () => Promise<unknown>): Promise<void> {
 *     setBusy(true)
 *     try {
 *       await action()
 *     } finally {
 *       setBusy(false)
 *     }
 *   }
 *   const save = () => run(() => put(`/posts/${draft.id}`, { title: draft.title, body: draft.body }))
 *   const publish = () => run(async () => {
 *     await post(`/posts/${draft.id}/publish`)
 *     setStatus('published')
 *   })
 *   return (
 *     <EditorToolbar
 *       title={draft.title}
 *       badge={<span>{status === 'draft' ? 'Draft' : 'Published'}</span>}
 *       className={cm.surface}
 *       primaryActions={[
 *         { id: 'save', label: 'Save', onClick: () => void save(), variant: 'outline', disabled: busy },
 *         { id: 'publish', label: 'Publish', onClick: () => void publish(), variant: 'solid', color: 'primary', disabled: busy || status === 'published' },
 *       ]}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - `sticky` defaults to TRUE and applies `position: sticky; top: 0` with
 *   a TRANSPARENT background — pass `className={getClassMap().surface}` or
 *   page content will scroll visibly through the toolbar.
 * - It does NOT save, publish or track busy state: `onClick` is fire-and-forget
 *   (a returned promise is ignored and its rejection is not caught) — do the
 *   HTTP call yourself (`@molecule/app-http`) and feed `disabled` from your
 *   own state to block double submits. There is no `loading` prop.
 * - Action `label`s render verbatim (into the button and nothing else) —
 *   pass already-translated strings; the component has no `t()` calls or
 *   locale bond of its own.
 * - Prefer `onClick` over `href`: an `href` action wraps the button in a
 *   plain anchor (full page navigation, and invalid button-in-anchor
 *   nesting for assistive tech).
 * - A 1px divider renders between the primary and secondary groups only
 *   when both are non-empty.
 * - Buttons come from `@molecule/app-ui-react` (peer dependency); styling
 *   goes through `getClassMap()`, which throws unless `setClassMap(classMap)`
 *   (from `@molecule/app-ui`) ran at startup.
 *
 * @module
 */

export * from './EditorToolbar.js'
