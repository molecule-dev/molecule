/**
 * Angular KPI / metric card primitives.
 *
 * Exports:
 * - `<KpiCard>` (`div[mol-kpi-card]`) — single metric card. Inputs: `accentSide?`
 *   (`'left' | 'top' | 'none'`, default `'none'`), `accentColor?` (ClassMap
 *   accent color, default the ClassMap's own), `upperLabel?`, `emphasizeValue?`,
 *   `hoverLift?`, `className?`, `dataMolId?`. The label, value, subtitle, icon,
 *   trend and action are projected content (`[slot=title]`, `[slot=value]`, …).
 * - `<KpiCardTrend>` (`span[mol-kpi-card-trend]`) — arrow + delta for the
 *   `trend` slot. Inputs: `delta`, `direction?` (derived from the sign of
 *   `delta` when omitted), `suffix?` (default `'%'`), `className?`.
 * - `<KpiCardGrid>` (`div[mol-kpi-card-grid]`) — grid container. Inputs:
 *   `columns?` (2–6, default 4), `gap?`, `className?`; the cards are projected
 *   content.
 * - `KpiTrendDirection`, `KpiCardAccentSide` types.
 *
 * This is the Angular counterpart of `@molecule/app-kpi-card-react`: same
 * exports, same props and the same DOM for the same input, so an app switches
 * framework by changing only the package name in its imports. Node-valued props
 * become projected content, because an Angular input cannot carry a node.
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
 * - Format numbers and translate labels yourself (`t('...')`).
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { KpiCard, KpiCardGrid, KpiCardTrend } from '@molecule/app-kpi-card-angular'
 *
 * @Component({
 *   selector: 'app-dashboard',
 *   standalone: true,
 *   imports: [KpiCardGrid, KpiCard, KpiCardTrend],
 *   template: `
 *     <div mol-kpi-card-grid [columns]="3">
 *       <div
 *         mol-kpi-card
 *         accentSide="top"
 *         [upperLabel]="true"
 *         [emphasizeValue]="true"
 *         [hoverLift]="true"
 *         dataMolId="kpi-revenue"
 *       >
 *         <span slot="title">Monthly Revenue</span>
 *         <span slot="value">$48,200</span>
 *         <span slot="trend"><span mol-kpi-card-trend [delta]="12.4"></span></span>
 *       </div>
 *     </div>
 *   `,
 * })
 * export class Dashboard {}
 * ```
 *
 * @module
 */

export * from './kpi-card.component.js'
export * from './kpi-card-grid.component.js'
export * from './kpi-card-trend.component.js'
export * from './types.js'
