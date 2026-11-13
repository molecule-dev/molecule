import type { BatteryTranslations } from './types.js'

/** Battery translations for nl. */
export const nl: Partial<BatteryTranslations> = {
  'battery.unknown': 'Onbekend',
  'battery.remainingUnknown': 'Onbekend',
  'battery.charging': 'Opladen',
  'battery.discharging': 'Op de batterij',
  'battery.full': 'Volledig opgeladen',
  'battery.not-charging': 'Niet opladen',
  'battery.remainingTime': '{{hours}} H {{minutes}} M',
  'battery.remainingMinutes': '{{minutes}} M',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Er is geen provider ingesteld. Roep `setProvider()` aan met een `BatteryProvider` implementatie — er wordt geen provider meegeleverd met de vloot; implementeer de interface in uw eigen runtime en koppel deze.',
}
