import type { VersionHistoryTranslations } from './types.js'

/** Version-history resource translations for French. */
export const fr: VersionHistoryTranslations = {
  'versionHistory.error.countFailed': 'Échec du comptage des versions',
  'versionHistory.error.createFailed': 'Échec de la création de la version',
  'versionHistory.error.diffFailed': 'Échec de la comparaison des versions',
  'versionHistory.error.diffNotFound':
    'Une ou les deux versions sont introuvables, ou elles appartiennent à des ressources différentes',
  'versionHistory.error.invalidVersion': 'Le numéro de version doit être un entier positif',
  'versionHistory.error.listFailed': 'Échec de la liste des versions',
  'versionHistory.error.missingId': "L'identifiant de la version est requis",
  'versionHistory.error.missingResource': "Le type et l'identifiant de la ressource sont requis",
  'versionHistory.error.notFound': 'Version introuvable',
  'versionHistory.error.readFailed': 'Échec de la lecture de la version',
  'versionHistory.error.restoreFailed': 'Échec de la restauration de la version',
  'versionHistory.error.validationFailed': 'La validation a échoué',
}
