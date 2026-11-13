import type { NfcTranslations } from './types.js'

/** Nfc translations for Chinese (Traditional). */
export const zhTW: NfcTranslations = {
  'nfc.error.noProvider':
    '`@molecule/app-nfc`：未設定提供者。請使用 `NfcProvider` 實作呼叫 `setProvider()` — Molecule 未隨附此提供者；請在原生執行環境中實作該介面並加以綁定。',
}
