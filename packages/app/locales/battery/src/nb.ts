import type { BatteryTranslations } from './types.js'

/** Battery translations for Norwegian Bokmål. */
export const nb: BatteryTranslations = {
  'battery.charging': 'Lader',
  'battery.discharging': 'På batteri',
  'battery.full': 'Fulladet',
  'battery.not-charging': 'Lader ikke',
  'battery.unknown': 'Ukjent',
  'battery.remainingUnknown': 'Ukjent',
  'battery.remainingTime': '{{hours}}t {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Ingen leverandør angitt. Kall `setProvider()` med en `BatteryProvider` -implementering — ingen leverandør følger med flåten; implementer grensesnittet på din native runtime og koble den til.',
}
