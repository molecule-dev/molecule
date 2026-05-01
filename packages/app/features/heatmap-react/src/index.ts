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
 * All UI text routes through `t('heatmap.*')` from `@molecule/app-react`'s
 * `useTranslation()`. Drop in `@molecule/app-locales-heatmap-react` for
 * translated month / weekday / tooltip strings.
 *
 * @module
 */

export * from './Heatmap.js'
