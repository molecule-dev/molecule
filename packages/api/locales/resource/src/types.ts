/** Translation keys for the resource locale package. */
export type ResourceTranslationKey =
  | 'resource.error.unknownError'
  | 'resource.error.unableToCreate'
  | 'resource.error.unableToUpdate'
  | 'resource.error.unableToDelete'
  | 'resource.error.notFound'
  | 'resource.error.badRequest'
  | 'resource.error.unauthorized'

/** Translation record mapping resource keys to translated strings. */
export type ResourceTranslations = Record<ResourceTranslationKey, string>
