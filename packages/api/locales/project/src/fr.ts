import type { ProjectTranslations } from './types.js'

/** Project translations for French. */
export const fr: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'Le nom et le type de projet sont requis',
  'project.error.notFound': 'Non trouvé',
  'project.error.forbidden': 'Accès refusé',
  'project.error.createFailed': 'Échec de la création du projet',
  'project.error.invalidType':
    'Type de projet non pris en charge ; attendu : api, app, full-stack, static, status-page, status-page-edge',
  'project.error.deleteFailed': 'Échec de la suppression du projet',
  'project.error.listFailed': 'Impossible de lister les projets',
  'project.error.readFailed': 'Échec de la lecture du projet',
  'project.error.updateFailed': 'Échec de la mise à jour du projet',
}
