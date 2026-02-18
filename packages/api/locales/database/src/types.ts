/** Translation keys for the database locale package. */
export type DatabaseTranslationKey =
  | 'database.error.noProvider'
  | 'database.error.storeNotConfigured'

/** Translation record mapping database keys to translated strings. */
export type DatabaseTranslations = Record<DatabaseTranslationKey, string>
