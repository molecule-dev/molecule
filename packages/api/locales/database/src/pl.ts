import type { DatabaseTranslations } from './types.js'

/** Database translations for Polish. */
export const pl: DatabaseTranslations = {
  'database.error.noProvider':
    'Pula bazy danych nie jest skonfigurowana. Najpierw wywolaj setPool().',
  'database.error.storeNotConfigured':
    'DataStore nie jest skonfigurowany. Najpierw wywolaj setStore().',
}
