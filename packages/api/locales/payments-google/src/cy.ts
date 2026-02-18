import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Welsh. */
export const cy: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Enw pecyn Google Play ar goll (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Gwrthrych allwedd gwasanaeth API Google ar goll (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Gwrthrych allwedd gwasanaeth API Google heb ei ffurfweddu',
  'payments.google.error.parseServiceKey':
    'Gwall wrth ddadansoddi gwrthrych allwedd gwasanaeth API Google:',
}
