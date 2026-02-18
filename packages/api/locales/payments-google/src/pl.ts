import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Polish. */
export const pl: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Brak nazwy pakietu Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Brak obiektu klucza usługi Google API (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Obiekt klucza usługi Google API nie jest skonfigurowany',
  'payments.google.error.parseServiceKey':
    'Błąd podczas analizowania obiektu klucza usługi Google API:',
}
