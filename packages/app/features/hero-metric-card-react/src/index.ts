/**
 * React hero metric card primitives.
 *
 * Exports:
 * - `<HeroMetricCard>` — top-of-dashboard hero metric card.
 * - `<HeroMetricTrendChip>` — directional ▲/▼ + delta chip used inside the card.
 * - Type aliases: `HeroMetricCardProps`, `HeroMetricTrend`,
 *   `HeroMetricTrendDirection`, `HeroMetricAccent`.
 *
 * @example
 * ```tsx
 * import { HeroMetricCard } from '@molecule/app-hero-metric-card-react'
 *
 * <HeroMetricCard
 *   title="Total Revenue"
 *   value="$84,320"
 *   unit="USD"
 *   trend={{ direction: 'up', delta: '+12.4%' }}
 *   subtitle="vs last month"
 *   accent="success"
 *   onClick={() => navigate('/revenue')}
 * />
 * ```
 *
 * @module
 */

export * from './HeroMetricCard.js'
export * from './HeroMetricTrendChip.js'
export * from './types.js'
