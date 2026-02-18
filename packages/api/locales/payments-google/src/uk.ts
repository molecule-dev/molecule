import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Ukrainian. */
export const uk: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Відсутня назва пакета Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    "Відсутній об'єкт ключа сервісу Google API (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).",
  'payments.google.error.serviceKeyNotConfigured': "Об'єкт ключа сервісу Google API не налаштовано",
  'payments.google.error.parseServiceKey': "Помилка при розборі об'єкта ключа сервісу Google API:",
}
