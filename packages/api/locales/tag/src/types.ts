/** Translation keys for the tag locale package. */
export type TagTranslationKey =
  | 'tag.error.nameRequired'
  | 'tag.error.invalidName'
  | 'tag.error.createFailed'
  | 'tag.error.notFound'
  | 'tag.error.readFailed'
  | 'tag.error.listFailed'
  | 'tag.error.updateFailed'
  | 'tag.error.deleteFailed'
  | 'tag.error.popularFailed'
  | 'tag.error.tagIdRequired'
  | 'tag.error.addFailed'
  | 'tag.error.associationNotFound'
  | 'tag.error.removeFailed'
  | 'tag.error.getBySlugFailed'

/** Translation record mapping tag keys to translated strings. */
export type TagTranslations = Record<TagTranslationKey, string>
