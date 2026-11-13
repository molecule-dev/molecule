import type { BatteryTranslations } from './types.js'

/** Battery translations for Icelandic. */
export const is: BatteryTranslations = {
  'battery.charging': 'Hleður',
  'battery.discharging': 'Á rafhlöðu',
  'battery.full': 'Fullhlaðin',
  'battery.not-charging': 'Hleður ekki',
  'battery.unknown': 'Óþekkt',
  'battery.remainingUnknown': 'Óþekkt',
  'battery.remainingTime': '{{hours}}klst {{minutes}}mín',
  'battery.remainingMinutes': '{{minutes}}mín',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Enginn veitandi stilltur. Kallaðu á `setProvider()` með `BatteryProvider` útfærslu — enginn veitandi fylgir flotanum; útfærðu viðmótið á innfædda keyrslutímanum þínum og tengdu það.',
}
