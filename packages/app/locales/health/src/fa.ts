import type { HealthTranslations } from './types.js'

/** Health translations for Persian. */
export const fa: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}س {{minutes}}د',
  'health.durationMinutes': '{{minutes}}د',
  'health.error.noProvider':
    '`@molecule/app-health`: بدون اتصال به ارائه‌دهنده سلامت — رابط `HealthProvider` را در زمان اجرای بومی خود (Apple HealthKit / Android Health Connect / Google Fit) پیاده‌سازی کنید و آن را با `setProvider()` در هنگام راه‌اندازی متصل کنید. Molecule هیچ ارائه‌دهنده‌ای برای آن ارائه نمی‌دهد. قبل از فراخوانی، با `hasProvider()` یا `getCapabilities().supported` ویژگی‌ها را تشخیص دهید — یک خوانش سلامت هیچ پیش‌فرض صادقانه‌ای ندارد، بنابراین این به جای بازگرداندن داده‌های جعلی، آن‌ها را پرتاب می‌کند.',
}
