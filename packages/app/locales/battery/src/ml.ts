import type { BatteryTranslations } from './types.js'

/** Battery translations for Malayalam. */
export const ml: BatteryTranslations = {
  'battery.charging': 'ചാർജ് ചെയ്യുന്നു',
  'battery.discharging': 'ബാറ്ററിയിൽ',
  'battery.full': 'പൂർണ്ണമായി ചാർജ്',
  'battery.not-charging': 'ചാർജ് ചെയ്യുന്നില്ല',
  'battery.unknown': 'അജ്ഞാതം',
  'battery.remainingUnknown': 'അജ്ഞാതം',
  'battery.remainingTime': '{{hours}}മ {{minutes}}മി',
  'battery.remainingMinutes': '{{minutes}}മി',
  'battery.error.noProvider':
    '`@molecule/app-battery`: ദാതാവിനെ സജ്ജമാക്കിയിട്ടില്ല. `BatteryProvider` നടപ്പിലാക്കൽ ഉപയോഗിച്ച് `setProvider()` വിളിക്കുക — മോളിക്യൂൾ അതിനായി ഒരു ദാതാവിനെയും അയയ്ക്കുന്നില്ല; നിങ്ങളുടെ നേറ്റീവ് റൺടൈമിൽ ഇന്റർഫേസ് നടപ്പിലാക്കി അത് ബോണ്ട് ചെയ്യുക.',
}
