import type { VersionHistoryTranslations } from './types.js'

/** Version-history resource translations for Danish. */
export const da: VersionHistoryTranslations = {
  'versionHistory.error.countFailed': 'Kunne ikke tælle versioner',
  'versionHistory.error.createFailed': 'Kunne ikke oprette version',
  'versionHistory.error.diffFailed': 'Kunne ikke sammenligne versioner',
  'versionHistory.error.diffNotFound':
    'En eller begge versioner blev ikke fundet, eller de tilhører forskellige ressourcer',
  'versionHistory.error.invalidVersion': 'Versionsnummer skal være et positivt heltal',
  'versionHistory.error.listFailed': 'Kunne ikke vise versioner',
  'versionHistory.error.missingId': 'Versions-ID er påkrævet',
  'versionHistory.error.missingResource': 'Ressourcetype og -ID er påkrævet',
  'versionHistory.error.notFound': 'Version ikke fundet',
  'versionHistory.error.readFailed': 'Kunne ikke læse version',
  'versionHistory.error.restoreFailed': 'Kunne ikke gendanne version',
  'versionHistory.error.validationFailed': 'Validering mislykkedes',
}
