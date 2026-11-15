/**
 * Vue detail-page header.
 *
 * Exports `<DetailHeader>` — leading slot + title/subtitle + status +
 * right-aligned actions, with an optional meta row and an optional search
 * slot. Different from `<PageHeader>` (top of list/index pages) in
 * prioritising status + search + stickiness for long-scrolling detail
 * screens. All slots are node props or same-named slots — compose any
 * components. It is the Vue counterpart of
 * `@molecule/app-detail-header-react`: same props and the same DOM for the
 * same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { DetailHeader } from '@molecule/app-detail-header-vue'
 * import { Button } from '@molecule/app-ui-vue'
 * import { StatusBadge } from '@molecule/app-status-badge-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     return () =>
 *       h(DetailHeader, {
 *         title: 'Project Alpha',
 *         subtitle: 'Last updated 2 hours ago',
 *         status: h(StatusBadge, { kind: 'success' }, () => ['Active']),
 *         actions: h(Button, { variant: 'solid', onClick: handleEdit }, () => ['Edit']),
 *         meta: h('span', 'Owner: Alice'),
 *         sticky: true,
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * - `sticky` applies `position: sticky; top: 0` but adds NO background —
 *   pass a surface class via `className` (e.g. your ClassMap's surface
 *   helper) or content will scroll visibly through the header.
 * - There is no breadcrumb prop; put a breadcrumb in the `leading` slot or
 *   render one above the header (see
 *   `@molecule/app-detail-page-layout-react`, which has a breadcrumb slot).
 * - Node-valued props arrive as a prop AND a same-named slot; components
 *   accept either.
 * - Styling resolves through `getClassMap()` — requires a wired ClassMap
 *   bond (standard molecule app setup). No text of its own, so no locale
 *   bond is needed; translate the values you pass in.
 *
 * @module
 */

export * from './DetailHeader.js'
export * from './types.js'
