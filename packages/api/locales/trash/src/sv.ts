import type { TrashTranslations } from './types.js'

/** Trash translations for Swedish. */
export const sv: TrashTranslations = {
  'trash.error.alreadyResolved':
    'Det borttagna objektet har redan återställts eller rensats permanent',
  'trash.error.countFailed': 'Det gick inte att räkna borttagna objekt',
  'trash.error.listFailed': 'Det gick inte att lista borttagna objekt',
  'trash.error.missingId': 'Papperskorgs-ID krävs',
  'trash.error.missingResource': 'Resurstyp och ID krävs',
  'trash.error.notFound': 'Borttaget objekt hittades inte',
  'trash.error.noRestoreHandler':
    'Ingen återställningshanterare är registrerad för den här resurstypen',
  'trash.error.purgeFailed': 'Det gick inte att rensa det borttagna objektet permanent',
  'trash.error.readFailed': 'Det gick inte att läsa det borttagna objektet',
  'trash.error.restoreFailed': 'Det gick inte att återställa det borttagna objektet',
  'trash.error.trashFailed': 'Det gick inte att flytta objektet till papperskorgen',
  'trash.error.validationFailed': 'Valideringen misslyckades',
}
