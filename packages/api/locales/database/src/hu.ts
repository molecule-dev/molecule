import type { DatabaseTranslations } from './types.js'

/** Database translations for Hungarian. */
export const hu: DatabaseTranslations = {
  'database.error.noProvider':
    'Az adatbázis pool nincs konfigurálva. Először hívja meg a setPool()-t.',
  'database.error.storeNotConfigured':
    'A DataStore nincs konfigurálva. Először hívja meg a setStore()-t.',
}
