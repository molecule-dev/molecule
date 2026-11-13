import type { ContactsTranslations } from './types.js'

/** Contacts translations for Hebrew. */
export const he: ContactsTranslations = {
  'contacts.unknown': 'לא ידוע',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: לא הוגדר ספק. קריאה ל `setProvider()` עם מימוש של `ContactsProvider` — Molecule לא שולחת ספק עבורו; יש לממש את הממשק בזמן הריצה המקורי שלך וליצור קשר איתו.',
}
