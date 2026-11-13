import type { NfcTranslations } from './types.js'

/** Nfc translations for English. */
export const en: NfcTranslations = {
  'nfc.error.noProvider':
    '`@molecule/app-nfc`: No provider set. Call `setProvider()` with an `NfcProvider` implementation — Molecule ships no provider for it; implement the interface on your native runtime and bond it.',
}
