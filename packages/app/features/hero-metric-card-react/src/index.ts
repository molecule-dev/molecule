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
 * @remarks
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
