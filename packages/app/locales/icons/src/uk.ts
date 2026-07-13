import type { IconsTranslations } from './types.js'

/** Icons translations for Ukrainian. */
export const uk: IconsTranslations = {
  'icons.error.noIconSet':
    'Жодного IconSet не встановлено. Викличте setIconSet() при запуску додатка з бібліотекою іконок (наприклад, @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Жодного набору іконок не підключено. Викличте setIconSet() з IconSet (наприклад, експорт із @molecule/app-icons-molecule).',
  'icons.error.notFound': 'Іконку "{{name}}" не знайдено в поточному наборі іконок.',
}
