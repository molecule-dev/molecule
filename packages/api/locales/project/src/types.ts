/** Translation keys for the project locale package. */
export type ProjectTranslationKey =
  | 'project.error.nameAndTypeRequired'
  | 'project.error.notFound'
  | 'project.error.forbidden'
  | 'project.error.createFailed'
  | 'project.error.invalidType'
  | 'project.error.deleteFailed'
  | 'project.error.listFailed'
  | 'project.error.readFailed'
  | 'project.error.updateFailed'

/** Translation record mapping project keys to translated strings. */
export type ProjectTranslations = Record<ProjectTranslationKey, string>
