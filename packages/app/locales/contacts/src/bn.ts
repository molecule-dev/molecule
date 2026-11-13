import type { ContactsTranslations } from './types.js'

/** Contacts translations for Bengali. */
export const bn: ContactsTranslations = {
  'contacts.unknown': 'অজানা',
  'contacts.error.noProvider':
    '`@molecule/app-contacts`: কোনো প্রোভাইডার সেট করা নেই। একটি `ContactsProvider` ইমপ্লিমেন্টেশন দিয়ে `setProvider()` কল করুন — ফ্লিটের সাথে কোনো প্রোভাইডার আসে না; আপনার নেটিভ রানটাইমে ইন্টারফেসটি ইমপ্লিমেন্ট করুন এবং এটিকে বন্ড করুন।',
}
