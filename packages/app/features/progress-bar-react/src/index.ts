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
 * All text (`label`, `valueLabel`, `title`, `description`) is pass-through —
 * supply already-translated strings; the package renders no text of its own.
 * Requires a wired ClassMap bond: the track/fill styles come from the
 * `progress*` ClassMap tokens, so colors follow the active theme.
 *
 * @module
 */

export * from './ProgressBar.js'
export * from './ProgressCard.js'
