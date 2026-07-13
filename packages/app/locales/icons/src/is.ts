import type { IconsTranslations } from './types.js'

/** Icons translations for Icelandic. */
export const is: IconsTranslations = {
  'icons.error.noIconSet':
    'Ekkert IconSet hefur verið stillt. Kallaðu á setIconSet() við ræsingu forritsins með táknasafni (t.d. @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Ekkert táknasett er tengt. Kallaðu á setIconSet() með IconSet (t.d. útflutningnum frá @molecule/app-icons-molecule).',
  'icons.error.notFound': 'Táknið "{{name}}" fannst ekki í núverandi táknsetti.',
}
