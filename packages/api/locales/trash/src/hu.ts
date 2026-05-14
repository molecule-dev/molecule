import type { TrashTranslations } from './types.js'

/** Trash translations for Hungarian. */
export const hu: TrashTranslations = {
  'trash.error.alreadyResolved':
    'A törölt elemet már visszaállították vagy véglegesen eltávolították',
  'trash.error.countFailed': 'Nem sikerült megszámolni a törölt elemeket',
  'trash.error.listFailed': 'Nem sikerült listázni a törölt elemeket',
  'trash.error.missingId': 'A kuka azonosítója kötelező',
  'trash.error.missingResource': 'Az erőforrás típusa és azonosítója kötelező',
  'trash.error.notFound': 'A törölt elem nem található',
  'trash.error.noRestoreHandler':
    'Ehhez az erőforrástípushoz nincs regisztrálva visszaállítási kezelő',
  'trash.error.purgeFailed': 'Nem sikerült véglegesen eltávolítani a törölt elemet',
  'trash.error.readFailed': 'Nem sikerült beolvasni a törölt elemet',
  'trash.error.restoreFailed': 'Nem sikerült visszaállítani a törölt elemet',
  'trash.error.trashFailed': 'Nem sikerült a kukába helyezni az elemet',
  'trash.error.validationFailed': 'Az ellenőrzés sikertelen',
}
