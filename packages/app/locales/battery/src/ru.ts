import type { BatteryTranslations } from './types.js'

/** Battery translations for Russian. */
export const ru: BatteryTranslations = {
  'battery.charging': 'Зарядка',
  'battery.discharging': 'От батареи',
  'battery.full': 'Полностью заряжено',
  'battery.not-charging': 'Не заряжается',
  'battery.unknown': 'Неизвестно',
  'battery.remainingUnknown': 'Неизвестно',
  'battery.remainingTime': '{{hours}}ч {{minutes}}м',
  'battery.remainingMinutes': '{{minutes}}м',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Поставщик не установлен. Вызовите `setProvider()` с реализацией `BatteryProvider` — в составе батареи нет поставщика; реализуйте интерфейс в своей собственной среде выполнения и свяжите его.',
}
