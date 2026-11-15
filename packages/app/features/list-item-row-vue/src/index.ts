/**
 * Vue generic list-item row.
 *
 * Exports `<ListItemRow>` — leading slot (icon/avatar/thumbnail) + up to three
 * text lines (title / subtitle / metadata) + right-side actions. Props: `title`,
 * `subtitle?`, `metadata?`, `leading?`, `actions?`, `onClick?`, `selected?`,
 * `disabled?`, `density?` (`'comfortable'` default | `'compact'`), `className?`.
 * Use for nav lists, mobile menus, search results, picker dialogs, inbox threads.
 * For table rows use `<RowWithActions>` from `@molecule/app-data-table-ui-vue`
 * instead — this component is not a `<tr>`. It is the Vue counterpart of
 * `@molecule/app-list-item-row-react`: same props and the same DOM for the same
 * input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { ListItemRow } from '@molecule/app-list-item-row-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     return () =>
 *       h(ListItemRow, {
 *         title: 'Project Alpha',
 *         subtitle: 'Last edited 2 hours ago',
 *         metadata: '3 collaborators · 12 files',
 *         leading: h('img', { src: '/icons/folder.svg', alt: '', width: 32, height: 32 }),
 *         actions: h('button', { onClick: () => openMenu('alpha') }, 'Menu'),
 *         onClick: () => navigate('/projects/alpha'),
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * - `selected` only sets the `aria-selected` attribute — no built-in highlight.
 *   Pass a highlight class via `className` (or target `[aria-selected="true"]` in
 *   host CSS) to make selection visible.
 * - Clicks inside `actions` are stopPropagation'd automatically, so action buttons
 *   never trigger the row `onClick`.
 * - `disabled` halves the opacity and disables `onClick`; there is no
 *   `data-mol-id` prop.
 * - Styling resolves through `getClassMap()` — wire a ClassMap bond first.
 * - Node-valued props arrive as a prop AND a same-named slot; components accept
 *   either (the slot wins).
 *
 * @module
 */

export * from './ListItemRow.js'
export * from './types.js'
