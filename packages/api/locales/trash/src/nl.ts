import type { TrashTranslations } from './types.js'

/** Trash translations for Dutch. */
export const nl: TrashTranslations = {
  'trash.error.alreadyResolved': 'Het verwijderde item is al hersteld of permanent verwijderd',
  'trash.error.countFailed': 'Kan verwijderde items niet tellen',
  'trash.error.listFailed': 'Kan verwijderde items niet weergeven',
  'trash.error.missingId': 'Prullenbak-ID is vereist',
  'trash.error.missingResource': 'Brontype en -ID zijn vereist',
  'trash.error.notFound': 'Verwijderd item niet gevonden',
  'trash.error.noRestoreHandler': 'Er is geen herstelhandler geregistreerd voor dit brontype',
  'trash.error.purgeFailed': 'Kan verwijderd item niet permanent verwijderen',
  'trash.error.readFailed': 'Kan verwijderd item niet lezen',
  'trash.error.restoreFailed': 'Kan verwijderd item niet herstellen',
  'trash.error.trashFailed': 'Kan item niet naar de prullenbak verplaatsen',
  'trash.error.validationFailed': 'Validatie mislukt',
}
