import type { DatabaseTranslations } from './types.js'

/** Database translations for Arabic. */
export const ar: DatabaseTranslations = {
  'database.error.noProvider': 'لم يتم تكوين مجمع قاعدة البيانات. استدعِ setPool() أولاً.',
  'database.error.storeNotConfigured': 'لم يتم تكوين DataStore. استدعِ setStore() أولاً.',
}
