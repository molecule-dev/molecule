/**
 * Horizontal divider with optional centered label.
 *
 * Exports `<SectionDivider>`.
 *
 * @example
 * ```tsx
 * import { SectionDivider } from '@molecule/app-section-divider-react'
 *
 * <SectionDivider>OR</SectionDivider>
 *
 * <SectionDivider align="start">Today</SectionDivider>
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`setClassMap()` at startup) — rendering
 *   throws otherwise. No i18n dependency (the label is your own ReactNode —
 *   translate it upstream).
 * - `align` positions the label: `'center'` (default) draws lines on both
 *   sides; `'start'` / `'end'` put the label at that edge with a single
 *   line filling the rest.
 * - Lines use `currentColor` at 20% opacity, so they inherit the local text
 *   color in both light and dark themes.
 *
 * @module
 */

export * from './SectionDivider.js'
