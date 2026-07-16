/**
 * React KPI / metric card primitives.
 *
 * Exports:
 * - `<KpiCard>` — single metric card. Props: `title`, `value`, `subtitle?`, `icon?`,
 *   `trend?`, `action?`, `accentSide?` (`'left' | 'top' | 'none'`, default `'none'`),
 *   `accentColor?` (Tailwind border-color class, default `'border-primary'`),
 *   `upperLabel?`, `emphasizeValue?`, `hoverLift?`, `className?`, `dataMolId?`.
 * - `<KpiCardTrend>` — arrow + delta for the `trend` slot. Props: `delta`,
 *   `direction?` (derived from the sign of `delta` when omitted), `suffix?`
 *   (default `'%'`), `className?`.
 * - `<KpiCardGrid>` — grid container. Props: `columns?` (2–6, default 4),
 *   `gap?`, `className?`.
 * - `KpiTrendDirection`, `KpiCardAccentSide` types.
 *
 * @remarks
 * - The accent bar, hover lift, and uppercase-label variants emit raw Tailwind
 *   utility classes (`border-l-4`, `border-primary`, `hover:-translate-y-0.5`,
 *   `text-on-surface-variant`, `font-extrabold`). They only take effect when the
 *   app's ClassMap bond is Tailwind-based AND the theme defines the `primary` /
 *   `on-surface-variant` color tokens; under a non-Tailwind ClassMap these props
 *   are inert.
 * - `<KpiCardTrend>` renders only the arrow glyph + number — it does NOT color
 *   the delta by direction. Pass `className` with a semantic text color (e.g.
 *   success/error) yourself if you want red/green deltas.
 * - `<KpiCardGrid columns={n}>` renders a FIXED n-column grid at every viewport
 *   width — it does not collapse on mobile. Wrap it or override `className` if you
 *   need responsive behavior.
 * - `value`/`title` are ReactNode — format numbers and translate labels yourself
 *   (`t('...')`).
 *
 * @example
 * ```tsx
 * import { KpiCard, KpiCardGrid, KpiCardTrend } from '@molecule/app-kpi-card-react'
 *
 * <KpiCardGrid columns={3}>
 *   <KpiCard
 *     title="Monthly Revenue"
 *     value="$48,200"
 *     trend={<KpiCardTrend delta={12.4} />}
 *     accentSide="top"
 *     upperLabel
 *     emphasizeValue
 *     hoverLift
 *     dataMolId="kpi-revenue"
 *   />
 * </KpiCardGrid>
 * ```
 * @module
 */

export * from './KpiCard.js'
export * from './KpiCardGrid.js'
export * from './KpiCardTrend.js'
