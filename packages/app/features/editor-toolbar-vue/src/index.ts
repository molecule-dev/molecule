/**
 * Vue editor-top toolbar.
 *
 * Exports `<EditorToolbar>` — title + badge + primary/secondary action groups —
 * and the `ToolbarAction` shape. Pair it with `<EditorLayout>` from
 * `@molecule/app-editor-layout-vue` as its `topBar` slot.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { EditorToolbar } from '@molecule/app-editor-toolbar-vue'
 *
 * const Page = defineComponent({
 *   setup() {
 *     return () =>
 *       h(EditorToolbar, {
 *         title: 'My Blog Post',
 *         badge: h('span', 'Draft'),
 *         primaryActions: [
 *           { id: 'save', label: 'Save', onClick: () => save(), variant: 'outline' },
 *           {
 *             id: 'publish',
 *             label: 'Publish',
 *             onClick: () => publish(),
 *             variant: 'solid',
 *             color: 'primary',
 *           },
 *         ],
 *       })
 *   },
 * })
 *
 * createApp(Page).mount('#app')
 * ```
 *
 * @remarks
 * - `sticky` defaults to TRUE and applies `position: sticky; top: 0` with a
 *   TRANSPARENT background — pass a surface class via `className` or page
 *   content will scroll visibly through the toolbar.
 * - Action `label`s render verbatim (into the button and nothing else) — pass
 *   already-translated strings; the component has no `t()` calls or locale
 *   bond of its own.
 * - Prefer `onClick` over `href`: an `href` action wraps the button in a plain
 *   anchor (full page navigation, and invalid button-in-anchor nesting for
 *   assistive tech).
 * - A 1px divider renders between the primary and secondary groups only when
 *   both are non-empty.
 * - Buttons come from `@molecule/app-ui-vue`; requires a wired ClassMap bond
 *   (standard molecule app setup). Node-valued props accept either a prop or a
 *   same-named slot.
 *
 * @module
 */

export * from './EditorToolbar.js'
export * from './types.js'
