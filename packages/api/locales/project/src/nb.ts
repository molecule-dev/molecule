import type { ProjectTranslations } from './types.js'

/** Project translations for Norwegian Bokmål. */
export const nb: ProjectTranslations = {
  'project.error.nameAndTypeRequired': 'navn og projectType er påkrevd',
  'project.error.notFound': 'Ikke funnet',
  'project.error.forbidden': 'Tilgang nektet',
  'project.error.createFailed': 'Kunne ikke opprette prosjektet',
  'project.error.invalidType':
    'Ustøttet prosjekttype; forventet en av: api, app, fullstack, statisk, statusside, statussidekant',
  'project.error.deleteFailed': 'Kunne ikke slette prosjektet',
  'project.error.listFailed': 'Kunne ikke liste opp prosjekter',
  'project.error.readFailed': 'Kunne ikke lese prosjektet',
  'project.error.updateFailed': 'Kunne ikke oppdatere prosjektet',
}
