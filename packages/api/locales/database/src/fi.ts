import type { DatabaseTranslations } from './types.js'

/** Database translations for Finnish. */
export const fi: DatabaseTranslations = {
  'database.error.noProvider': 'Tietokantapoolia ei ole määritetty. Kutsu ensin setPool().',
  'database.error.storeNotConfigured': 'DataStorea ei ole määritetty. Kutsu ensin setStore().',
}
