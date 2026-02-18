import type { DatabaseTranslations } from './types.js'

/** Database translations for Bulgarian. */
export const bg: DatabaseTranslations = {
  'database.error.noProvider':
    'Пулът на базата данни не е конфигуриран. Първо извикайте setPool().',
  'database.error.storeNotConfigured': 'DataStore не е конфигуриран. Първо извикайте setStore().',
}
