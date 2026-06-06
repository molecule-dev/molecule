/**
 * React KPI / metric card primitives.
 *
 * Exports:
 * - `<KpiCard>` — single metric card with title/value/subtitle/icon/trend/action slots.
 * - `<KpiCardTrend>` — arrow + delta% component for the trend slot.
 * - `<KpiCardGrid>` — responsive grid container for KPI cards.
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
