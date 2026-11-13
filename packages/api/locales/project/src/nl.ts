import type { ProjectTranslations } from './types.js'

/** Project translations for Dutch. */
export const nl: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'naam en projectType zijn vereist',
  'project.error.notFound': 'Niet gevonden',
  'project.error.forbidden': 'Toegang geweigerd',
  'project.error.createFailed': 'Het is niet gelukt om het project aan te maken.',
  'project.error.invalidType':
    'Niet-ondersteund projecttype; verwacht een van de volgende: api, app, full-stack, static, status-page, status-page-edge',
  'project.error.deleteFailed': 'Het verwijderen van het project is mislukt.',
  'project.error.listFailed': 'Projecten konden niet worden weergegeven',
  'project.error.readFailed': 'Project kon niet worden gelezen',
  'project.error.updateFailed': 'Project bijwerken mislukt',
}
