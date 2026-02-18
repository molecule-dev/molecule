import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Belarusian. */
export const be: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Адсутнічае імя пакета Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    "Адсутнічае аб'ект ключа сэрвісу Google API (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).",
  'payments.google.error.serviceKeyNotConfigured':
    "Аб'ект ключа сэрвісу Google API не сканфігураваны",
  'payments.google.error.parseServiceKey': "Памылка разбору аб'екта ключа сэрвісу Google API:",
}
