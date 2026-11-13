import type { CalendarTranslations } from './types.js'

/** Calendar translations for Chinese (Traditional). */
export const zhTW: CalendarTranslations = {
  'calendar.error.noProvider':
    '`@molecule/app-device-calendar`：未設定提供者。請使用 `CalendarProvider` 實作呼叫 `setProvider()` — Molecule 未隨附此提供者；請在原生執行環境中實作該介面並加以綁定。',
}
