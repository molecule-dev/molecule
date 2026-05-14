import type { VersionHistoryTranslations } from './types.js'

/** Version-history resource translations for Romanian. */
export const ro: VersionHistoryTranslations = {
  'versionHistory.error.countFailed': 'Nu s-au putut număra versiunile',
  'versionHistory.error.createFailed': 'Nu s-a putut crea versiunea',
  'versionHistory.error.diffFailed': 'Nu s-au putut compara versiunile',
  'versionHistory.error.diffNotFound':
    'Una sau ambele versiuni nu au fost găsite sau aparțin unor resurse diferite',
  'versionHistory.error.invalidVersion': 'Numărul versiunii trebuie să fie un număr întreg pozitiv',
  'versionHistory.error.listFailed': 'Nu s-au putut lista versiunile',
  'versionHistory.error.missingId': 'Este necesar ID-ul versiunii',
  'versionHistory.error.missingResource': 'Sunt necesare tipul și ID-ul resursei',
  'versionHistory.error.notFound': 'Versiunea nu a fost găsită',
  'versionHistory.error.readFailed': 'Nu s-a putut citi versiunea',
  'versionHistory.error.restoreFailed': 'Nu s-a putut restaura versiunea',
  'versionHistory.error.validationFailed': 'Validarea a eșuat',
}
