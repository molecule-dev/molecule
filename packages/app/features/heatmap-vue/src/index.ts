/**
 * Vue GitHub-contributions-style year-grid activity heatmap. SVG-based, no
 * library dependency, configurable cell size / gap / palette / range,
 * accessible per-cell `aria-label` and `data-mol-id` attributes.
 *
 * Used across habit-tracker, language-learning, lms (review/XP/attendance
 * heatmaps), workout-tracker, and similar "activity-by-day" surfaces.
 *
 * This is the Vue counterpart of `@molecule/app-heatmap-react`: the same
 * props (React names), the same ClassMap classes, the same SVG geometry and
 * callbacks, and therefore the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { Heatmap } from '@molecule/app-heatmap-vue'
 *
 * const start = new Date(2025, 0, 1)
 * const end = new Date(2025, 11, 31)
 *
 * const App = defineComponent({
 *   setup() {
 *     return () =>
 *       h(Heatmap, {
 *         data: [
 *           { date: '2025-01-15', value: 3 },
 *           { date: '2025-02-04', value: 8 },
 *         ],
 *         range: { start, end },
 *         onCellClick: (cell) => console.log(cell.date, cell.value),
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * - All UI text routes through `t('heatmap.*')` — drop in
 *   `@molecule/app-locales-heatmap` for translated month / weekday / tooltip
 *   strings. The Vue binding's `useTranslation()` needs a bonded provider, and
 *   `getClassMap()` needs a bonded ClassMap.
 * - The default `'quantile'` palette's zero bucket is `rgba(0,0,0,0.06)` —
 *   near-invisible on dark themes. Dark/theme-aware hosts should pass an
 *   explicit `colorScale` of EXACTLY 5 colors (light → dark); buckets are
 *   fixed at 0-4, so shorter arrays leave cells unfilled.
 * - Weekday gutter labels render every OTHER row (Mon/Wed/Fri pattern), like
 *   GitHub's contribution graph.
 *
 * @module
 */

export * from './Heatmap.js'
export * from './types.js'
