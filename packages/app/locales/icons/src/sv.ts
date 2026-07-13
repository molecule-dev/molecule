import type { IconsTranslations } from './types.js'

/** Icons translations for Swedish. */
export const sv: IconsTranslations = {
  'icons.error.noIconSet':
    'Inget IconSet har ställts in. Anropa setIconSet() vid appstart med ett ikonbibliotek (t.ex. @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: Ingen ikonuppsättning är kopplad. Anropa setIconSet() med ett IconSet (t.ex. exporten från @molecule/app-icons-molecule).',
  'icons.error.notFound': 'Ikonen "{{name}}" hittades inte i den aktuella ikonuppsättningen.',
}
