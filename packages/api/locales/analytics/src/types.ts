/** Translation keys for the analytics locale package. */
export type AnalyticsTranslationKey =
  | 'analytics.error.noProvider'
  | 'analytics.error.noGroupSupport'

/** Translation record mapping analytics keys to translated strings. */
export type AnalyticsTranslations = Record<AnalyticsTranslationKey, string>
