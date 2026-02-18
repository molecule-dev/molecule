import type { DatabaseTranslations } from './types.js'

/** Database translations for English. */
export const en: DatabaseTranslations = {
  'database.error.noProvider': 'Database pool not configured. Call setPool() first.',
  'database.error.storeNotConfigured': 'DataStore not configured. Call setStore() first.',
}
