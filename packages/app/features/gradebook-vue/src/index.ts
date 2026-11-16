/**
 * Vue gradebook UI — unified table of grades + optional GPA hero card.
 *
 * Pairs with the `@molecule/api-resource-grade` resource. Rows can be courses
 * or assignments — the caller picks the granularity. The letter column renders
 * `Grade.letter` as plain text (string); pass pre-styled content via `title`
 * if you need richer cells.
 *
 * This is the Vue counterpart of `@molecule/app-gradebook-react`: the same
 * exports, the same props (React names), and the same DOM for the same input,
 * so an app switches framework by changing only the package name in its
 * imports. Node-valued props (`GpaCard`'s `trendLabel`, a row's `title` and
 * `postedAt`) arrive as a prop or as a same-named slot.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 *
 * import type { Grade } from '@molecule/app-gradebook-vue'
 * import { GpaCard, Gradebook } from '@molecule/app-gradebook-vue'
 *
 * const rows: Grade[] = [
 *   { id: 'g1', title: 'Algebra II', letter: 'A-', score: 92, weight: 0.25, contribution: 0.92 },
 * ]
 *
 * const GradesPage = defineComponent({
 *   setup() {
 *     return () =>
 *       h('div', [
 *         h(GpaCard, { gpa: 3.72, scale: '4.0', trend: 'up' }),
 *         h(Gradebook, { gpaScale: '4.0', grades: rows }),
 *       ])
 *   },
 * })
 *
 * createApp(GradesPage).mount('#app')
 * ```
 *
 * @remarks
 * All visible text routes through `t()` via the companion
 * `@molecule/app-locales-gradebook` locale bond. Both components call
 * `useTranslation()` from `@molecule/app-vue` (it falls back to the bonded
 * provider, so it throws when no provider is installed) and `getClassMap()`
 * (requires a bonded ClassMap such as `@molecule/app-ui-tailwind`) — wire both
 * before rendering. No Tailwind utilities appear in this package.
 *
 * @module
 */

export * from './GpaCard.js'
export * from './Gradebook.js'
export * from './types.js'
export * from './utilities.js'
