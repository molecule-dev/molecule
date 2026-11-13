/** Translation keys for the storage locale package. */
export type StorageTranslationKey =
  | 'storage.error.noProvider'
  | 'storage.error.quotaExceeded'
  | 'storage.error.asyncStorageUnavailable'
  | 'storage.error.setFailed'

/** Translation record mapping storage keys to translated strings. */
export type StorageTranslations = Record<StorageTranslationKey, string>
