import type { BatteryTranslations } from './types.js'

/** Battery translations for sv. */
export const sv: Partial<BatteryTranslations> = {
  'battery.unknown': 'Okänd',
  'battery.remainingUnknown': 'Okänd',
  'battery.remainingMinutes': '{{minutes}}min',
  'battery.charging': 'Laddning',
  'battery.discharging': 'På batteri',
  'battery.full': 'Fulladdad',
  'battery.not-charging': 'Laddar inte',
  'battery.remainingTime': '{{hours}} h {{minutes}} m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Ingen provider angiven. Anropa `setProvider()` med en `BatteryProvider`-implementering — Molecule levererar ingen provider för den; implementera gränssnittet på din native runtime och koppla den.',
}
