import type { VersionHistoryTranslations } from './types.js'

/** Version-history resource translations for Swedish. */
export const sv: VersionHistoryTranslations = {
  'versionHistory.error.countFailed': 'Det gick inte att räkna versioner',
  'versionHistory.error.createFailed': 'Det gick inte att skapa version',
  'versionHistory.error.diffFailed': 'Det gick inte att jämföra versioner',
  'versionHistory.error.diffNotFound':
    'En eller båda versionerna hittades inte, eller så tillhör de olika resurser',
  'versionHistory.error.invalidVersion': 'Versionsnumret måste vara ett positivt heltal',
  'versionHistory.error.listFailed': 'Det gick inte att lista versioner',
  'versionHistory.error.missingId': 'Versions-ID krävs',
  'versionHistory.error.missingResource': 'Resurstyp och ID krävs',
  'versionHistory.error.notFound': 'Versionen hittades inte',
  'versionHistory.error.readFailed': 'Det gick inte att läsa versionen',
  'versionHistory.error.restoreFailed': 'Det gick inte att återställa versionen',
  'versionHistory.error.validationFailed': 'Valideringen misslyckades',
}
