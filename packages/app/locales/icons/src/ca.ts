import type { IconsTranslations } from './types.js'

/** Icons translations for ca. */
export const ca: Partial<IconsTranslations> = {
  'icons.error.notFound': 'La icona "{{name}}" no s\'ha trobat al conjunt d\'icones actual.',
  'icons.error.noIconSet':
    "No s'ha definit cap IconSet. Crida setIconSet() a l'inici de l'aplicació amb una biblioteca d'icones (per exemple, @molecule/app-icons-molecule).",
  'icons.error.noProvider':
    "@molecule/app-icons: No hi ha cap conjunt d'icones vinculat. Crida setIconSet() amb un IconSet (per exemple, l'exportació de @molecule/app-icons-molecule).",
}
