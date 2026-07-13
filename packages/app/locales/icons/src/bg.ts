import type { IconsTranslations } from './types.js'

/** Icons translations for Bulgarian. */
export const bg: IconsTranslations = {
  'icons.error.noIconSet':
    'Не е зададен IconSet. Извикайте setIconSet() при стартиране на приложението с библиотека с икони (напр. @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Няма свързан набор от икони. Извикайте setIconSet() с IconSet (напр. експорта от @molecule/app-icons-molecule).',
  'icons.error.notFound': 'Иконата "{{name}}" не е намерена в текущия набор от икони.',
}
