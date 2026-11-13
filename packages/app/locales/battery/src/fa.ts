import type { BatteryTranslations } from './types.js'

/** Battery translations for Persian. */
export const fa: BatteryTranslations = {
  'battery.charging': 'در حال شارژ',
  'battery.discharging': 'با باتری',
  'battery.full': 'کاملاً شارژ شده',
  'battery.not-charging': 'شارژ نمی‌شود',
  'battery.unknown': 'نامشخص',
  'battery.remainingUnknown': 'نامشخص',
  'battery.remainingTime': '{{hours}} ساعت {{minutes}} دقیقه',
  'battery.remainingMinutes': '{{minutes}} دقیقه',
  'battery.error.noProvider':
    '`@molecule/app-battery`: هیچ ارائه‌دهنده‌ای تنظیم نشده است. `setProvider()` را با پیاده‌سازی `BatteryProvider` فراخوانی کنید — هیچ ارائه‌دهنده‌ای با ناوگان ارسال نمی‌شود؛ رابط را در زمان اجرای بومی خود پیاده‌سازی کرده و آن را پیوند دهید.',
}
