import type { HealthTranslations } from './types.js'

/** Health translations for Urdu. */
export const ur: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}گھ {{minutes}}م',
  'health.durationMinutes': '{{minutes}}م',
  'health.error.noProvider':
    '`@molecule/app-health`: کوئی ہیلتھ پرووائیڈر بانڈڈ نہیں ہے — اپنے مقامی رن ٹائم (Apple HealthKit/Android Health Connect/Google Fit) پر `HealthProvider` انٹرفیس کو لاگو کریں اور اسے شروع میں `setProvider()` کے ساتھ بانڈ کریں۔ بیڑے کے ساتھ کوئی فراہم کنندہ جہاز نہیں ہے۔ کال کرنے سے پہلے `hasProvider()` یا `getCapabilities().supported` کے ساتھ خصوصیت کا پتہ لگائیں — ہیلتھ ریڈ میں کوئی ایماندارانہ ڈیفالٹ نہیں ہے، لہذا یہ جعلی ڈیٹا واپس کرنے کے بجائے پھینک دیتا ہے۔',
}
