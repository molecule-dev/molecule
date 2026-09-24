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
 * import { useState } from 'react'
 *
 * import { Heatmap, type HeatmapCell, type HeatmapDay } from '@molecule/app-heatmap-react'
 *
 * export function ActivityHeatmap() {
 *   const [picked, setPicked] = useState<HeatmapCell | null>(null)
 *   const data: HeatmapDay[] = [
 *     { date: '2025-01-15', value: 3 },
 *     { date: '2025-02-04', value: 8 },
 *     { date: '2025-03-21', value: 1 },
 *   ]
 *   return (
 *     <>
 *       <Heatmap
 *         data={data}
 *         range={{ start: new Date(2025, 0, 1), end: new Date(2025, 11, 31) }}
 *         showWeekdayLabels
 *         onCellClick={setPicked}
 *       />
 *       {picked && <output>{`${picked.date}: ${picked.value}`}</output>}
 *     </>
 *   )
 * }
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
 * - `range` takes `Date` objects but `data[].date` MUST be a local-time
 *   `yyyy-mm-dd` string — ISO timestamps (`2025-01-15T00:00:00Z`) never match
 *   a cell. Dates in the range with no entry render as value 0 / bucket 0.
 * - The SVG has a fixed pixel size (`cellSize` + `gap` per week, ~53 weeks
 *   for a year) — it does NOT shrink to its container; wrap it in a
 *   horizontally scrollable parent on narrow screens.
 * - Weekday gutter labels render every OTHER row (Mon/Wed/Fri pattern), like
 *   GitHub's contribution graph.
 *
 * @module
 */

export * from './Heatmap.js'
