import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Bengali. */
export const bn: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '`@molecule/app-filesystem`: কোনো প্রোভাইডার সেট করা নেই। `setProvider()` ফাংশনটিকে একটি `FilesystemProvider` ইমপ্লিমেন্টেশন দিয়ে কল করুন — Molecule এর জন্য কোনো প্রোভাইডার সরবরাহ করে না; আপনার নেটিভ রানটাইমে ইন্টারফেসটি ইমপ্লিমেন্ট করুন এবং এটিকে বন্ড করুন।',
}
