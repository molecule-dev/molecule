import type { BatteryTranslations } from './types.js'

/** Battery translations for Ukrainian. */
export const uk: BatteryTranslations = {
  'battery.charging': 'Заряджається',
  'battery.discharging': 'Від батареї',
  'battery.full': 'Повністю заряджено',
  'battery.not-charging': 'Не заряджається',
  'battery.unknown': 'Невідомо',
  'battery.remainingUnknown': 'Невідомо',
  'battery.remainingTime': '{{hours}}год {{minutes}}хв',
  'battery.remainingMinutes': '{{minutes}}хв',
  'battery.error.noProvider':
    "`@molecule/app-battery`: Постачальника не встановлено. Викличте `setProvider()` з реалізацією `BatteryProvider` — Molecule не надає для нього жодного постачальника; реалізуйте інтерфейс у вашому рідному середовищі виконання та зв'яжіть його.",
}
