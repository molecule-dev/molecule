/**
 * GitHub-contributions-style year-grid activity heatmap. SVG-based, no
 * library dependency, configurable cell size / gap / palette / range,
 * accessible per-cell `aria-label` and `data-mol-id` attributes.
 *
 * Used across habit-tracker, language-learning, lms (review/XP/attendance
 * heatmaps), workout-tracker, and similar "activity-by-day" surfaces.
 *
 * @example
 * ```tsx
 * import { Heatmap } from '@molecule/app-heatmap-react'
 *
 * const start = new Date(2025, 0, 1)
 * const end = new Date(2025, 11, 31)
 *
 * <Heatmap
 *   data={[{ date: '2025-01-15', value: 3 }, { date: '2025-02-04', value: 8 }]}
 *   range={{ start, end }}
 *   onCellClick={(c) => console.log(c.date, c.value)}
 * />
 * ```
 *
 * @remarks
 * - All UI text routes through `t('heatmap.*')` — drop in
 *   `@molecule/app-locales-heatmap` for translated month / weekday / tooltip
 *   strings. `useTranslation()` THROWS outside `@molecule/app-react`'s
 *   `I18nProvider`, and `getClassMap()` needs a bonded ClassMap.
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
