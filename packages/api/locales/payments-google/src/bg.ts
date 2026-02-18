import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Bulgarian. */
export const bg: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Липсва име на пакет на Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Липсва обект на ключ за услуга на Google API (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Обектът на ключ за услуга на Google API не е конфигуриран',
  'payments.google.error.parseServiceKey':
    'Грешка при анализиране на обект на ключ за услуга на Google API:',
}
