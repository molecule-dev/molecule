import type { TrashTranslations } from './types.js'

/** Trash translations for Danish. */
export const da: TrashTranslations = {
  'trash.error.alreadyResolved':
    'Det slettede element er allerede gendannet eller fjernet permanent',
  'trash.error.countFailed': 'Kunne ikke tælle slettede elementer',
  'trash.error.listFailed': 'Kunne ikke vise slettede elementer',
  'trash.error.missingId': 'Papirkurv-ID er påkrævet',
  'trash.error.missingResource': 'Ressourcetype og -ID er påkrævet',
  'trash.error.notFound': 'Slettet element ikke fundet',
  'trash.error.noRestoreHandler':
    'Der er ikke registreret nogen gendannelseshåndtering for denne ressourcetype',
  'trash.error.purgeFailed': 'Kunne ikke fjerne slettet element permanent',
  'trash.error.readFailed': 'Kunne ikke læse slettet element',
  'trash.error.restoreFailed': 'Kunne ikke gendanne slettet element',
  'trash.error.trashFailed': 'Kunne ikke flytte element til papirkurven',
  'trash.error.validationFailed': 'Validering mislykkedes',
}
