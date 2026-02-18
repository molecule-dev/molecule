import type { DatabaseTranslations } from './types.js'

/** Database translations for Croatian. */
export const hr: DatabaseTranslations = {
  'database.error.noProvider':
    'Skup veza baze podataka nije konfiguriran. Prvo pozovite setPool().',
  'database.error.storeNotConfigured': 'DataStore nije konfiguriran. Prvo pozovite setStore().',
}
