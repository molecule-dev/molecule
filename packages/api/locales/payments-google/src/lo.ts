import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Lao. */
export const lo: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'ບໍ່ມີຊື່ແພັກເກັດ Google Play (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'ບໍ່ມີອັບເຈັກກະແຈບໍລິການ Google API (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'ອັບເຈັກກະແຈບໍລິການ Google API ບໍ່ໄດ້ຖືກກຳນົດຄ່າ',
  'payments.google.error.parseServiceKey': 'ຂໍ້ຜິດພາດໃນການວິເຄາະອັບເຈັກກະແຈບໍລິການ Google API:',
}
