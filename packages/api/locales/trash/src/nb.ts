import type { TrashTranslations } from './types.js'

/** Trash translations for Norwegian Bokmål. */
export const nb: TrashTranslations = {
  'trash.error.alreadyResolved':
    'Det slettede elementet er allerede gjenopprettet eller fjernet permanent',
  'trash.error.countFailed': 'Kunne ikke telle slettede elementer',
  'trash.error.listFailed': 'Kunne ikke liste slettede elementer',
  'trash.error.missingId': 'Papirkurv-ID er påkrevd',
  'trash.error.missingResource': 'Ressurstype og -ID er påkrevd',
  'trash.error.notFound': 'Slettet element ikke funnet',
  'trash.error.noRestoreHandler':
    'Ingen gjenopprettingsbehandler er registrert for denne ressurstypen',
  'trash.error.purgeFailed': 'Kunne ikke fjerne det slettede elementet permanent',
  'trash.error.readFailed': 'Kunne ikke lese det slettede elementet',
  'trash.error.restoreFailed': 'Kunne ikke gjenopprette det slettede elementet',
  'trash.error.trashFailed': 'Kunne ikke flytte elementet til papirkurven',
  'trash.error.validationFailed': 'Validering mislyktes',
}
