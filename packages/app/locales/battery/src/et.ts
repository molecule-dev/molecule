import type { BatteryTranslations } from './types.js'

/** Battery translations for Estonian. */
export const et: BatteryTranslations = {
  'battery.charging': 'Laadimine',
  'battery.discharging': 'Akul',
  'battery.full': 'Täielikult Laetud',
  'battery.not-charging': 'Ei Laadi',
  'battery.unknown': 'Teadmata',
  'battery.remainingUnknown': 'Teadmata',
  'battery.remainingTime': '{{hours}}t {{minutes}}m',
  'battery.remainingMinutes': '{{minutes}}m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Pakkujat pole määratud. Kutsu `setProvider()` välja `BatteryProvider` implementatsiooniga — Molecule ei paku selle jaoks pakkujat; implementeeri liides oma natiivses käituskeskkonnas ja seo see.',
}
