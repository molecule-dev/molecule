import type { BatteryTranslations } from './types.js'

/** Battery translations for ja. */
export const ja: Partial<BatteryTranslations> = {
  'battery.unknown': '不明',
  'battery.remainingUnknown': '不明',
  'battery.remainingMinutes': '{{minutes}}分',
  'battery.charging': '充電',
  'battery.discharging': 'バッテリー駆動時',
  'battery.full': 'フル充電済み',
  'battery.not-charging': '充電していません',
  'battery.remainingTime': '{{時間}} h<x> {{分}}</x> m',
}
