/** Translation keys for the file-upload locale package. */
export type FileUploadTranslationKey =
  | 'fileUpload.error.cancelled'
  | 'fileUpload.error.extensionNotAccepted'
  | 'fileUpload.error.maxFiles'
  | 'fileUpload.error.maxSize'
  | 'fileUpload.error.minSize'
  | 'fileUpload.error.networkError'
  | 'fileUpload.error.noSource'
  | 'fileUpload.error.timedOut'
  | 'fileUpload.error.typeNotAccepted'
  | 'fileUpload.error.uploadFailed'
  | 'fileUpload.error.uploadFailedStatus'

/** Translation record mapping `@molecule/app-file-upload` keys to translated strings. */
export type FileUploadTranslations = Record<FileUploadTranslationKey, string>
