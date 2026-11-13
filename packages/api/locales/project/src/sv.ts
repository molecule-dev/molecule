import type { ProjectTranslations } from './types.js'

/** Project translations for Swedish. */
export const sv: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'namn och projectType krävs',
  'project.error.notFound': 'Hittades inte',
  'project.error.forbidden': 'Åtkomst nekad',
  'project.error.createFailed': 'Misslyckades med att skapa projektet',
  'project.error.invalidType':
    'Projekttyp som inte stöds; förväntas vara en av: api, app, fullstack, statisk, statussida, statussidakant',
  'project.error.deleteFailed': 'Misslyckades med att ta bort projektet',
  'project.error.listFailed': 'Misslyckades med att lista projekt',
  'project.error.readFailed': 'Kunde inte läsa projektet',
  'project.error.updateFailed': 'Misslyckades med att uppdatera projektet',
}
