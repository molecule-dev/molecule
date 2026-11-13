import type { ProjectTranslations } from './types.js'

/** Project translations for Hungarian. */
export const hu: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'A név és a projectType megadása kötelező',
  'project.error.notFound': 'Nem található',
  'project.error.forbidden': 'Hozzáférés megtagadva',
  'project.error.createFailed': 'Nem sikerült létrehozni a projektet',
  'project.error.invalidType':
    'Nem támogatott projekttípus; a következők egyikét várták: api, app, full-stack, static, status-page, status-page-edge',
  'project.error.deleteFailed': 'Nem sikerült törölni a projektet',
  'project.error.listFailed': 'Nem sikerült listázni a projekteket',
  'project.error.readFailed': 'Nem sikerült beolvasni a projektet',
  'project.error.updateFailed': 'Nem sikerült frissíteni a projektet',
}
