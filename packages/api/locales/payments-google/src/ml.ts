import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Malayalam. */
export const ml: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Google Play പാക്കേജ് പേര് നഷ്‌ടമായിരിക്കുന്നു (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Google API സേവന കീ ഒബ്‌ജക്റ്റ് നഷ്‌ടമായിരിക്കുന്നു (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Google API സേവന കീ ഒബ്‌ജക്റ്റ് കോൺഫിഗർ ചെയ്തിട്ടില്ല',
  'payments.google.error.parseServiceKey':
    'Google API സേവന കീ ഒബ്‌ജക്റ്റ് പാഴ്‌സ് ചെയ്യുന്നതിൽ പിശക്:',
}
