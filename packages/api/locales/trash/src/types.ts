/** Translation keys for the trash locale package. */
export type TrashTranslationKey =
  | 'trash.error.alreadyResolved'
  | 'trash.error.countFailed'
  | 'trash.error.listFailed'
  | 'trash.error.missingId'
  | 'trash.error.missingResource'
  | 'trash.error.notFound'
  | 'trash.error.noRestoreHandler'
  | 'trash.error.purgeFailed'
  | 'trash.error.readFailed'
  | 'trash.error.restoreFailed'
  | 'trash.error.trashFailed'
  | 'trash.error.validationFailed'

/** Translation record mapping trash keys to translated strings. */
export type TrashTranslations = Record<TrashTranslationKey, string>
