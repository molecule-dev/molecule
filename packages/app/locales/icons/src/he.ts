import type { IconsTranslations } from './types.js'

/** Icons translations for Hebrew. */
export const he: IconsTranslations = {
  'icons.error.noIconSet':
    'לא הוגדר IconSet. קראו ל-setIconSet() בעת הפעלת האפליקציה עם ספריית סמלים (למשל, @molecule/app-icons-molecule).',
  'icons.error.noProvider':
    '@molecule/app-icons: לא חוברה ערכת סמלים. קראו ל-setIconSet() עם IconSet (למשל, הייצוא מ-@molecule/app-icons-molecule).',
  'icons.error.notFound': 'הסמל "{{name}}" לא נמצא בערכת הסמלים הנוכחית.',
}
