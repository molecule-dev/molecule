import type { IconsTranslations } from './types.js'

/** Icons translations for Serbian. */
export const sr: IconsTranslations = {
  'icons.error.noIconSet':
    'Није постављен ниједан IconSet. Позовите setIconSet() при покретању апликације са библиотеком икона (нпр., @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Није повезан ниједан скуп икона. Позовите setIconSet() са IconSet-ом (нпр., извоз из @molecule/app-icons-molecule).',
  'icons.error.notFound': 'Икона "{{name}}" није пронађена у тренутном скупу икона.',
}
