import type { HealthTranslations } from './types.js'

/** Health translations for Bengali. */
export const bn: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ঘ {{minutes}}মি',
  'health.durationMinutes': '{{minutes}}মি',
  'health.error.noProvider':
    '`@molecule/app-health`: কোনো হেলথ প্রোভাইডার সংযুক্ত নেই — আপনার নেটিভ রানটাইমে (Apple HealthKit / Android Health Connect / Google Fit) `HealthProvider` ইন্টারফেসটি ইমপ্লিমেন্ট করুন এবং স্টার্টআপের সময় `setProvider()` ব্যবহার করে এটিকে সংযুক্ত করুন। ফ্লিটের সাথে কোনো প্রোভাইডার আসে না। কল করার আগে `hasProvider()` বা `getCapabilities().supported` ব্যবহার করে ফিচার-ডিটেক্ট করুন — একটি হেলথ রিডের কোনো সঠিক ডিফল্ট মান নেই, তাই এটি ভুল ডেটা রিটার্ন না করে একটি এরর থ্রো করে।',
}
