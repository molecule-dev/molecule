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
 * - `<KpiCardGrid columns={n}>` renders a responsive n-column grid (via
 *   `cm.grid`): it starts at 1 column on phones and steps up to `n` at larger
 *   breakpoints, so cards don't overflow on mobile. Override `className` if you
 *   need a fixed (non-collapsing) grid.
 * - `value`/`title` are ReactNode — format numbers and translate labels yourself
 *   (`t('...')`).
 *
 * @example
 * ```tsx
 * import { KpiCard, KpiCardGrid, KpiCardTrend } from '@molecule/app-kpi-card-react'
 *
 * export function DashboardKpis() {
 *   const metrics = [
 *     { id: 'revenue', title: 'Monthly Revenue', value: 48200, previous: 42900, format: 'currency' },
 *     { id: 'orders', title: 'Orders', value: 1284, previous: 1310, format: 'number' },
 *     { id: 'customers', title: 'New Customers', value: 312, previous: 312, format: 'number' },
 *   ] as const
 *   const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
 *   const num = new Intl.NumberFormat('en-US')
 *   return (
 *     <KpiCardGrid columns={3}>
 *       {metrics.map((m) => (
 *         <KpiCard
 *           key={m.id}
 *           title={m.title}
 *           value={m.format === 'currency' ? usd.format(m.value) : num.format(m.value)}
 *           trend={<KpiCardTrend delta={Math.round(((m.value - m.previous) / m.previous) * 1000) / 10} />}
 *           subtitle="vs. last month"
 *           accentSide="top"
 *           upperLabel
 *           dataMolId={`kpi-${m.id}`}
 *         />
 *       ))}
 *     </KpiCardGrid>
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './KpiCard.js'
export * from './KpiCardGrid.js'
export * from './KpiCardTrend.js'
