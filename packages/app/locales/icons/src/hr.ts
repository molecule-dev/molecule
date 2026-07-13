import type { IconsTranslations } from './types.js'

/** Icons translations for Croatian. */
export const hr: IconsTranslations = {
  'icons.error.noIconSet':
    'Nijedan IconSet nije postavljen. Pozovite setIconSet() pri pokretanju aplikacije s bibliotekom ikona (npr. @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Nijedan skup ikona nije povezan. Pozovite setIconSet() s IconSet-om (npr. izvoz iz @molecule/app-icons-molecule).',
  'icons.error.notFound': 'Ikona "{{name}}" nije pronađena u trenutnom skupu ikona.',
}
