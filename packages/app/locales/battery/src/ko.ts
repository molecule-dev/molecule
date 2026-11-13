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
  'battery.remainingTime': '{{hours}} 시간 {{minutes}} 중',
  'battery.error.noProvider':
    '`@molecule/app-battery`: 설정된 공급자가 없습니다. `BatteryProvider` 구현체를 사용하여 `setProvider()` 호출하십시오. Molecule은 해당 공급자를 제공하지 않으므로 네이티브 런타임에서 인터페이스를 구현하고 연결해야 합니다.',
}
