import type { ProjectTranslations } from './types.js'

/** Project translations for Finnish. */
export const fi: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'Nimi ja projectType vaaditaan',
  'project.error.notFound': 'Ei löytynyt',
  'project.error.forbidden': 'Käyttö estetty',
  'project.error.createFailed': 'Projektin luominen epäonnistui',
  'project.error.invalidType':
    'Ei-tuettu projektityyppi; odotettu jokin seuraavista: api, app, full-stack, static, status-page tai status-page-edge',
  'project.error.deleteFailed': 'Projektin poistaminen epäonnistui',
  'project.error.listFailed': 'Projektien listaaminen epäonnistui',
  'project.error.readFailed': 'Projektin lukeminen epäonnistui',
  'project.error.updateFailed': 'Projektin päivittäminen epäonnistui',
}
