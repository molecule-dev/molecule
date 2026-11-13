import type { NfcTranslations } from './types.js'

/** Nfc translations for Bulgarian. */
export const bg: NfcTranslations = {
  'nfc.error.noProvider':
    '`@molecule/app-nfc`: Няма зададен доставчик. Извикайте `setProvider()` с имплементация на `NfcProvider` — Molecule не предоставя доставчик за него; имплементирайте интерфейса в собствената си среда за изпълнение и го свържете.',
}
