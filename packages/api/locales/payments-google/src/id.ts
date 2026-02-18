import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Indonesian. */
export const id: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Nama paket Google Play tidak ada (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Objek kunci layanan Google API tidak ada (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Objek kunci layanan Google API tidak dikonfigurasi',
  'payments.google.error.parseServiceKey': 'Kesalahan mengurai objek kunci layanan Google API:',
}
