import type { BatteryTranslations } from './types.js'

/** Battery translations for Serbian. */
export const sr: BatteryTranslations = {
  'battery.charging': 'Пуњење',
  'battery.discharging': 'На батерији',
  'battery.full': 'Потпуно напуњено',
  'battery.not-charging': 'Не пуни се',
  'battery.unknown': 'Непознато',
  'battery.remainingUnknown': 'Непознато',
  'battery.remainingTime': '{{hours}}ч {{minutes}}м',
  'battery.remainingMinutes': '{{minutes}}м',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Није подешен провајдер. Позовите `setProvider()` са имплементацијом `BatteryProvider` — ниједан провајдер се не испоручује са флотом; имплементирајте интерфејс на вашем изворном окружењу за извршавање и повежите га.',
}
