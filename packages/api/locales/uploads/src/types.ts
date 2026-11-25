/** Translation keys for the uploads locale package. */
export type UploadsTranslationKey =
  | 'uploads.error.noProvider'
  | 'uploads.error.streamLimitReached'
  | 'uploads.error.aborted'
  | 'uploads.error.fileTypeBlocked'
  | 'uploads.error.activeTypeListed'

/** Translation record mapping uploads keys to translated strings. */
export type UploadsTranslations = Record<UploadsTranslationKey, string>
