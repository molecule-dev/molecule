import type { HealthTranslations } from './types.js'

/** Health translations for Bengali. */
export const bn: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ঘ {{minutes}}মি',
  'health.durationMinutes': '{{minutes}}মি',
  'health.error.noProvider':
    '`@molecule/app-health`: কোনো হেলথ প্রোভাইডার সংযুক্ত নেই — আপনার নেটিভ রানটাইমে (Apple HealthKit / Android Health Connect / Google Fit) `HealthProvider` ইন্টারফেসটি ইমপ্লিমেন্ট করুন এবং স্টার্টআপের সময় `setProvider()` ব্যবহার করে এটিকে সংযুক্ত করুন। Molecule এর জন্য কোনো প্রোভাইডার সরবরাহ করে না। কল করার আগে `hasProvider()` বা `getCapabilities().supported` দিয়ে ফিচার-ডিটেক্ট করুন — একটি হেলথ রিডের কোনো সঠিক ডিফল্ট মান নেই, তাই এটি ভুল ডেটা ফেরত না দিয়ে একটি এরর থ্রো করে।',
}
