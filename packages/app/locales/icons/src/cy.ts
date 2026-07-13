import type { IconsTranslations } from './types.js'

/** Icons translations for cy. */
export const cy: Partial<IconsTranslations> = {
  'icons.error.notFound': 'Ni chanfuwyd yr eicon "{{name}}" yn y set eiconau presennol.',
  'icons.error.noIconSet':
    "Nid oes IconSet wedi'i osod. Galwch setIconSet() wrth gychwyn yr ap gyda llyfrgell eiconau (e.e., @molecule/app-icons-molecule).",
  'icons.error.noProvider':
    "@molecule/app-icons: Nid oes set eiconau wedi'i chysylltu. Galwch setIconSet() gydag IconSet (e.e., yr allforiad o @molecule/app-icons-molecule).",
}
