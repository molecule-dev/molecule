import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Sinhala. */
export const si: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play පැකේජ නාමය අස්ථානගත වී ඇත (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Google API සේවා යතුර වස්තුව අස්ථානගත වී ඇත (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured': 'Google API සේවා යතුර වස්තුව වින්‍යාස කර නොමැත',
  'payments.google.error.parseServiceKey': 'Google API සේවා යතුර වස්තුව විග්‍රහ කිරීමේ දෝෂය:',
}
