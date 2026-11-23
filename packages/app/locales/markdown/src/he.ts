import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Hebrew. */
export const he: MarkdownTranslations = {
  'markdown.components.invalid': 'components מכיל רשומה שאינה רכיב React או שם של אלמנט.',
  'markdown.components.unsupported':
    'ספק marked אינו יכול להשתמש ב-components, מפני שהוא מחזיר מחרוזת HTML. השתמשו ב-elementAttributes כדי להוסיף מאפיינים.',
  'markdown.elementAttributes.invalidName': '"{{name}}" אינו שם מאפיין (ב-<{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes אינו יכול להגדיר את "{{name}}" על <{{element}}>: המרנדר הוא הבעלים',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes מפרט את <{{element}}>, שאותו markdown אינו מייצר',
  'markdown.footnotes.backToReference': 'חזרה להפניה {{reference}}',
  'markdown.footnotes.label': 'הערות שוליים',
}
