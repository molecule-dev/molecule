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
 * @remarks
 * - Accent tokens map to `var(--mol-color-<token>)`. In the standard scaffold
 *   theme only `primary`, `success`, `warning`, and `info` resolve —
 *   `danger` and `neutral` have NO backing variable and silently fall back to
 *   `currentColor`. Use `warning`/`info` or pass a raw CSS color string until
 *   the host theme defines `--mol-color-danger` / `--mol-color-neutral`.
 * - KNOWN GAP: a few raw utility classes are used for typography
 *   (`uppercase tracking-widest`, `font-extrabold leading-none`,
 *   `text-on-surface-variant`). `text-on-surface-variant` only exists in apps
 *   whose theme defines Material-3 color tokens (the polished flagship
 *   templates) — in a plain scaffold the muted-text styling is absent, and
 *   Tailwind builds that do not source-scan this package's dist will not
 *   generate the utilities at all.
 * - `getClassMap()` requires a bonded ClassMap. Text uses
 *   `@molecule/app-i18n`'s `t()` with English fallbacks — the companion
 *   `@molecule/app-locales-hero-metric-card` bond supplies translations.
 *
 * @module
 */

export * from './HeroMetricCard.js'
export * from './HeroMetricTrendChip.js'
export * from './types.js'
