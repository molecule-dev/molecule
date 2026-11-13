import type { NfcTranslations } from './types.js'

/** Nfc translations for Japanese. */
export const ja: NfcTranslations = {
  'nfc.error.noProvider':
    '`@molecule/app-nfc`: プロバイダーが設定されていません。`NfcProvider` の実装を `setProvider()` で設定してください — Molecule にはこのプロバイダーが含まれていないため、ネイティブランタイム上でインターフェースを実装してボンドしてください。',
}
