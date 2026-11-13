import type { BatteryTranslations } from './types.js'

/** Battery translations for ca. */
export const ca: Partial<BatteryTranslations> = {
  'battery.charging': 'Carregant',
  'battery.discharging': 'Amb bateria',
  'battery.full': 'Completament carregada',
  'battery.unknown': 'Desconegut',
  'battery.remainingUnknown': 'Desconegut',
  'battery.remainingTime': '{{hours}}h {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.not-charging': 'No carregant',
  'battery.error.noProvider':
    "`@molecule/app-battery`: No s'ha definit cap proveïdor. Crida `setProvider()` amb una implementació de `BatteryProvider` — cap proveïdor s'inclou amb la flota; implementa la interfície al teu temps d'execució natiu i vincula'l.",
}
