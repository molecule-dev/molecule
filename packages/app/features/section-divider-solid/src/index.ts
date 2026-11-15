/**
 * Solid horizontal divider with optional centered label — the Solid
 * counterpart of `@molecule/app-section-divider-react`, with the same props
 * and the same DOM for the same input.
 *
 * Exports `SectionDivider`, common as "OR" between auth options, "Today"
 * between feed days, "—" between sections. The label is your own JSX —
 * translate it upstream.
 *
 * @example
 * ```tsx
 * import { SectionDivider } from '@molecule/app-section-divider-solid'
 *
 * <SectionDivider>OR</SectionDivider>
 *
 * <SectionDivider align="start">Today</SectionDivider>
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`cm.flex` on the frame, `cm.flex1` on the
 *   lines) — rendering throws otherwise. No i18n dependency (the label is
 *   your own JSX — translate it upstream).
 * - `align` positions the label: `'center'` (default) draws lines on both
 *   sides; `'start'` / `'end'` put the label at that edge with a single
 *   line filling the rest.
 * - Lines use `currentColor` at 20% opacity, so they inherit the local text
 *   color in both light and dark themes.
 *
 * @module
 */

export * from './SectionDivider.jsx'
export * from './types.js'
