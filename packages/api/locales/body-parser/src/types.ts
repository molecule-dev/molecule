/** Translation keys for the body-parser locale package. */
export type BodyParserTranslationKey =
  | 'middleware.error.badRequest'
  | 'middleware.error.fileTooLarge'
  | 'middleware.error.fileTypeNotAllowed'
  | 'middleware.error.fileMissing'
  | 'middleware.error.tooManyFiles'
  | 'middleware.error.unexpectedFile'
  | 'middleware.error.notMultipart'
  | 'middleware.error.payloadTooLarge'

/** Translation record mapping body-parser keys to translated strings. */
export type BodyParserTranslations = Record<BodyParserTranslationKey, string>
