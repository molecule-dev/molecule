import type { VersionHistoryTranslations } from './types.js'

/** Version-history resource translations for Italian. */
export const it: VersionHistoryTranslations = {
  'versionHistory.error.countFailed': 'Impossibile contare le versioni',
  'versionHistory.error.createFailed': 'Impossibile creare la versione',
  'versionHistory.error.diffFailed': 'Impossibile confrontare le versioni',
  'versionHistory.error.diffNotFound':
    'Una o entrambe le versioni non sono state trovate, oppure appartengono a risorse diverse',
  'versionHistory.error.invalidVersion': 'Il numero di versione deve essere un intero positivo',
  'versionHistory.error.listFailed': 'Impossibile elencare le versioni',
  'versionHistory.error.missingId': "L'ID della versione è obbligatorio",
  'versionHistory.error.missingResource': "Il tipo e l'ID della risorsa sono obbligatori",
  'versionHistory.error.notFound': 'Versione non trovata',
  'versionHistory.error.readFailed': 'Impossibile leggere la versione',
  'versionHistory.error.restoreFailed': 'Impossibile ripristinare la versione',
  'versionHistory.error.validationFailed': 'Convalida non riuscita',
}
