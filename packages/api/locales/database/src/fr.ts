import type { DatabaseTranslations } from './types.js'

/** Database translations for French. */
export const fr: DatabaseTranslations = {
  'database.error.noProvider':
    "Le pool de base de données n'est pas configuré. Appelez d'abord setPool().",
  'database.error.storeNotConfigured': "DataStore n'est pas configuré. Appelez d'abord setStore().",
}
