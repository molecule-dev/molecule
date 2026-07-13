import type { IconsTranslations } from './types.js'

/** Icons translations for Bosnian. */
export const bs: IconsTranslations = {
  'icons.error.noIconSet':
    'Nijedan IconSet nije postavljen. Pozovite setIconSet() pri pokretanju aplikacije s bibliotekom ikona (npr. @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Nijedan set ikona nije povezan. Pozovite setIconSet() sa IconSet-om (npr. izvoz iz @molecule/app-icons-molecule).',
  'icons.error.notFound': 'Ikona "{{name}}" nije pronađena u trenutnom setu ikona.',
}
