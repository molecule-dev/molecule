import type { DatabaseTranslations } from './types.js'

/** Database translations for Portuguese. */
export const pt: DatabaseTranslations = {
  'database.error.noProvider':
    'O pool do banco de dados nao esta configurado. Chame setPool() primeiro.',
  'database.error.storeNotConfigured': 'DataStore nao esta configurado. Chame setStore() primeiro.',
}
