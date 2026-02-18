import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Russian. */
export const ru: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Отсутствует имя пакета Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Отсутствует объект ключа сервиса Google API (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured': 'Объект ключа сервиса Google API не настроен',
  'payments.google.error.parseServiceKey': 'Ошибка при разборе объекта ключа сервиса Google API:',
}
