import type { BatteryTranslations } from './types.js'

/** Battery translations for Galician. */
export const gl: BatteryTranslations = {
  'battery.charging': 'Cargando',
  'battery.discharging': 'Con batería',
  'battery.full': 'Completamente cargada',
  'battery.not-charging': 'Non se está cargando',
  'battery.unknown': 'Descoñecido',
  'battery.remainingUnknown': 'Descoñecido',
  'battery.remainingTime': '{{hours}}h {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Non se estableceu ningún provedor. Chama `setProvider()` cunha implementación de `BatteryProvider` : ningún provedor se inclúe coa frota; implementa a interface no teu tempo de execución nativo e conéctaa.',
}
