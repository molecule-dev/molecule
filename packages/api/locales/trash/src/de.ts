import type { TrashTranslations } from './types.js'

/** Trash translations for German. */
export const de: TrashTranslations = {
  'trash.error.alreadyResolved':
    'Das gelöschte Element wurde bereits wiederhergestellt oder endgültig entfernt',
  'trash.error.countFailed': 'Gelöschte Elemente konnten nicht gezählt werden',
  'trash.error.listFailed': 'Gelöschte Elemente konnten nicht aufgelistet werden',
  'trash.error.missingId': 'Papierkorb-ID ist erforderlich',
  'trash.error.missingResource': 'Ressourcentyp und -ID sind erforderlich',
  'trash.error.notFound': 'Gelöschtes Element nicht gefunden',
  'trash.error.noRestoreHandler':
    'Für diesen Ressourcentyp ist kein Wiederherstellungs-Handler registriert',
  'trash.error.purgeFailed': 'Gelöschtes Element konnte nicht endgültig entfernt werden',
  'trash.error.readFailed': 'Gelöschtes Element konnte nicht gelesen werden',
  'trash.error.restoreFailed': 'Gelöschtes Element konnte nicht wiederhergestellt werden',
  'trash.error.trashFailed': 'Element konnte nicht in den Papierkorb verschoben werden',
  'trash.error.validationFailed': 'Validierung fehlgeschlagen',
}
