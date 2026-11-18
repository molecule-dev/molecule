/**
 * Vue KPI / metric card primitives.
 *
 * Exports:
 * - `<KpiCard>` — single metric card. Props: `title`, `value`, `subtitle?`, `icon?`,
 *   `trend?`, `action?`, `accentSide?` (`'left' | 'top' | 'none'`, default `'none'`),
 *   `accentColor?` (ClassMap accent color, default the ClassMap's own),
 *   `upperLabel?`, `emphasizeValue?`, `hoverLift?`, `className?`, `dataMolId?`.
 * - `<KpiCardTrend>` — arrow + delta for the `trend` slot. Props: `delta`,
 *   `direction?` (derived from the sign of `delta` when omitted), `suffix?`
 *   (default `'%'`), `className?`.
 * - `<KpiCardGrid>` — grid container. Props: `columns?` (2–6, default 4),
 *   `gap?`, `className?`.
 * - `KpiTrendDirection`, `KpiCardAccentSide` types.
 *
 * This is the Vue counterpart of `@molecule/app-kpi-card-react`: same exports,
 * same props and the same DOM for the same input, so an app switches framework
 * by changing only the package name in its imports. Node-valued props arrive
 * as a prop or as a same-named slot.
 *
 * @remarks
 * - The accent bar, hover lift, and uppercase-label variants emit ClassMap
 *   tokens (`cm.kpiCardAccentLeft`, `cm.kpiCardAccentTop`,
 *   `cm.kpiCardAccentColor`, `cm.kpiCardHoverLift`,
 *   `cm.kpiCardTitleUppercase`). They only take effect when the app's ClassMap
 *   bond is Tailwind-based AND the theme defines the `primary` /
 *   `on-surface-variant` color tokens; under a non-Tailwind ClassMap these props
 *   are inert.
 * - `<KpiCardTrend>` renders only the arrow glyph + number — it does NOT color
 *   the delta by direction. Pass `className` with a semantic text color (e.g.
 *   success/error) yourself if you want red/green deltas.
 * - `<KpiCardGrid columns={n}>` renders a responsive n-column grid (via
 *   `cm.grid`): it starts at 1 column on phones and steps up to `n` at larger
 *   breakpoints, so cards don't overflow on mobile. Override `className` if you
 *   need a fixed (non-collapsing) grid.
 * - `value`/`title` are nodes — format numbers and translate labels yourself
 *   (`t('...')`).
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { KpiCard, KpiCardGrid, KpiCardTrend } from '@molecule/app-kpi-card-vue'
 *
 * const Dashboard = defineComponent({
 *   setup() {
 *     return () =>
 *       h(KpiCardGrid, { columns: 3 }, {
 *         default: () => [
 *           h(KpiCard, {
 *             title: 'Monthly Revenue',
 *             value: '$48,200',
 *             trend: h(KpiCardTrend, { delta: 12.4 }),
 *             accentSide: 'top',
 *             upperLabel: true,
 *             emphasizeValue: true,
 *             hoverLift: true,
 *             dataMolId: 'kpi-revenue',
 *           }),
 *         ],
 *       })
 *   },
 * })
 *
 * createApp(Dashboard).mount('#app')
 * ```
 *
 * @module
 */

export * from './KpiCard.js'
export * from './KpiCardGrid.js'
export * from './KpiCardTrend.js'
export * from './types.js'
