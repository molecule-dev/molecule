/**
 * Translation keys for the NPS distribution locale package.
 *
 * Keys are referenced from `@molecule/app-nps-distribution-react` via
 * `t('nps-distribution.<key>', …, { defaultValue })`.
 */
export type NpsDistributionTranslationKey =
  | 'nps-distribution.tier.detractor'
  | 'nps-distribution.tier.passive'
  | 'nps-distribution.tier.promoter'
  | 'nps-distribution.aria-label'
  | 'nps-distribution.row.aria'
  | 'nps-distribution.score.label'
  | 'nps-distribution.score.responses'

/** Translation record mapping nps-distribution keys to translated strings. */
export type NpsDistributionTranslations = Record<NpsDistributionTranslationKey, string>
