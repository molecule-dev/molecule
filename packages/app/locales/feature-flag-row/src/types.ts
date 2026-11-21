/** Translation keys for the feature-flag-row locale package. */
export type FeatureFlagRowTranslationKey =
  | 'featureFlagRow.aria.flagInEnvironment'
  | 'flagType.boolean'
  | 'flagType.multivariate'
  | 'flagType.percentage'
  | 'flagType.string'

/** Translation record mapping `@molecule/app-feature-flag-row-react` keys to translated strings. */
export type FeatureFlagRowTranslations = Record<FeatureFlagRowTranslationKey, string>
