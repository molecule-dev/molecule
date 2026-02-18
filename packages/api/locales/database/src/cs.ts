import type { DatabaseTranslations } from './types.js'

/** Database translations for Czech. */
export const cs: DatabaseTranslations = {
  'database.error.noProvider': 'Fond databáze není nakonfigurován. Nejprve zavolejte setPool().',
  'database.error.storeNotConfigured':
    'DataStore není nakonfigurován. Nejprve zavolejte setStore().',
}
