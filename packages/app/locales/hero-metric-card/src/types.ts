/**
 * Translation keys for the hero metric card locale package.
 *
 * Keys are referenced from `@molecule/app-hero-metric-card-react` via
 * `t('hero-metric-card.<key>', …, { defaultValue })`.
 */
export type HeroMetricCardTranslationKey =
  | 'hero-metric-card.loading'
  | 'hero-metric-card.trend.up'
  | 'hero-metric-card.trend.down'

/** Translation record mapping hero-metric-card keys to translated strings. */
export type HeroMetricCardTranslations = Record<HeroMetricCardTranslationKey, string>
