import type { DatabaseTranslations } from './types.js'

/** Database translations for Dutch. */
export const nl: DatabaseTranslations = {
  'database.error.noProvider': 'Databasepool is niet geconfigureerd. Roep eerst setPool() aan.',
  'database.error.storeNotConfigured':
    'DataStore is niet geconfigureerd. Roep eerst setStore() aan.',
}
