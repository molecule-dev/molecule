import type { BatteryTranslations } from './types.js'

/** Battery translations for Hungarian. */
export const hu: BatteryTranslations = {
  'battery.charging': 'Töltés',
  'battery.discharging': 'Akkumulátoron',
  'battery.full': 'Teljesen Feltöltve',
  'battery.not-charging': 'Nem Tölt',
  'battery.unknown': 'Ismeretlen',
  'battery.remainingUnknown': 'Ismeretlen',
  'battery.remainingTime': '{{hours}}ó {{minutes}}p',
  'battery.remainingMinutes': '{{minutes}}p',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Nincs beállítva szolgáltató. Hívd meg `setProvider()` függvényt egy `BatteryProvider` implementációval — A Molecule nem szállít hozzá szolgáltatót; implementáld a felületet a natív futtatókörnyezeteden, és bondold azt.',
}
