import type { TrashTranslations } from './types.js'

/** Trash translations for Polish. */
export const pl: TrashTranslations = {
  'trash.error.alreadyResolved': 'Usunięty element został już przywrócony lub trwale usunięty',
  'trash.error.countFailed': 'Nie udało się policzyć usuniętych elementów',
  'trash.error.listFailed': 'Nie udało się wyświetlić listy usuniętych elementów',
  'trash.error.missingId': 'Wymagany jest identyfikator kosza',
  'trash.error.missingResource': 'Wymagane są typ i identyfikator zasobu',
  'trash.error.notFound': 'Nie znaleziono usuniętego elementu',
  'trash.error.noRestoreHandler':
    'Nie zarejestrowano programu obsługi przywracania dla tego typu zasobu',
  'trash.error.purgeFailed': 'Nie udało się trwale usunąć usuniętego elementu',
  'trash.error.readFailed': 'Nie udało się odczytać usuniętego elementu',
  'trash.error.restoreFailed': 'Nie udało się przywrócić usuniętego elementu',
  'trash.error.trashFailed': 'Nie udało się przenieść elementu do kosza',
  'trash.error.validationFailed': 'Walidacja nie powiodła się',
}
