/** Translation keys every version locale table defines. */
export type VersionTranslationKey =
  | 'version.error.fetchFailed'
  | 'version.summary.features_one'
  | 'version.summary.features_other'
  | 'version.summary.fixes_one'
  | 'version.summary.fixes_other'
  | 'version.summary.featuresShort_one'
  | 'version.summary.featuresShort_other'
  | 'version.summary.fixesShort_one'
  | 'version.summary.fixesShort_other'
  | 'version.summary.performance'
  | 'version.summary.performanceShort'
  | 'version.summary.minor'

/**
 * Plural forms only some languages use — the CLDR categories beyond the
 * `one`/`other` pair, read by `t()` when the count selects them.
 */
export type VersionPluralFormKey =
  | 'version.summary.features_zero'
  | 'version.summary.features_two'
  | 'version.summary.features_few'
  | 'version.summary.features_many'
  | 'version.summary.fixes_zero'
  | 'version.summary.fixes_two'
  | 'version.summary.fixes_few'
  | 'version.summary.fixes_many'
  | 'version.summary.featuresShort_zero'
  | 'version.summary.featuresShort_two'
  | 'version.summary.featuresShort_few'
  | 'version.summary.featuresShort_many'
  | 'version.summary.fixesShort_zero'
  | 'version.summary.fixesShort_two'
  | 'version.summary.fixesShort_few'
  | 'version.summary.fixesShort_many'

/** Translation record mapping version keys to translated strings. */
export type VersionTranslations = Record<VersionTranslationKey, string> &
  Partial<Record<VersionPluralFormKey, string>>
