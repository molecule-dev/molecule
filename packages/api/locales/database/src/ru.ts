import type { DatabaseTranslations } from './types.js'

/** Database translations for Russian. */
export const ru: DatabaseTranslations = {
  'database.error.noProvider': 'Пул базы данных не настроен. Сначала вызовите setPool().',
  'database.error.storeNotConfigured': 'DataStore не настроен. Сначала вызовите setStore().',
}
