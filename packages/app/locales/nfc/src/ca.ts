import type { NfcTranslations } from './types.js'

/** Nfc translations for ca. */
export const ca: Partial<NfcTranslations> = {
  'nfc.error.noProvider':
    "@molecule/app-nfc: No s'ha definit cap proveïdor. Crida setProvider() amb una implementació de NfcProvider (per exemple, des de @molecule/app-nfc-capacitor).",
}
