import type { BadgeTranslations } from './types.js'

/** Badge translations for Chinese (Traditional). */
export const zhTW: BadgeTranslations = {
  'badge.error.noProvider':
    '`@molecule/app-badge`：未設定提供者。請使用 `BadgeProvider` 實作呼叫 `setProvider()` — Molecule 未隨附此提供者；請在原生執行環境中實作該介面並加以綁定。',
}
