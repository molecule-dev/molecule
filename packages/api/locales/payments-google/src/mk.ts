import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Macedonian. */
export const mk: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Недостасува име на пакет на Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Недостасува објект на клуч за услуга на Google API (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Објектот на клуч за услуга на Google API не е конфигуриран',
  'payments.google.error.parseServiceKey':
    'Грешка при анализирање на објектот на клуч за услуга на Google API:',
}
