import type { BatteryTranslations } from './types.js'

/** Battery translations for zh. */
export const zh: Partial<BatteryTranslations> = {
  'battery.unknown': '未知',
  'battery.remainingUnknown': '未知',
  'battery.remainingMinutes': '{{minutes}}分钟',
  'battery.charging': '收费',
  'battery.discharging': '电池供电',
  'battery.full': '已充满电',
  'battery.not-charging': '无法充电',
  'battery.remainingTime': '{{小时}} h<x> {{分钟}}</x>米',
}
