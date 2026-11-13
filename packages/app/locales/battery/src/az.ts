import type { BatteryTranslations } from './types.js'

/** Battery translations for Azerbaijani. */
export const az: BatteryTranslations = {
  'battery.charging': 'Doldurulur',
  'battery.discharging': 'Batareya ilə',
  'battery.full': 'Tam doldurulub',
  'battery.not-charging': 'Doldurulmur',
  'battery.unknown': 'Naməlum',
  'battery.remainingUnknown': 'Naməlum',
  'battery.remainingTime': '{{hours}}s {{minutes}}d',
  'battery.remainingMinutes': '{{minutes}}d',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Provayder təyin edilməyib. `setProvider()` `BatteryProvider` implementasiyası ilə çağırın — heç bir provayder donanma ilə göndərilmir; interfeysi öz doğma iş vaxtınızda tətbiq edin və onu bağlayın.',
}
