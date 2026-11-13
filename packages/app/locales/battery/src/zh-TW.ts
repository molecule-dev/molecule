import type { BatteryTranslations } from './types.js'

/** Battery translations for Chinese (Traditional). */
export const zhTW: BatteryTranslations = {
  'battery.charging': '充電中',
  'battery.discharging': '使用電池',
  'battery.full': '已充飽',
  'battery.not-charging': '未充電',
  'battery.unknown': '未知',
  'battery.remainingUnknown': '未知',
  'battery.remainingTime': '{{hours}}小時{{minutes}}分鐘',
  'battery.remainingMinutes': '{{minutes}}分鐘',
  'battery.error.noProvider':
    '`@molecule/app-battery`：未設定提供者。請使用 `BatteryProvider` 實作呼叫 `setProvider()` — Molecule 未隨附此提供者；請在原生執行環境中實作該介面並加以綁定。',
}
