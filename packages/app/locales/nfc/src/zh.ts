import type { NfcTranslations } from './types.js'

/** Nfc translations for Chinese. */
export const zh: NfcTranslations = {
  'nfc.error.noProvider':
    '`@molecule/app-nfc`：未设置提供程序。请使用 `NfcProvider` 实现调用 `setProvider()` — Molecule 未附带此提供程序；请在原生运行时中实现该接口并进行绑定。',
}
