import type { VersionHistoryTranslations } from './types.js'

/** Version-history resource translations for Hungarian. */
export const hu: VersionHistoryTranslations = {
  'versionHistory.error.countFailed': 'Nem sikerült megszámolni a verziókat',
  'versionHistory.error.createFailed': 'Nem sikerült létrehozni a verziót',
  'versionHistory.error.diffFailed': 'Nem sikerült összehasonlítani a verziókat',
  'versionHistory.error.diffNotFound':
    'Az egyik vagy mindkét verzió nem található, vagy különböző erőforrásokhoz tartoznak',
  'versionHistory.error.invalidVersion': 'A verziószámnak pozitív egész számnak kell lennie',
  'versionHistory.error.listFailed': 'Nem sikerült listázni a verziókat',
  'versionHistory.error.missingId': 'A verzióazonosító kötelező',
  'versionHistory.error.missingResource': 'Az erőforrás típusa és azonosítója kötelező',
  'versionHistory.error.notFound': 'A verzió nem található',
  'versionHistory.error.readFailed': 'Nem sikerült beolvasni a verziót',
  'versionHistory.error.restoreFailed': 'Nem sikerült visszaállítani a verziót',
  'versionHistory.error.validationFailed': 'Az ellenőrzés sikertelen',
}
