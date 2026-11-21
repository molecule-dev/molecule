/**
 * React labeled progress bar and progress-card wrapper.
 *
 * Exports:
 * - `<ProgressBar>` — standalone bar with optional label + value display.
 * - `<ProgressCard>` — `<Card>`-wrapped progress display (title, icon,
 *   description, bar, optional extras slot).
 *
 * @example
 * ```tsx
 * import { ProgressBar, ProgressCard } from '@molecule/app-progress-bar-react'
 *
 * <ProgressBar value={65} label="Upload progress" valueLabel="65%" color="primary" />
 *
 * <ProgressCard
 *   title="Storage used"
 *   description="8.5 GB of 10 GB"
 *   value={85}
 *   valueLabel="85%"
 *   color="warning"
 * />
 * ```
 *
 * @remarks
 * All visible text (`label`, `valueLabel`, `title`, `description`) is
 * pass-through — supply already-translated strings. The track's fallback
 * accessible name resolves through `t('progressBar.label', undefined,
 * { defaultValue: 'Progress' })`, so a locale bond can translate it; a
 * rendered `label` or a `labelledBy` id names it instead. Requires a wired
 * ClassMap bond: the track/fill styles come from the `progress*` ClassMap
 * tokens, so colors follow the active theme.
 *
 * @module
 */

export * from './ProgressBar.js'
export * from './ProgressCard.js'
