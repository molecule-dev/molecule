/**
 * React hero metric card primitives.
 *
 * Exports:
 * - `<HeroMetricCard>` — top-of-dashboard hero metric card.
 * - `<HeroMetricTrendChip>` — directional ▲/▼ + delta chip used inside the card.
 * - Type aliases: `HeroMetricCardProps`, `HeroMetricTrend`,
 *   `HeroMetricTrendDirection`, `HeroMetricAccent`, `HeroMetricSemanticAccent`.
 *
 * @example
 * ```tsx
 * import { useNavigate } from 'react-router'
 *
 * import { HeroMetricCard, type HeroMetricTrend } from '@molecule/app-hero-metric-card-react'
 *
 * export function RevenueHero() {
 *   const navigate = useNavigate()
 *   const current = 84320
 *   const previous = 75020
 *   const change = ((current - previous) / previous) * 100
 *   const trend: HeroMetricTrend = {
 *     direction: change >= 0 ? 'up' : 'down',
 *     delta: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
 *   }
 *   return (
 *     <HeroMetricCard
 *       title="Total Revenue"
 *       value={current.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
 *       unit="USD"
 *       trend={trend}
 *       subtitle="vs last month"
 *       accent="success"
 *       onClick={() => navigate('/revenue')}
 *       dataMolId="revenue-hero"
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - It does NOT format or compare numbers: `value` is rendered as given, and
 *   `trend` is `{ direction: 'up' | 'down', delta: string }` with a
 *   PRE-FORMATTED `delta` (you add the sign / `%`). There is no `'flat'`
 *   direction and the chip is not colored by direction.
 * - `onClick` makes the whole card interactive (button role); navigation is
 *   yours (e.g. `useNavigate()` from `react-router`). `loading` swaps the value
 *   for a "Loading metric…" line and hides trend + subtitle.
 * - Every semantic `accent` (`primary`/`success`/`warning`/`danger`/`info`/
 *   `neutral`) resolves to a REAL, theme-aware ClassMap color via
 *   `cm.progressColor()` — visibly colored in both light and dark themes.
 *   `danger` maps to the theme's `error` token and `neutral` to `secondary`
 *   (the theme defines no `danger`/`neutral` token). A raw CSS color string is
 *   also accepted for one-off brand accents.
 * - Styling routes through `getClassMap()` (muted text = `cm.textMuted`,
 *   caps/tracking = `cm.uppercase`/`cm.trackingWide`). The lone raw utility is
 *   `leading-none` on the big value — a line-height with no ClassMap member.
 * - `getClassMap()` requires a bonded ClassMap. Text uses
 *   `@molecule/app-i18n`'s `t()` with English fallbacks — the companion
 *   `@molecule/app-locales-hero-metric-card` bond supplies translations.
 *
 * @module
 */

export * from './HeroMetricCard.js'
export * from './HeroMetricTrendChip.js'
export * from './types.js'
