import type { BatteryTranslations } from './types.js'

/** Battery translations for ko. */
export const ko: Partial<BatteryTranslations> = {
  'battery.unknown': '알 수 없음',
  'battery.remainingUnknown': '알 수 없음',
  'battery.remainingMinutes': '{{minutes}}분',
  'battery.charging': '충전 중',
  'battery.discharging': '배터리 사용 시',
  'battery.full': '완전 충전됨',
  'battery.not-charging': '충전 안 함',
  'battery.remainingTime': '{{시간}} 시간<x> {{분}}</x> 중',
}
