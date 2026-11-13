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
    '`@molecule/app-battery`：未設定提供者。請傳入 `BatteryProvider` 實作並呼叫 `setProvider()`。沒有隨附的提供者；請在原生執行環境中實作該介面並綁定它。',
}
