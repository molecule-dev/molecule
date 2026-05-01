/** Translation keys for the version-history resource locale package. */
export type VersionHistoryTranslationKey =
  | 'versionHistory.error.countFailed'
  | 'versionHistory.error.createFailed'
  | 'versionHistory.error.diffFailed'
  | 'versionHistory.error.diffNotFound'
  | 'versionHistory.error.invalidVersion'
  | 'versionHistory.error.listFailed'
  | 'versionHistory.error.missingId'
  | 'versionHistory.error.missingResource'
  | 'versionHistory.error.notFound'
  | 'versionHistory.error.readFailed'
  | 'versionHistory.error.restoreFailed'
  | 'versionHistory.error.validationFailed'

/** Translation record mapping version-history keys to translated strings. */
export type VersionHistoryTranslations = Record<VersionHistoryTranslationKey, string>
