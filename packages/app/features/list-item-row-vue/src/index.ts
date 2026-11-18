/**
 * Vue generic list-item row.
 *
 * Exports `<ListItemRow>` — leading slot (icon/avatar/thumbnail) + up to three
 * text lines (title / subtitle / metadata) + right-side actions. Props: `title`,
 * `subtitle?`, `metadata?`, `leading?`, `actions?`, `toggle?`, `onClick?`,
 * `selected?`, `disabled?`, `density?` (`'comfortable'` default | `'compact'`),
 * `className?`.
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
 * - `selected` only sets the `aria-current="true"` attribute — no built-in
 *   highlight. Pass a highlight class via `className` (or target
 *   `[aria-current="true"]` in host CSS) to make selection visible.
 * - With `onClick` the whole row is clickable through a transparent native
 *   button over it, named by the title (`aria-labelledby`); Enter / Space on
 *   that button run the same handler a click anywhere on the row runs, and the
 *   inner controls (the `actions` slot) sit above the button and keep their
 *   own clicks.
 * - `disabled` halves the opacity and disables the open button (no pointer
 *   cursor, no activation); there is no `data-mol-id` prop.
 * - Styling resolves through `getClassMap()` — wire a ClassMap bond first.
 * - Node-valued props arrive as a prop AND a same-named slot; components accept
 *   either (the slot wins).
 *
 * @module
 */

export * from './ListItemRow.js'
export * from './types.js'
