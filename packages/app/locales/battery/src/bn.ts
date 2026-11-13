import type { BatteryTranslations } from './types.js'

/** Battery translations for Bengali. */
export const bn: BatteryTranslations = {
  'battery.charging': 'চার্জ হচ্ছে',
  'battery.discharging': 'ব্যাটারিতে চলছে',
  'battery.full': 'সম্পূর্ণ চার্জ',
  'battery.not-charging': 'চার্জ হচ্ছে না',
  'battery.unknown': 'অজানা',
  'battery.remainingUnknown': 'অজানা',
  'battery.remainingTime': '{{hours}}ঘ {{minutes}}মি',
  'battery.remainingMinutes': '{{minutes}}মি',
  'battery.error.noProvider':
    '`@molecule/app-battery`: কোনো প্রোভাইডার সেট করা নেই। `setProvider()` একটি `BatteryProvider` ইমপ্লিমেন্টেশন দিয়ে কল করুন — Molecule এর জন্য কোনো প্রোভাইডার সরবরাহ করে না; আপনার নেটিভ রানটাইমে ইন্টারফেসটি ইমপ্লিমেন্ট করুন এবং এটিকে বন্ড করুন।',
}
