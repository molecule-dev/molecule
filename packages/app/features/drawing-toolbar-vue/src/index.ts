/**
 * Vue whiteboard / canvas / annotation tool selector.
 *
 * Exports `<DrawingToolbar>` (a `role="toolbar"` row/column of toggle
 * buttons) — the Vue counterpart of `@molecule/app-drawing-toolbar-react`:
 * same props and the same DOM for the same input. Selection is controlled:
 * pass `selectedId` + `onSelect`.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { DrawingToolbar } from '@molecule/app-drawing-toolbar-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     const tool = ref('select')
 *     return () =>
 *       h(DrawingToolbar, {
 *         tools: [
 *           { id: 'select', label: 'Select', icon: '↖' },
 *           { id: 'pen', label: 'Pen', icon: '✎' },
 *           { id: 'rectangle', label: 'Rectangle', icon: '▭' },
 *         ],
 *         selectedId: tool.value,
 *         onSelect: (id: string) => (tool.value = id),
 *         orientation: 'horizontal',
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * - `tools` defaults to a standard set (select, rectangle, ellipse, arrow,
 *   text, sticky, pen, eraser) — always pass your own list, with `label`
 *   already translated via your `t()` call (labels feed each button's
 *   `aria-label` and `title` verbatim).
 * - The toolbar's own aria-label resolves through `t('drawingToolbar.label')`
 *   with an English fallback; companion locale bond:
 *   `@molecule/app-locales-drawing-toolbar`.
 * - When a tool has no `icon`, the first character of `label` is shown.
 * - `extras` (prop or same-named slot) renders after the tool buttons — drop
 *   in color pickers or stroke-width controls.
 * - Buttons come from `@molecule/app-ui-vue`; requires a wired ClassMap
 *   bond and the app i18n plugin (standard molecule app setup).
 *
 * @module
 */

export * from './DrawingToolbar.js'
export * from './types.js'
