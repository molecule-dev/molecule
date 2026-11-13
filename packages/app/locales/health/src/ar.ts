import type { HealthTranslations } from './types.js'

/** Health translations for ar. */
export const ar: Partial<HealthTranslations> = {
  'health.durationMinutes': '{{minutes}} د',
  'health.durationHoursMinutes': '{{hours}} ح {{minutes}} م',
  'health.error.noProvider':
    '`@molecule/app-health`: لا يوجد موفر بيانات صحية مرتبط - قم بتنفيذ واجهة `HealthProvider` في بيئة التشغيل الأصلية (Apple HealthKit / Android Health Connect / Google Fit) وقم بربطها باستخدام `setProvider()` عند بدء التشغيل. لا يوجد موفر بيانات مُضمّن مع النظام. تحقق من الميزات باستخدام `hasProvider()` أو `getCapabilities().supported` قبل الاستدعاء - لا توجد قيمة افتراضية صحيحة لقراءة البيانات الصحية، لذا يتم طرح استثناء بدلاً من إرجاع بيانات وهمية.',
}
