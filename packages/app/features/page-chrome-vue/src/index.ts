/**
 * Vue page-header and hero-section primitives — the Vue counterpart of
 * `@molecule/app-page-chrome-react`: the same props (React names), the same
 * DOM for the same input.
 *
 * Exports:
 * - `<PageHeader>` — top-of-page header with breadcrumbs + title/subtitle +
 *   leading icon + right-aligned actions + meta row. `emphasis="extrabold"`
 *   switches the title to the larger dashboard treatment.
 * - `<HeroSection>` — dashboard/landing hero with text + optional media
 *   column; `align="center"` for marketing-style heroes.
 *
 * Both accept `className` for per-brand accent styling and `dataMolId` for
 * AI-agent selectors. Node-valued props arrive as a prop AND as a same-named
 * slot; components accept either.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { HeroSection, PageHeader } from '@molecule/app-page-chrome-vue'
 * import { Button } from '@molecule/app-ui-vue'
 *
 * const ProjectsPage = defineComponent({
 *   setup() {
 *     const open = ref(false)
 *     return () =>
 *       h('div', [
 *         h(PageHeader, {
 *           title: 'Projects',
 *           subtitle: 'Manage your active projects',
 *         }, {
 *           actions: () => [h(Button, { onClick: () => (open.value = true) }, () => 'New project')],
 *         }),
 *         h(HeroSection, {
 *           eyebrow: 'Welcome back',
 *           title: 'Your workspace',
 *           description: 'Everything you need to ship faster.',
 *         }, {
 *           primaryAction: () => [h(Button, { variant: 'solid' }, () => 'Get started')],
 *         }),
 *       ])
 *   },
 * })
 *
 * createApp(ProjectsPage).mount('#app')
 * ```
 *
 * @remarks
 * Not to be confused with `@molecule/app-ui-vue`'s own `<PageHeader>`
 * (props: `title`/`description`/`actions`/`breadcrumbs`): THIS PageHeader
 * takes `subtitle` (not `description`) and adds `icon`, `meta`, and
 * `emphasis`. Import from the package that matches the props you pass.
 * Styling resolves via `getClassMap()` from `@molecule/app-ui`, so a ClassMap
 * bond (e.g. `@molecule/app-ui-tailwind`) must be wired before render.
 *
 * @module
 */

export * from './HeroSection.js'
export * from './PageHeader.js'
export * from './types.js'
