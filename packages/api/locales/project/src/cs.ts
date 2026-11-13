import type { ProjectTranslations } from './types.js'

/** Project translations for Czech. */
export const cs: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'name a projectType jsou povinné',
  'project.error.notFound': 'Nenalezeno',
  'project.error.forbidden': 'Přístup odepřen',
  'project.error.createFailed': 'Vytvoření projektu se nezdařilo',
  'project.error.invalidType':
    'Nepodporovaný typ projektu; očekávaný jeden z: api, app, full-stack, static, status-page, status-page-edge',
  'project.error.deleteFailed': 'Projekt se nepodařilo smazat',
  'project.error.listFailed': 'Seznam projektů se nepodařilo vypsat',
  'project.error.readFailed': 'Projekt se nepodařilo načíst',
  'project.error.updateFailed': 'Projekt se nepodařilo aktualizovat',
}
