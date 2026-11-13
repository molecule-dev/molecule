import type { BatteryTranslations } from './types.js'

/** Battery translations for Macedonian. */
export const mk: BatteryTranslations = {
  'battery.charging': 'Се полни',
  'battery.discharging': 'На батерија',
  'battery.full': 'Целосно наполнета',
  'battery.not-charging': 'Не се полни',
  'battery.unknown': 'Непознато',
  'battery.remainingUnknown': 'Непознато',
  'battery.remainingTime': '{{hours}}ч {{minutes}}м',
  'battery.remainingMinutes': '{{minutes}}м',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Не е поставен провајдер. Повикајте `setProvider()` со имплементација на `BatteryProvider` — Molecule не испорачува провајдер за тоа; имплементирајте го интерфејсот на вашето матичко извршување и поврзете го.',
}
