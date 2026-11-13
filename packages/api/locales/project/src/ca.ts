import type { ProjectTranslations } from './types.js'

/** Project translations for Catalan. */
export const ca: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'Es requereixen nom i tipus de projecte',
  'project.error.notFound': 'No trobat',
  'project.error.forbidden': 'Accés denegat',
  'project.error.createFailed': "No s'ha pogut crear el projecte",
  'project.error.invalidType':
    "Tipus de projecte no compatible; s'esperava un dels següents: api, app, full-stack, static, status-page, status-page-edge",
  'project.error.deleteFailed': "No s'ha pogut suprimir el projecte",
  'project.error.listFailed': "No s'han pogut llistar els projectes",
  'project.error.readFailed': "No s'ha pogut llegir el projecte",
  'project.error.updateFailed': "No s'ha pogut actualitzar el projecte",
}
