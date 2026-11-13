/** Translation keys for the angular locale package. */
export type AngularTranslationKey =
  | 'angular.error.useChatOutsideProvider'
  | 'angular.error.useAuthOutsideProvider'
  | 'angular.error.oauthFailed'
  | 'angular.error.unsupportedMethod'
  | 'angular.error.useStoreOutsideProvider'

/** Translation record mapping angular keys to translated strings. */
export type AngularTranslations = Record<AngularTranslationKey, string>
