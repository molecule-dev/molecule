import type { ProjectTranslations } from './types.js'

/** Project translations for Danish. */
export const da: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'navn og projectType er påkrævet',
  'project.error.notFound': 'Ikke fundet',
  'project.error.forbidden': 'Adgang nægtet',
  'project.error.createFailed': 'Projektet kunne ikke oprettes',
  'project.error.invalidType':
    'Ikke-understøttet projekttype; forventet en af: api, app, full-stack, static, status-page, status-page-edge',
  'project.error.deleteFailed': 'Projektet kunne ikke slettes',
  'project.error.listFailed': 'Kunne ikke liste projekter',
  'project.error.readFailed': 'Kunne ikke læse projektet',
  'project.error.updateFailed': 'Projektet kunne ikke opdateres',
}
