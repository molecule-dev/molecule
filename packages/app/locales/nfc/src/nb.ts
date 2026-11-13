import type { NfcTranslations } from './types.js'

/** Nfc translations for Norwegian Bokmål. */
export const nb: NfcTranslations = {
  'nfc.error.noProvider':
    '`@molecule/app-nfc`: Ingen leverandør angitt. Kall `setProvider()` med en `NfcProvider`-implementering — Molecule sender ingen leverandør for den; implementer grensesnittet på din native runtime og koble den til.',
}
