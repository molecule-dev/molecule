/**
 * Vue detail-page layout scaffold.
 *
 * Exports `<DetailPageLayout>` — breadcrumb + top bar + [main column +
 * optional sidebar]. All regions are node slots (a prop or a same-named
 * slot). It is the Vue counterpart of `@molecule/app-detail-page-layout-react`:
 * same props and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { DetailPageLayout } from '@molecule/app-detail-page-layout-vue'
 * import { Breadcrumb } from '@molecule/app-breadcrumb-vue'
 * import { DetailHeader } from '@molecule/app-detail-header-vue'
 *
 * const Page = defineComponent({
 *   setup() {
 *     return () =>
 *       h(DetailPageLayout, {
 *         breadcrumb: h(Breadcrumb, { items: crumbs }),
 *         topBar: h(DetailHeader, { title: recipe.title, actions: editButton, sticky: true }),
 *         sidebar: h(RelatedRecipes, { ids: recipe.relatedIds }),
 *         sidebarPosition: 'right',
 *         sidebarWidth: 'md',
 *         dataMolId: 'recipe-detail',
 *       }, {
 *         default: () => [h(RecipeSections, { recipe })],
 *       })
 *   },
 * })
 *
 * createApp(Page).mount('#app')
 * ```
 *
 * @remarks
 * - The layout itself does NOT make `topBar` sticky — it just stacks the
 *   regions. Use a slot component that brings its own stickiness (e.g.
 *   `<DetailHeader sticky>`), or wrap your top bar in a sticky container.
 * - `sidebarWidth` presets are fixed flex-basis widths: sm = 256px,
 *   md = 320px, lg = 384px. There is no built-in responsive collapse —
 *   hide the sidebar yourself on narrow viewports if needed.
 * - `RecipeSections` and `RelatedRecipes` above are your own app
 *   components — any node works in the slots, passed as a prop or a
 *   same-named slot.
 * - Styling resolves through `getClassMap()` — requires a wired ClassMap
 *   bond (standard molecule app setup).
 *
 * @module
 */

export * from './DetailPageLayout.js'
export * from './types.js'
