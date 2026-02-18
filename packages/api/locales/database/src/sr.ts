import type { DatabaseTranslations } from './types.js'

/** Database translations for Serbian. */
export const sr: DatabaseTranslations = {
  'database.error.noProvider':
    'Skup veza baze podataka nije konfigurisan. Prvo pozovite setPool().',
  'database.error.storeNotConfigured': 'DataStore nije konfigurisan. Prvo pozovite setStore().',
}
