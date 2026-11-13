import type { BatteryTranslations } from './types.js'

/** Battery translations for ar. */
export const ar: Partial<BatteryTranslations> = {
  'battery.unknown': 'غير معروف',
  'battery.remainingUnknown': 'غير معروف',
  'battery.remainingMinutes': '{{minutes}} د',
  'battery.charging': 'الشحن',
  'battery.discharging': 'يعمل بالبطارية',
  'battery.full': 'مشحون بالكامل',
  'battery.not-charging': 'لا يتم الشحن',
  'battery.remainingTime': '{{hours}} ح {{minutes}} م',
  'battery.error.noProvider':
    '`@molecule/app-battery`: لم يتم تعيين موفر. استدعِ `setProvider()` مع تطبيق `BatteryProvider` — لا يأتي أي موفر مع الأسطول؛ قم بتنفيذ الواجهة على وقت التشغيل الأصلي الخاص بك وقم بربطها.',
}
