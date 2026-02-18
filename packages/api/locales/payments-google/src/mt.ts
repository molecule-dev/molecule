import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Maltese. */
export const mt: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    "L-isem tal-pakkett ta' Google Play nieqes (process.env.GOOGLE_PLAY_PACKAGE_NAME).",
  'payments.google.warn.missingServiceKey':
    "L-oggett tac-cavetta tas-servizz tal-API ta' Google nieqes (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).",
  'payments.google.error.serviceKeyNotConfigured':
    "L-oggett tac-cavetta tas-servizz tal-API ta' Google mhux ikkonfigurat",
  'payments.google.error.parseServiceKey':
    "Zball fl-analizi tal-oggett tac-cavetta tas-servizz tal-API ta' Google:",
}
