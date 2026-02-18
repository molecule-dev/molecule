import type { DatabaseTranslations } from './types.js'

/** Database translations for Spanish. */
export const es: DatabaseTranslations = {
  'database.error.noProvider':
    'El pool de base de datos no está configurado. Llame primero a setPool().',
  'database.error.storeNotConfigured': 'DataStore no está configurado. Llame primero a setStore().',
}
