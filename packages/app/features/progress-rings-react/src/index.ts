/**
 * Apple-Health-style concentric SVG progress rings — single + triad.
 *
 * Exports `<ProgressRings>` for one or more rings rendered as a single SVG.
 * Designed to replace the per-app duplicates in healthcare flagships
 * (`HealthSummaryTriad`, `WellnessRingsTriad`, `RecoveryRingsTriad`,
 * `AdherenceTriad`) and the single-ring usage in business apps
 * (employee-onboarding, okr-goal-tracking).
 *
 * @example
 * ```tsx
 * import { ProgressRings } from '@molecule/app-progress-rings-react'
 *
 * <ProgressRings
 *   rings={[
 *     { value: 8200, max: 10000, color: 'var(--color-success)', label: 'Steps' },
 *     { value: 7, max: 8, color: 'var(--color-info)', label: 'Sleep (hrs)' },
 *     { value: 35, max: 60, color: 'var(--color-warning)', label: 'Active (min)' },
 *   ]}
 *   size={160}
 *   strokeWidth={12}
 * />
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-progress-rings` (aria summary
 * + per-ring labels). Ring `color` is any CSS color — pass theme tokens like
 * `var(--color-success)` so rings follow the active theme. Requires the
 * app-react i18n provider and a wired ClassMap bond. Rings nest outside-in:
 * `rings[0]` is the outermost.
 *
 * @module
 */

export * from './ProgressRings.js'
