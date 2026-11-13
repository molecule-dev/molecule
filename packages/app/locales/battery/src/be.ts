import type { BatteryTranslations } from './types.js'

/** Battery translations for Belarusian. */
export const be: BatteryTranslations = {
  'battery.charging': 'Зарадка',
  'battery.discharging': 'На батарэі',
  'battery.full': 'Поўнасцю зараджана',
  'battery.not-charging': 'Не зараджаецца',
  'battery.unknown': 'Невядома',
  'battery.remainingUnknown': 'Невядома',
  'battery.remainingTime': '{{hours}}г {{minutes}}хв',
  'battery.remainingMinutes': '{{minutes}}хв',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Пастаўшчык не ўстаноўлены. Выклічце `setProvider()` з рэалізацыяй `BatteryProvider` — Molecule не пастаўляе для яго пастаўшчыка; рэалізуйце інтэрфейс у вашым родным асяроддзі выканання і злучыце яго.',
}
