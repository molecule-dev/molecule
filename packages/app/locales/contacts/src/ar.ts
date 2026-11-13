import type { ContactsTranslations } from './types.js'

/** Contacts translations for ar. */
export const ar: Partial<ContactsTranslations> = {
  'contacts.unknown': 'غير معروف',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: لم يتم تعيين موفر. استدعِ `setProvider()` مع تطبيق `ContactsProvider` — لا يوفر Molecule موفرًا له؛ قم بتنفيذ الواجهة على وقت التشغيل الأصلي الخاص بك وقم بربطها.',
}
