import type { IconsTranslations } from './types.js'

/** Icons translations for Finnish. */
export const fi: IconsTranslations = {
  'icons.error.noIconSet':
    'IconSet-asetusta ei ole tehty. Kutsu setIconSet() sovelluksen käynnistyksessä ikonikirjaston kanssa (esim. @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Kuvakesettiä ei ole kytketty. Kutsu setIconSet() IconSet-oliolla (esim. @molecule/app-icons-molecule-paketin export).',
  'icons.error.notFound': 'Kuvaketta "{{name}}" ei löytynyt nykyisestä kuvakesetistä.',
}
